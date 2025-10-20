import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the run ID from request body
    const { runId } = await req.json();

    if (!runId) {
      return new Response(
        JSON.stringify({ error: 'runId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Resetting dismissal run ${runId} to active status`);

    // Reset the dismissal run to active status with testing mode enabled
    const { data, error } = await supabase
      .from('dismissal_runs')
      .update({
        status: 'active',
        ended_at: null,
        completion_method: null,
        bus_completed: false,
        car_line_completed: false,
        walker_completed: false,
        bus_completed_at: null,
        car_line_completed_at: null,
        walker_completed_at: null,
        bus_completed_by: null,
        car_line_completed_by: null,
        walker_completed_by: null,
        testing_mode: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', runId)
      .select()
      .single();

    if (error) {
      // Log detailed error server-side
      console.error('Error resetting dismissal run:', error);
      
      // Return generic error to client
      return new Response(
        JSON.stringify({ 
          error: 'Failed to reset dismissal run',
          code: 'RESET_RUN_ERROR'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully reset dismissal run:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // Log detailed error server-side
    console.error('Unexpected error in reset-dismissal-run:', error);
    
    // Return generic error to client
    return new Response(
      JSON.stringify({ 
        error: 'Failed to reset dismissal run',
        code: 'RESET_RUN_ERROR'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
