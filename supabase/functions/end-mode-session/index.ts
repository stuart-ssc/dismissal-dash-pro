import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse the request body
    const { sessionId, endedAt } = await req.json()

    if (!sessionId || !endedAt) {
      return new Response(
        JSON.stringify({ error: 'Missing sessionId or endedAt' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Update the mode session with end time
    const { error } = await supabaseClient
      .from('mode_sessions')
      .update({ ended_at: endedAt })
      .eq('id', sessionId)
      .is('ended_at', null) // Only update if not already ended

    if (error) {
      console.error('Error updating session:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to update session' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    // Log detailed error server-side
    console.error('Unexpected error in end-mode-session:', error);
    
    // Return generic error to client
    return new Response(
      JSON.stringify({ 
        error: 'Failed to end mode session',
        code: 'END_SESSION_ERROR'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})