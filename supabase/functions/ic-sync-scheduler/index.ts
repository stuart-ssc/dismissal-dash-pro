import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to log execution results
async function logExecutionResult(
  supabaseClient: any,
  params: {
    totalSchools: number;
    successfulSchools: number;
    failedSchools: number;
    skippedSchools: number;
    errors: Array<{ school_id: number; error_message: string }>;
    duration: number;
    status: string;
  }
) {
  try {
    await supabaseClient
      .from('ic_scheduler_execution_logs')
      .insert({
        total_schools_processed: params.totalSchools,
        successful_schools: params.successfulSchools,
        failed_schools: params.failedSchools,
        skipped_schools: params.skippedSchools,
        execution_duration_ms: params.duration,
        errors: params.errors,
        status: params.status
      });
    console.log(`Logged execution: ${params.status} (${params.successfulSchools}/${params.totalSchools} schools successful, ${params.skippedSchools} skipped)`);
  } catch (err) {
    console.error('Failed to log execution result:', err);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let totalSchools = 0;
  let successfulSchools = 0;
  let failedSchools = 0;
  let skippedSchools = 0;
  const errors: Array<{ school_id: number; error_message: string }> = [];

  try {
    // Verify authentication with custom scheduler secret
    const authHeader = req.headers.get('authorization');
    const schedulerSecret = Deno.env.get('IC_SYNC_SCHEDULER_SECRET');
    
    if (!schedulerSecret || authHeader !== `Bearer ${schedulerSecret}`) {
      console.warn('Unauthorized IC sync scheduler attempt');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('IC sync scheduler starting...');

    // Get all schools with active IC connections
    const { data: connections, error: connectionsError } = await supabaseClient
      .from('infinite_campus_connections')
      .select('school_id, last_sync_at, schools(school_name)')
      .eq('status', 'active');

    if (connectionsError) {
      console.error('Error fetching IC connections:', connectionsError);
      const duration = Date.now() - startTime;
      await logExecutionResult(supabaseClient, {
        totalSchools: 0,
        successfulSchools: 0,
        failedSchools: 0,
        skippedSchools: 0,
        errors: [{ school_id: 0, error_message: `Failed to fetch connections: ${connectionsError.message}` }],
        duration,
        status: 'complete_failure'
      });
      throw connectionsError;
    }

    const results = [];
    totalSchools = connections?.length || 0;
    const now = new Date();
    const twentyHoursAgo = new Date(now.getTime() - (20 * 60 * 60 * 1000));

    console.log(`Found ${totalSchools} schools with active IC connections`);

    // Process each school
    for (const connection of connections || []) {
      const schoolId = connection.school_id;
      const schoolName = connection.schools?.school_name || `School ${schoolId}`;
      
      try {
        // Check if sync needed (last sync > 20 hours ago)
        const lastSyncAt = connection.last_sync_at ? new Date(connection.last_sync_at) : null;
        
        if (lastSyncAt && lastSyncAt > twentyHoursAgo) {
          console.log(`Skipping school ${schoolId} (${schoolName}) - synced ${Math.round((now.getTime() - lastSyncAt.getTime()) / (60 * 60 * 1000))} hours ago`);
          skippedSchools++;
          results.push({
            school_id: schoolId,
            school_name: schoolName,
            success: true,
            skipped: true,
            reason: 'Recent sync within 20 hours'
          });
          continue;
        }

        console.log(`Triggering sync for school ${schoolId} (${schoolName})...`);

        // Call sync-infinite-campus edge function
        const { data: syncResult, error: syncError } = await supabaseClient.functions.invoke(
          'sync-infinite-campus',
          {
            body: {
              schoolId: schoolId,
              syncType: 'scheduled'
            }
          }
        );

        if (syncError) {
          console.error(`Error syncing school ${schoolId}:`, syncError);
          failedSchools++;
          errors.push({
            school_id: schoolId,
            error_message: `Sync failed: ${syncError.message}`
          });
          results.push({
            school_id: schoolId,
            school_name: schoolName,
            success: false,
            error: syncError.message
          });
        } else {
          console.log(`Successfully triggered sync for school ${schoolId} (${schoolName})`);
          successfulSchools++;
          results.push({
            school_id: schoolId,
            school_name: schoolName,
            success: true,
            skipped: false,
            sync_details: syncResult
          });
        }
      } catch (error) {
        console.error(`Exception for school ${schoolId}:`, error);
        failedSchools++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push({
          school_id: schoolId,
          error_message: `Exception: ${errorMsg}`
        });
        results.push({
          school_id: schoolId,
          school_name: schoolName,
          success: false,
          error: errorMsg
        });
      }
    }

    console.log('IC sync scheduler completed');

    // Log execution results
    const duration = Date.now() - startTime;
    const executionStatus = failedSchools === 0 ? 'success' : 
                           failedSchools < totalSchools ? 'partial_failure' : 
                           'complete_failure';
    
    await logExecutionResult(supabaseClient, {
      totalSchools,
      successfulSchools,
      failedSchools,
      skippedSchools,
      errors,
      duration,
      status: executionStatus
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'IC sync scheduler completed',
        execution: {
          total_schools: totalSchools,
          successful: successfulSchools,
          failed: failedSchools,
          skipped: skippedSchools,
          duration_ms: duration,
          status: executionStatus
        },
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('IC sync scheduler error:', error);
    
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Log catastrophic failure
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    await logExecutionResult(supabaseClient, {
      totalSchools,
      successfulSchools,
      failedSchools,
      skippedSchools,
      errors: [...errors, { school_id: 0, error_message: `Catastrophic error: ${errorMsg}` }],
      duration,
      status: 'complete_failure'
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
