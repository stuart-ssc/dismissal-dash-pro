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
    const { schoolId } = body;

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

    // Check if sync configuration exists and is not paused
    const { data: syncConfig, error: configError } = await supabaseAdmin
      .from('ic_sync_configuration')
      .select('*')
      .eq('school_id', schoolId)
      .single();

    if (configError || !syncConfig) {
      return new Response(JSON.stringify({ 
        error: 'Sync configuration not found. Please configure sync settings first.' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (syncConfig.paused) {
      return new Response(JSON.stringify({ 
        error: `Sync is currently paused${syncConfig.pause_reason ? `: ${syncConfig.pause_reason}` : ''}` 
      }), {
        status: 423, // Locked
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Triggering manual sync for school ${schoolId} by user ${user.id}`);

    // Invoke sync function
    const { data: syncResult, error: syncError } = await supabaseAdmin.functions.invoke(
      'sync-infinite-campus',
      {
        body: {
          schoolId: schoolId,
          syncType: 'manual',
          triggeredBy: user.id,
          syncConfig: syncConfig,
        }
      }
    );

    if (syncError) {
      console.error('Manual sync error:', syncError);
      return new Response(JSON.stringify({ 
        error: 'Sync failed',
        details: syncError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate and update next sync time
    const { data: nextSyncTime } = await supabaseAdmin
      .rpc('calculate_next_sync_time', { 
        p_school_id: schoolId,
        p_from_time: new Date().toISOString()
      });
    
    if (nextSyncTime) {
      await supabaseAdmin
        .from('ic_sync_configuration')
        .update({ 
          next_scheduled_sync_at: nextSyncTime,
          last_sync_at: new Date().toISOString()
        })
        .eq('school_id', schoolId);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Manual sync triggered successfully',
      syncResult,
      nextSyncAt: nextSyncTime,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in trigger-manual-sync:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});