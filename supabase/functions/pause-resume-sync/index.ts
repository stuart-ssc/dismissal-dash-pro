import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user authentication
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { schoolId, action, pausedUntil, pauseReason } = body;

    if (!schoolId || !action) {
      return new Response(JSON.stringify({ error: 'School ID and action are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['pause', 'resume'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Action must be "pause" or "resume"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role client for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if user has permission to manage this school
    const { data: canManage } = await supabaseAdmin.rpc('can_manage_school_data', {
      target_school_id: schoolId
    });

    if (!canManage) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update sync configuration
    const updateData: any = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (action === 'pause') {
      updateData.paused = true;
      updateData.paused_until = pausedUntil || null;
      updateData.pause_reason = pauseReason || 'Manually paused by admin';
    } else {
      updateData.paused = false;
      updateData.paused_until = null;
      updateData.pause_reason = null;
      
      // Calculate next sync time when resuming
      const { data: nextSyncTime } = await supabaseAdmin
        .rpc('calculate_next_sync_time', { 
          p_school_id: schoolId,
          p_from_time: new Date().toISOString()
        });
      
      if (nextSyncTime) {
        updateData.next_scheduled_sync_at = nextSyncTime;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('ic_sync_configuration')
      .update(updateData)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (error) {
      console.error('Error updating sync configuration:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to update sync configuration',
        details: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the action in audit logs
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        table_name: 'ic_sync_configuration',
        record_id: data.id,
        action: action === 'pause' ? 'SYNC_PAUSED' : 'SYNC_RESUMED',
        user_id: user.id,
        details: {
          school_id: schoolId,
          paused_until: pausedUntil,
          pause_reason: pauseReason,
        }
      });

    return new Response(JSON.stringify({ 
      success: true,
      message: action === 'pause' ? 'Sync paused successfully' : 'Sync resumed successfully',
      configuration: data,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in pause-resume-sync:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});