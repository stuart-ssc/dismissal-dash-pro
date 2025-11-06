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
    errors: Array<{ school_id: number; error_message: string }>;
    duration: number;
    status: string;
  }
) {
  try {
    await supabaseClient
      .from('scheduler_execution_logs')
      .insert({
        total_schools_processed: params.totalSchools,
        successful_schools: params.successfulSchools,
        failed_schools: params.failedSchools,
        execution_duration_ms: params.duration,
        errors: params.errors,
        status: params.status
      });
    console.log(`Logged execution: ${params.status} (${params.successfulSchools}/${params.totalSchools} schools successful)`);
  } catch (err) {
    console.error('Failed to log execution result:', err);
    // Don't throw - logging failure shouldn't break scheduler
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
  const errors: Array<{ school_id: number; error_message: string }> = [];

  try {
    // Verify authentication for cron job
    // Accept either custom scheduler secret OR service role key for flexibility
    const authHeader = req.headers.get('authorization');
    const apiKey = req.headers.get('apikey');
    
    const schedulerSecret = Deno.env.get('DISMISSAL_SCHEDULER_SECRET');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const isValidSchedulerSecret = schedulerSecret && authHeader === `Bearer ${schedulerSecret}`;
    const isValidServiceKey = serviceRoleKey && (
      authHeader === `Bearer ${serviceRoleKey}` || 
      apiKey === serviceRoleKey
    );
    
    if (!isValidSchedulerSecret && !isValidServiceKey) {
      console.warn('Unauthorized dismissal scheduler attempt');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Dismissal scheduler starting...');

    // Get all schools that need scheduled dismissal runs
    const { data: schools, error: schoolsError } = await supabaseClient
      .from('schools')
      .select('id');

    if (schoolsError) {
      console.error('Error fetching schools:', schoolsError);
      const duration = Date.now() - startTime;
      await logExecutionResult(supabaseClient, {
        totalSchools: 0,
        successfulSchools: 0,
        failedSchools: 0,
        errors: [{ school_id: 0, error_message: `Failed to fetch schools: ${schoolsError.message}` }],
        duration,
        status: 'complete_failure'
      });
      throw schoolsError;
    }

    const results = [];
    const today = new Date().toISOString().split('T')[0];
    totalSchools = schools?.length || 0;

    // Create scheduled runs for each school
    for (const school of schools || []) {
      try {
        const { data: runId, error: createError } = await supabaseClient
          .rpc('create_scheduled_dismissal_run', {
            target_school_id: school.id,
            target_date: today
          });

        if (createError) {
          console.error(`Error creating run for school ${school.id}:`, createError);
          failedSchools++;
          errors.push({
            school_id: school.id,
            error_message: `Create run failed: ${createError.message}`
          });
          results.push({
            school_id: school.id,
            success: false,
            error: createError.message
          });
        } else {
          console.log(`Created/found dismissal run ${runId} for school ${school.id}`);
          successfulSchools++;
          results.push({
            school_id: school.id,
            success: true,
            run_id: runId
          });
        }
      } catch (error) {
        console.error(`Exception for school ${school.id}:`, error);
        failedSchools++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push({
          school_id: school.id,
          error_message: `Exception: ${errorMsg}`
        });
        results.push({
          school_id: school.id,
          success: false,
          error: errorMsg
        });
      }
    }

    // Update any runs that should transition status based on current time
    // Get all schools to process their runs with correct timezone
    const { data: schoolsForRuns } = await supabaseClient
      .from('schools')
      .select('id, timezone');

    const schoolTimezoneMap = new Map(
      (schoolsForRuns || []).map(s => [s.id, s.timezone || 'America/New_York'])
    );

    const { data: runsToUpdate, error: runsError } = await supabaseClient
      .from('dismissal_runs')
      .select('*')
      .in('status', ['scheduled', 'preparation', 'active']);

    if (runsError) {
      console.error('Error fetching runs to update:', runsError);
    } else {
      const now = new Date();
      
      for (const run of runsToUpdate || []) {
        const schoolTz = schoolTimezoneMap.get(run.school_id) || 'America/New_York';
        
        // Calculate "today" in school's timezone
        const schoolDateStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: schoolTz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(now);

        // Only process runs for "today" in the school's timezone
        if (run.date !== schoolDateStr) {
          continue;
        }

        const prepTime = new Date(run.preparation_start_time);
        const startTime = new Date(run.scheduled_start_time);
        
        let newStatus = run.status;
        
        // Handle status transitions
        if (run.status === 'scheduled' && now >= prepTime) {
          newStatus = 'preparation';
        } else if (run.status === 'preparation' && now >= startTime) {
          newStatus = 'active';
        }
        
        // Check for 60-minute auto-timeout on active runs
        if ((run.status === 'active' || run.status === 'preparation') && run.plan_id) {
          const { data: groups } = await supabaseClient
            .from('dismissal_groups')
            .select('release_offset_minutes')
            .eq('dismissal_plan_id', run.plan_id)
            .order('release_offset_minutes', { ascending: true });

          if (groups && groups.length > 0) {
            if (run.scheduled_start_time) {
              const lastGroup = groups[groups.length - 1];
              
              // Use the run's scheduled_start_time (UTC) + offset
              const scheduledStartTime = new Date(run.scheduled_start_time);
              const lastGroupReleaseTime = new Date(
                scheduledStartTime.getTime() + (lastGroup.release_offset_minutes * 60000)
              );
              
              const timeSinceLastGroup = now.getTime() - lastGroupReleaseTime.getTime();

              // If 60 minutes have passed since last group, auto-complete
              if (timeSinceLastGroup > 60 * 60 * 1000) {
                newStatus = 'completed';
                const { error: completeError } = await supabaseClient
                  .from('dismissal_runs')
                  .update({
                    status: 'completed',
                    ended_at: now.toISOString(),
                    completion_method: 'auto_timeout',
                    updated_at: now.toISOString()
                  })
                  .eq('id', run.id);
                
                if (completeError) {
                  console.error(`Error auto-completing run ${run.id}:`, completeError);
                } else {
                  console.log(`Auto-completed run ${run.id} due to 60-minute timeout`);
                }
                continue;
              }
            }
          }
        }
        
        if (newStatus !== run.status) {
          const { error: updateError } = await supabaseClient
            .from('dismissal_runs')
            .update({ 
              status: newStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', run.id);
            
          if (updateError) {
            console.error(`Error updating run ${run.id} status:`, updateError);
          } else {
            console.log(`Updated run ${run.id} from ${run.status} to ${newStatus}`);
          }
        }
      }
    }

    console.log('Dismissal scheduler completed');

    // Log execution results
    const duration = Date.now() - startTime;
    const executionStatus = failedSchools === 0 ? 'success' : 
                           failedSchools < totalSchools ? 'partial_failure' : 
                           'complete_failure';
    
    await logExecutionResult(supabaseClient, {
      totalSchools,
      successfulSchools,
      failedSchools,
      errors,
      duration,
      status: executionStatus
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Dismissal scheduler completed',
        execution: {
          total_schools: totalSchools,
          successful: successfulSchools,
          failed: failedSchools,
          duration_ms: duration,
          status: executionStatus
        },
        results,
        processed_schools: totalSchools
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Dismissal scheduler error:', error);
    
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
