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

    // Verify IC connection exists for this school via ic_school_mappings
    const { data: schoolMapping, error: mappingError } = await supabaseAdmin
      .from('ic_school_mappings')
      .select('id, district_connection_id')
      .eq('school_id', schoolId)
      .maybeSingle();

    if (mappingError || !schoolMapping) {
      return new Response(JSON.stringify({ 
        error: 'No Infinite Campus connection found for this school. Please set up the IC integration first.' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the district connection is active
    const { data: districtConn, error: distConnError } = await supabaseAdmin
      .from('ic_district_connections')
      .select('id, status')
      .eq('id', schoolMapping.district_connection_id)
      .maybeSingle();

    if (distConnError || !districtConn || districtConn.status !== 'active') {
      return new Response(JSON.stringify({ 
        error: 'The Infinite Campus district connection is not active. Please check your IC configuration.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Optionally check sync configuration (if table/row exists)
    let syncConfig = null;
    try {
      const { data: configData } = await supabaseAdmin
        .from('ic_sync_configuration')
        .select('*')
        .eq('school_id', schoolId)
        .maybeSingle();
      
      syncConfig = configData;
    } catch {
      // Table may not exist — that's fine, sync config is optional
    }

    // If sync config exists and is paused, block
    if (syncConfig?.paused) {
      return new Response(JSON.stringify({ 
        error: `Sync is currently paused${syncConfig.pause_reason ? `: ${syncConfig.pause_reason}` : ''}` 
      }), {
        status: 200,
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
          ...(syncConfig ? { syncConfig } : {}),
        }
      }
    );

    if (syncError) {
      const errorMessage = syncError.message || 'Sync failed';
      console.error('Manual sync error:', errorMessage);
      return new Response(JSON.stringify({ 
        error: errorMessage,
        details: 'Check sync history for more details'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only update next sync time if sync config exists
    if (syncConfig) {
      try {
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
      } catch {
        // Skip if RPC or table doesn't exist
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Manual sync triggered successfully',
      syncResult,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in trigger-manual-sync:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
