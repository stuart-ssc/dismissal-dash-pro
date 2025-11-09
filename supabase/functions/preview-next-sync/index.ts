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

    const url = new URL(req.url);
    const schoolId = url.searchParams.get('schoolId');

    if (!schoolId) {
      return new Response(JSON.stringify({ error: 'School ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role client for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if user has permission to view this school
    const { data: canView } = await supabaseAdmin.rpc('can_view_school_data', {
      target_school_id: parseInt(schoolId)
    });

    if (!canView) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get sync configuration
    const { data: syncConfig, error: configError } = await supabaseAdmin
      .from('ic_sync_configuration')
      .select('*')
      .eq('school_id', parseInt(schoolId))
      .single();

    if (configError || !syncConfig) {
      return new Response(JSON.stringify({ 
        error: 'Sync configuration not found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate next sync time
    const { data: nextSyncTime, error: calcError } = await supabaseAdmin
      .rpc('calculate_next_sync_time', { 
        p_school_id: parseInt(schoolId),
        p_from_time: new Date().toISOString()
      });

    if (calcError) {
      console.error('Error calculating next sync time:', calcError);
      return new Response(JSON.stringify({ 
        error: 'Failed to calculate next sync time',
        details: calcError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if should sync now
    const { data: shouldSyncNow } = await supabaseAdmin
      .rpc('should_sync_now', { p_school_id: parseInt(schoolId) });

    return new Response(JSON.stringify({ 
      nextSyncTime,
      shouldSyncNow: shouldSyncNow || false,
      currentConfig: {
        enabled: syncConfig.enabled,
        paused: syncConfig.paused,
        pausedUntil: syncConfig.paused_until,
        intervalType: syncConfig.interval_type,
        intervalValue: syncConfig.interval_value,
        syncWindowStart: syncConfig.sync_window_start,
        syncWindowEnd: syncConfig.sync_window_end,
        timezone: syncConfig.timezone,
        skipWeekends: syncConfig.skip_weekends,
        blackoutDates: syncConfig.blackout_dates,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in preview-next-sync:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});