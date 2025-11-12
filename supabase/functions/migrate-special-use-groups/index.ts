import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { groupIds, targetSessionId, schoolId } = await req.json();

    if (!groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
      throw new Error('groupIds array is required');
    }

    if (!targetSessionId) {
      throw new Error('targetSessionId is required');
    }

    if (!schoolId) {
      throw new Error('schoolId is required');
    }

    console.log(`Migrating ${groupIds.length} groups to session ${targetSessionId}`);

    // Verify user has permission to manage this school
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isSystemAdmin = userRoles?.some(r => r.role === 'system_admin');

    if (!isSystemAdmin) {
      const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();

      const isSchoolAdmin = userRoles?.some(r => r.role === 'school_admin') && 
                            userProfile?.school_id === schoolId;

      if (!isSchoolAdmin) {
        throw new Error('Insufficient permissions to migrate groups');
      }
    }

    // Fetch the source groups
    const { data: sourceGroups, error: groupsError } = await supabaseAdmin
      .from('special_use_groups')
      .select('*')
      .in('id', groupIds)
      .eq('school_id', schoolId);

    if (groupsError) throw groupsError;

    if (!sourceGroups || sourceGroups.length === 0) {
      throw new Error('No groups found with the provided IDs');
    }

    const migratedGroups: any[] = [];
    const errors: any[] = [];

    // Migrate each group
    for (const sourceGroup of sourceGroups) {
      try {
        // Create new group with same properties but new session
        const { data: newGroup, error: createError } = await supabaseAdmin
          .from('special_use_groups')
          .insert({
            school_id: sourceGroup.school_id,
            name: sourceGroup.name,
            description: sourceGroup.description,
            group_type: sourceGroup.group_type,
            is_active: sourceGroup.is_active,
            academic_session_id: targetSessionId,
            created_by: user.id,
          })
          .select()
          .single();

        if (createError) throw createError;

        // Copy managers
        const { data: managers, error: managersError } = await supabaseAdmin
          .from('special_use_group_managers')
          .select('manager_id')
          .eq('group_id', sourceGroup.id);

        if (managersError) throw managersError;

        if (managers && managers.length > 0) {
          const { error: insertManagersError } = await supabaseAdmin
            .from('special_use_group_managers')
            .insert(
              managers.map(m => ({
                group_id: newGroup.id,
                manager_id: m.manager_id,
              }))
            );

          if (insertManagersError) {
            console.error('Error copying managers:', insertManagersError);
            // Don't fail the whole migration if managers fail
          }
        }

        migratedGroups.push({
          original_id: sourceGroup.id,
          new_id: newGroup.id,
          name: sourceGroup.name,
          managers_copied: managers?.length || 0,
        });

        console.log(`Successfully migrated group: ${sourceGroup.name}`);
      } catch (error: any) {
        console.error(`Error migrating group ${sourceGroup.name}:`, error);
        errors.push({
          group_id: sourceGroup.id,
          group_name: sourceGroup.name,
          error: error.message,
        });
      }
    }

    // Log the migration audit
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        table_name: 'special_use_groups',
        action: 'MIGRATE_GROUPS',
        user_id: user.id,
        details: {
          source_group_ids: groupIds,
          target_session_id: targetSessionId,
          school_id: schoolId,
          migrated_count: migratedGroups.length,
          failed_count: errors.length,
          migrated_groups: migratedGroups,
          errors: errors,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        migratedCount: migratedGroups.length,
        failedCount: errors.length,
        migratedGroups,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in migrate-special-use-groups:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to migrate groups' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
