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

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user's school_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single();

    if (!profile?.school_id) {
      throw new Error('User has no associated school');
    }

    const schoolId = profile.school_id;
    const today = new Date().toISOString().split('T')[0];

    console.log(`Deleting dismissal data for school ${schoolId} on ${today}`);

    // Get today's dismissal run
    const { data: run } = await supabase
      .from('dismissal_runs')
      .select('id')
      .eq('school_id', schoolId)
      .eq('date', today)
      .single();

    if (!run) {
      return new Response(
        JSON.stringify({ message: 'No dismissal run found for today' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const runId = run.id;

    // Delete in order: children first, then parents
    
    // 1. Delete car line pickups (child of car_line_sessions)
    const { data: carLineSessions } = await supabase
      .from('car_line_sessions')
      .select('id')
      .eq('dismissal_run_id', runId);

    if (carLineSessions && carLineSessions.length > 0) {
      const sessionIds = carLineSessions.map(s => s.id);
      await supabase
        .from('car_line_pickups')
        .delete()
        .in('car_line_session_id', sessionIds);
      console.log(`Deleted car line pickups`);
    }

    // 2. Delete walker pickups (child of walker_sessions)
    const { data: walkerSessions } = await supabase
      .from('walker_sessions')
      .select('id')
      .eq('dismissal_run_id', runId);

    if (walkerSessions && walkerSessions.length > 0) {
      const sessionIds = walkerSessions.map(s => s.id);
      await supabase
        .from('walker_pickups')
        .delete()
        .in('walker_session_id', sessionIds);
      console.log(`Deleted walker pickups`);
    }

    // 3. Delete car line sessions
    await supabase
      .from('car_line_sessions')
      .delete()
      .eq('dismissal_run_id', runId);
    console.log(`Deleted car line sessions`);

    // 4. Delete walker sessions
    await supabase
      .from('walker_sessions')
      .delete()
      .eq('dismissal_run_id', runId);
    console.log(`Deleted walker sessions`);

    // 5. Delete bus run events
    await supabase
      .from('bus_run_events')
      .delete()
      .eq('dismissal_run_id', runId);
    console.log(`Deleted bus run events`);

    // 6. Delete mode sessions
    await supabase
      .from('mode_sessions')
      .delete()
      .eq('dismissal_run_id', runId);
    console.log(`Deleted mode sessions`);

    // 7. Delete car line completions
    await supabase
      .from('car_line_completions')
      .delete()
      .eq('dismissal_run_id', runId);
    console.log(`Deleted car line completions`);

    // 8. Delete walker location completions
    await supabase
      .from('walker_location_completions')
      .delete()
      .eq('dismissal_run_id', runId);
    console.log(`Deleted walker location completions`);

    // 9. Delete dismissal run groups
    await supabase
      .from('dismissal_run_groups')
      .delete()
      .eq('dismissal_run_id', runId);
    console.log(`Deleted dismissal run groups`);

    // 10. Finally, delete the dismissal run itself
    const { error: deleteRunError } = await supabase
      .from('dismissal_runs')
      .delete()
      .eq('id', runId);

    if (deleteRunError) {
      throw deleteRunError;
    }

    console.log(`Deleted dismissal run ${runId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Successfully deleted all dismissal data for today',
        runId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    // Log detailed error server-side
    console.error('Error deleting dismissal data:', error);
    
    // Return generic error to client
    return new Response(
      JSON.stringify({ 
        error: 'Failed to delete dismissal data',
        code: 'DELETE_DISMISSAL_ERROR'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
