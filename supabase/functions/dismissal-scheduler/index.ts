import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      throw schoolsError;
    }

    const results = [];
    const today = new Date().toISOString().split('T')[0];

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
          results.push({
            school_id: school.id,
            success: false,
            error: createError.message
          });
        } else {
          console.log(`Created/found dismissal run ${runId} for school ${school.id}`);
          results.push({
            school_id: school.id,
            success: true,
            run_id: runId
          });
        }
      } catch (error) {
        console.error(`Exception for school ${school.id}:`, error);
        results.push({
          school_id: school.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Update any runs that should transition status based on current time
    const { data: runsToUpdate, error: runsError } = await supabaseClient
      .from('dismissal_runs')
      .select('*')
      .eq('date', today)
      .in('status', ['scheduled', 'preparation', 'active']);

    if (runsError) {
      console.error('Error fetching runs to update:', runsError);
    } else {
      const now = new Date();
      
      for (const run of runsToUpdate || []) {
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
            const { data: plan } = await supabaseClient
              .from('dismissal_plans')
              .select('dismissal_time')
              .eq('id', run.plan_id)
              .maybeSingle();

            if (plan?.dismissal_time) {
              const lastGroup = groups[groups.length - 1];
              const [hours, minutes] = plan.dismissal_time.split(':').map(Number);
              const baseDismissalTime = new Date(run.date + 'T00:00:00Z');
              baseDismissalTime.setUTCHours(hours, minutes, 0, 0);
              
              const lastGroupReleaseTime = new Date(
                baseDismissalTime.getTime() + (lastGroup.release_offset_minutes * 60000)
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

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Dismissal scheduler completed',
        results,
        processed_schools: schools?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Dismissal scheduler error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});