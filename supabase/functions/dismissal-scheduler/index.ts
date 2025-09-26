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
      .in('status', ['scheduled', 'preparation']);

    if (runsError) {
      console.error('Error fetching runs to update:', runsError);
    } else {
      const now = new Date();
      
      for (const run of runsToUpdate || []) {
        const prepTime = new Date(run.preparation_start_time);
        const startTime = new Date(run.scheduled_start_time);
        
        let newStatus = run.status;
        
        if (run.status === 'scheduled' && now >= prepTime) {
          newStatus = 'preparation';
        } else if (run.status === 'preparation' && now >= startTime) {
          newStatus = 'active';
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