import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { runId, mode } = await req.json();

    if (!runId || !mode) {
      return new Response(
        JSON.stringify({ error: 'Missing runId or mode' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate mode
    const validModes = ['bus', 'car_line', 'walker'];
    if (!validModes.includes(mode)) {
      return new Response(
        JSON.stringify({ error: 'Invalid mode. Must be bus, car_line, or walker' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get authenticated user using anon key (from request header)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabaseAnonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseAnonClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Use service role client for the update
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the run and verify user has access to this school
    const { data: run, error: runError } = await supabaseServiceClient
      .from('dismissal_runs')
      .select('school_id, status, bus_completed, car_line_completed, walker_completed')
      .eq('id', runId)
      .single();

    if (runError || !run) {
      return new Response(
        JSON.stringify({ error: 'Run not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Verify user is teacher or school_admin for this school
    const { data: profile } = await supabaseServiceClient
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.school_id !== run.school_id) {
      return new Response(
        JSON.stringify({ error: 'Access denied: not authorized for this school' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Check user has teacher or school_admin role
    const { data: roles } = await supabaseServiceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const hasRole = (roles || []).some(r => 
      r.role === 'teacher' || r.role === 'school_admin' || r.role === 'system_admin'
    );

    if (!hasRole) {
      return new Response(
        JSON.stringify({ error: 'Access denied: insufficient permissions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Don't allow completion if run is already completed
    if (run.status === 'completed') {
      return new Response(
        JSON.stringify({ error: 'Run is already completed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Update the specific mode completion field
    const updateField = `${mode}_completed`;
    const updateAtField = `${mode}_completed_at`;
    const updateByField = `${mode}_completed_by`;

    const { error: updateError } = await supabaseServiceClient
      .from('dismissal_runs')
      .update({
        [updateField]: true,
        [updateAtField]: new Date().toISOString(),
        [updateByField]: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', runId);

    if (updateError) {
      console.error('Error updating run:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update run' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    // Log detailed error server-side
    console.error('Unexpected error in complete-mode:', error);
    
    // Return generic error to client
    return new Response(
      JSON.stringify({ 
        error: 'Failed to complete mode',
        code: 'COMPLETE_MODE_ERROR'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});