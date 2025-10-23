import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { createErrorResponse } from '../_shared/errorHandler.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return createErrorResponse(
        new Error('Missing authorization'),
        'initialize-oauth-profile',
        401,
        corsHeaders
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error(`[${requestId}] Auth error:`, userError);
      return createErrorResponse(
        userError || new Error('User not found'),
        'initialize-oauth-profile',
        401,
        corsHeaders
      );
    }

    console.log(`[${requestId}] Initializing OAuth profile for user ${user.id}`);

    // Check if profile exists
    const { data: existing, error: selectErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (selectErr) {
      console.error(`[${requestId}] Profile select error:`, selectErr);
      return createErrorResponse(selectErr, 'initialize-oauth-profile', 500, corsHeaders);
    }

    if (!existing) {
      console.log(`[${requestId}] Creating profile for OAuth user`);
      const firstName = user.user_metadata?.first_name || user.user_metadata?.name || user.user_metadata?.full_name || '';
      
      const { error: insertErr } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          first_name: firstName,
          auth_provider: user.app_metadata?.provider || 'google',
          needs_school_association: true,
        });

      if (insertErr) {
        console.error(`[${requestId}] Profile insert error:`, insertErr);
        return createErrorResponse(insertErr, 'initialize-oauth-profile', 500, corsHeaders);
      }

      console.log(`[${requestId}] Profile created successfully`);
    } else {
      console.log(`[${requestId}] Profile already exists`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return createErrorResponse(error, 'initialize-oauth-profile', 500, corsHeaders);
  }
});
