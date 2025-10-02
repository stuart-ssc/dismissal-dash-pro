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
    // Get auth header for user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create authenticated client to verify user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's profile and school_id
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.school_id) {
      return new Response(
        JSON.stringify({ error: 'User school not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const schoolId = profile.school_id;

    // Get school timezone
    const { data: school } = await supabaseClient
      .from('schools')
      .select('timezone')
      .eq('id', schoolId)
      .single();

    const schoolTimezone = school?.timezone || 'America/New_York';

    // Create service role client to update runs (bypass RLS)
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calculate "today" in the school's timezone
    const nowUtc = new Date();
    const schoolDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: schoolTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(nowUtc);

    // Get today's run for this school
    const { data: runs, error: runsError } = await supabaseServiceClient
      .from('dismissal_runs')
      .select('*')
      .eq('school_id', schoolId)
      .eq('date', schoolDateStr)
      .neq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1);

    if (runsError) {
      console.error('Error fetching dismissal runs:', runsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch dismissal run' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!runs || runs.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No active dismissal run found for today',
          completed: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const run = runs[0];

    // Skip timeout check if in testing mode
    if (run.testing_mode) {
      console.log('Run is in testing mode, skipping auto-timeout');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Run is in testing mode, auto-timeout disabled',
          testing_mode: true,
          completed: false
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Check if run has a plan_id to get dismissal groups
    if (!run.plan_id) {
      return new Response(
        JSON.stringify({ 
          message: 'Run has no associated plan',
          completed: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch dismissal groups to check the last group's release time
    const { data: groups, error: groupsError } = await supabaseServiceClient
      .from('dismissal_groups')
      .select('release_offset_minutes')
      .eq('dismissal_plan_id', run.plan_id)
      .order('release_offset_minutes', { ascending: true });

    if (groupsError || !groups || groups.length === 0) {
      console.error('Error fetching dismissal groups:', groupsError);
      return new Response(
        JSON.stringify({ 
          message: 'No dismissal groups found for plan',
          completed: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use the run's scheduled_start_time (which is already in UTC and correct)
    // scheduled_start_time was computed using calculate_dismissal_times
    if (!run.scheduled_start_time) {
      return new Response(
        JSON.stringify({ 
          message: 'Run has no scheduled start time',
          completed: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate the last group's release time
    const lastGroup = groups[groups.length - 1];
    const scheduledStartTime = new Date(run.scheduled_start_time);
    const lastGroupReleaseTime = new Date(
      scheduledStartTime.getTime() + (lastGroup.release_offset_minutes * 60000)
    );
    
    const now = new Date();
    const timeSinceLastGroup = now.getTime() - lastGroupReleaseTime.getTime();

    console.log(`Last group release time: ${lastGroupReleaseTime.toISOString()}`);
    console.log(`Current time: ${now.toISOString()}`);
    console.log(`Time since last group (ms): ${timeSinceLastGroup}`);

    // If 60 minutes have passed, auto-complete the run
    const sixtyMinutesInMs = 60 * 60 * 1000;
    if (timeSinceLastGroup > sixtyMinutesInMs) {
      const { error: updateError } = await supabaseServiceClient
        .from('dismissal_runs')
        .update({
          status: 'completed',
          ended_at: now.toISOString(),
          completion_method: 'auto_timeout'
        })
        .eq('id', run.id)
        .eq('status', run.status); // Only update if status hasn't changed

      if (updateError) {
        console.error('Error updating dismissal run:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update dismissal run' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Auto-completed dismissal run ${run.id} due to 60-minute timeout`);
      return new Response(
        JSON.stringify({ 
          message: 'Dismissal run auto-completed',
          completed: true,
          run_id: run.id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Timeout hasn't occurred yet
    return new Response(
      JSON.stringify({ 
        message: 'Timeout not reached',
        completed: false,
        minutes_until_timeout: Math.round((sixtyMinutesInMs - timeSinceLastGroup) / 60000)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
