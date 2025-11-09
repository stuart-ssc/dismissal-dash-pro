import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface ApproveRequest {
  mergeId?: string;
  mergeIds?: string[];
  decision: 'approve' | 'reject';
  notes?: string;
  autoApprovedByRuleId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: ApproveRequest = await req.json();
    const { mergeId, mergeIds, decision, notes, autoApprovedByRuleId } = body;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle bulk operations
    const idsToProcess = mergeIds || (mergeId ? [mergeId] : []);
    
    if (idsToProcess.length === 0) {
      return new Response(JSON.stringify({ error: 'No merge IDs provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const currentMergeId of idsToProcess) {
      try {
        // Get pending merge
        const { data: merge, error: fetchError } = await supabaseAdmin
          .from('ic_pending_merges')
          .select('*')
          .eq('id', currentMergeId)
          .single();

        if (fetchError || !merge) {
          results.push({ id: currentMergeId, success: false, error: 'Merge not found' });
          failCount++;
          continue;
        }

        // Verify permissions (skip for auto-approved)
        if (!autoApprovedByRuleId) {
          const { data: userSchools } = await supabaseAdmin
            .from('user_schools')
            .select('school_id')
            .eq('user_id', user.id);

          const hasAccess = userSchools?.some(us => us.school_id === merge.school_id);
          
          if (!hasAccess) {
            const { data: userRoles } = await supabaseAdmin
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id);

            const isSystemAdmin = userRoles?.some(r => r.role === 'system_admin');
            
            if (!isSystemAdmin) {
              results.push({ id: currentMergeId, success: false, error: 'Insufficient permissions' });
              failCount++;
              continue;
            }
          }
        }

        if (decision === 'approve') {
          // Update existing record with IC data
          const icData = merge.ic_data as any;
          
          if (merge.record_type === 'student') {
            await supabaseAdmin
              .from('students')
              .update({
                first_name: icData.givenName,
                last_name: icData.familyName,
                grade_level: icData.grade ? parseInt(icData.grade, 10) : null,
                ic_external_id: merge.ic_external_id,
              })
              .eq('id', merge.existing_record_id);
          } else if (merge.record_type === 'teacher') {
            await supabaseAdmin
              .from('teachers')
              .update({
                first_name: icData.givenName,
                last_name: icData.familyName,
                email: icData.email || null,
                ic_external_id: merge.ic_external_id,
              })
              .eq('id', merge.existing_record_id);
          }

          // Mark merge as approved
          await supabaseAdmin
            .from('ic_pending_merges')
            .update({
              status: 'approved',
              decision_made_at: new Date().toISOString(),
              decision_made_by: autoApprovedByRuleId ? null : user.id,
              decision_notes: notes || null,
              auto_approved_by_rule_id: autoApprovedByRuleId || null,
              auto_approved_at: autoApprovedByRuleId ? new Date().toISOString() : null,
            })
            .eq('id', currentMergeId);

          // Log audit event
          await supabaseAdmin.from('audit_logs').insert({
            school_id: merge.school_id,
            user_id: autoApprovedByRuleId ? null : user.id,
            action: autoApprovedByRuleId ? 'ic_merge_auto_approved' : 'ic_merge_approved',
            entity_type: merge.record_type,
            entity_id: merge.existing_record_id,
            details: {
              ic_external_id: merge.ic_external_id,
              match_confidence: merge.match_confidence,
              auto_approved_by_rule_id: autoApprovedByRuleId || null,
              notes,
            },
          });

        } else {
          // Create new record from IC data
          const icData = merge.ic_data as any;
          
          if (merge.record_type === 'student') {
            // Get active session
            const { data: activeSession } = await supabaseAdmin
              .from('academic_sessions')
              .select('id')
              .eq('school_id', merge.school_id)
              .eq('is_active', true)
              .maybeSingle();

            await supabaseAdmin
              .from('students')
              .insert({
                school_id: merge.school_id,
                first_name: icData.givenName,
                last_name: icData.familyName,
                grade_level: icData.grade ? parseInt(icData.grade, 10) : null,
                ic_external_id: merge.ic_external_id,
                academic_session_id: activeSession?.id || null,
              });
          } else if (merge.record_type === 'teacher') {
            await supabaseAdmin
              .from('teachers')
              .insert({
                school_id: merge.school_id,
                first_name: icData.givenName,
                last_name: icData.familyName,
                email: icData.email || null,
                ic_external_id: merge.ic_external_id,
              });
          }

          // Mark merge as rejected (new record created)
          await supabaseAdmin
            .from('ic_pending_merges')
            .update({
              status: 'rejected',
              decision_made_at: new Date().toISOString(),
              decision_made_by: user.id,
              decision_notes: notes || 'Created as new record',
            })
            .eq('id', currentMergeId);

          // Log audit event
          await supabaseAdmin.from('audit_logs').insert({
            school_id: merge.school_id,
            user_id: user.id,
            action: 'ic_merge_rejected',
            entity_type: merge.record_type,
            details: {
              ic_external_id: merge.ic_external_id,
              created_new_record: true,
              notes,
            },
          });
        }

        results.push({ id: currentMergeId, success: true });
        successCount++;

      } catch (error) {
        console.error(`Error processing merge ${currentMergeId}:`, error);
        results.push({ 
          id: currentMergeId, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        failCount++;
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      decision,
      total: idsToProcess.length,
      successCount,
      failCount,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Approve IC merge error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
