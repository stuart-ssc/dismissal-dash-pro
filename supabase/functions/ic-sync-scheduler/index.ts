import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function logExecution(
  supabase: any,
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
    await supabase.from('ic_scheduler_execution_logs').insert({
      total_schools_processed: params.totalSchools,
      successful_schools: params.successfulSchools,
      failed_schools: params.failedSchools,
      skipped_schools: params.skippedSchools,
      execution_duration_ms: params.duration,
      errors: params.errors,
      status: params.status,
    });
  } catch (err) {
    console.error('Failed to log execution:', err);
  }
}

serve(async (req) => {
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('IC sync scheduler starting...');

    // Get all schools with active IC connections
    const { data: connections, error: connErr } = await supabase
      .from('infinite_campus_connections')
      .select('school_id, schools(school_name)')
      .eq('status', 'active');

    if (connErr) {
      console.error('Error fetching IC connections:', connErr);
      await logExecution(supabase, {
        totalSchools: 0, successfulSchools: 0, failedSchools: 0, skippedSchools: 0,
        errors: [{ school_id: 0, error_message: connErr.message }],
        duration: Date.now() - startTime, status: 'complete_failure',
      });
      throw connErr;
    }

    totalSchools = connections?.length || 0;
    console.log(`Found ${totalSchools} schools with active IC connections`);

    const results = [];

    for (const conn of connections || []) {
      const schoolId = conn.school_id;
      const schoolName = conn.schools?.school_name || `School ${schoolId}`;

      try {
        // Use the DB function to check if this school should sync now
        const { data: shouldSync, error: checkErr } = await supabase
          .rpc('should_sync_now', { p_school_id: schoolId });

        if (checkErr) {
          console.error(`Error checking sync for school ${schoolId}:`, checkErr);
          failedSchools++;
          errors.push({ school_id: schoolId, error_message: checkErr.message });
          continue;
        }

        if (!shouldSync) {
          console.log(`Skipping school ${schoolId} (${schoolName}) - not due for sync`);
          skippedSchools++;
          results.push({ school_id: schoolId, school_name: schoolName, skipped: true });
          continue;
        }

        console.log(`Triggering sync for school ${schoolId} (${schoolName})...`);

        // Trigger the actual sync
        const { data: syncResult, error: syncErr } = await supabase.functions.invoke(
          'sync-infinite-campus',
          { body: { schoolId, syncType: 'scheduled' } }
        );

        if (syncErr) {
          console.error(`Sync failed for school ${schoolId}:`, syncErr);
          failedSchools++;
          errors.push({ school_id: schoolId, error_message: syncErr.message });
          results.push({ school_id: schoolId, school_name: schoolName, success: false, error: syncErr.message });

          // Send failure notification
          await supabase.functions.invoke('send-ic-sync-notification', {
            body: {
              schoolId, status: 'failure',
              statistics: { totalStudents: 0, studentsAdded: 0, studentsUpdated: 0, errors: 1, duration: '0s' },
              errorDetails: [syncErr.message],
              syncedAt: new Date().toISOString(),
            }
          }).catch((e: any) => console.error(`Notification failed for ${schoolId}:`, e));
        } else {
          console.log(`Sync succeeded for school ${schoolId} (${schoolName})`);
          successfulSchools++;

          // Calculate and store next sync time
          const { data: nextSync } = await supabase
            .rpc('calculate_next_sync_time', { p_school_id: schoolId, p_from_time: new Date().toISOString() });

          await supabase
            .from('ic_sync_configuration')
            .update({ last_sync_at: new Date().toISOString(), next_scheduled_sync_at: nextSync })
            .eq('school_id', schoolId);

          results.push({ school_id: schoolId, school_name: schoolName, success: true, next_sync_at: nextSync, sync_details: syncResult });

          // Send success notification
          const stats = syncResult || {};
          await supabase.functions.invoke('send-ic-sync-notification', {
            body: {
              schoolId, status: 'success',
              statistics: {
                totalStudents: stats.studentsProcessed || 0,
                studentsAdded: stats.studentsAdded || 0,
                studentsUpdated: stats.studentsUpdated || 0,
                errors: stats.errors?.length || 0,
                duration: stats.duration || '0s',
              },
              errorDetails: stats.errors || [],
              syncedAt: new Date().toISOString(),
            }
          }).catch((e: any) => console.error(`Notification failed for ${schoolId}:`, e));
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Exception for school ${schoolId}:`, msg);
        failedSchools++;
        errors.push({ school_id: schoolId, error_message: msg });
        results.push({ school_id: schoolId, school_name: schoolName, success: false, error: msg });
      }
    }

    const duration = Date.now() - startTime;
    const status = failedSchools === 0 ? 'success' : failedSchools < totalSchools ? 'partial_failure' : 'complete_failure';

    await logExecution(supabase, { totalSchools, successfulSchools, failedSchools, skippedSchools, errors, duration, status });

    console.log(`IC sync scheduler completed: ${successfulSchools}/${totalSchools} successful, ${skippedSchools} skipped`);

    return new Response(JSON.stringify({
      success: true,
      execution: { total_schools: totalSchools, successful: successfulSchools, failed: failedSchools, skipped: skippedSchools, duration_ms: duration, status },
      results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('IC sync scheduler error:', msg);

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    await logExecution(supabase, {
      totalSchools, successfulSchools, failedSchools, skippedSchools,
      errors: [...errors, { school_id: 0, error_message: msg }],
      duration: Date.now() - startTime, status: 'complete_failure',
    });

    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
