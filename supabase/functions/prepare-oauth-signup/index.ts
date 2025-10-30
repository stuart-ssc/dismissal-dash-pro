import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface PrepareOAuthRequest {
  schoolId?: number;
  role?: string;
  email?: string;
  invitationToken?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { schoolId, role, email, invitationToken }: PrepareOAuthRequest = await req.json();

    console.log('Preparing OAuth signup:', { schoolId, role, email: email ? '***' : undefined });

    // Generate secure random state token (32 bytes = 256 bits)
    const stateTokenBytes = new Uint8Array(32);
    crypto.getRandomValues(stateTokenBytes);
    const stateToken = Array.from(stateTokenBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Store OAuth pending signup with 5 minute expiry
    const { data: pendingSignup, error: insertError } = await supabase
      .from('oauth_pending_signups')
      .insert({
        state_token: stateToken,
        school_id: schoolId,
        role: role,
        email: email,
        invitation_token: invitationToken,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create OAuth pending signup:', insertError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to prepare OAuth signup',
          code: 'OAUTH_PREPARE_FAILED' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('OAuth signup prepared successfully:', pendingSignup.id);

    return new Response(
      JSON.stringify({ 
        stateToken,
        expiresAt: pendingSignup.expires_at 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in prepare-oauth-signup:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
