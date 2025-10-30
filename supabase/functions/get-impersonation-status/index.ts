import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { createErrorResponse } from '../_shared/errorHandler.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse(
        new Error('Missing authorization'),
        'get-impersonation-status',
        401,
        corsHeaders
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error(`[${requestId}] Auth error:`, authError);
      return createErrorResponse(
        authError || new Error('Unauthorized'),
        'get-impersonation-status',
        401,
        corsHeaders
      );
    }

    // Get the current active impersonation session
    const { data: session, error: sessionError } = await supabase
      .from('admin_impersonation_sessions')
      .select('*, schools:impersonated_school_id(id, school_name)')
      .eq('admin_user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) {
      console.error(`[${requestId}] Failed to fetch impersonation status:`, sessionError);
      return createErrorResponse(
        sessionError,
        'get-impersonation-status',
        500,
        corsHeaders
      );
    }

    if (!session) {
      return new Response(
        JSON.stringify({
          isImpersonating: false,
          schoolId: null,
          schoolName: null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        isImpersonating: true,
        schoolId: session.impersonated_school_id,
        schoolName: session.schools?.school_name || null,
        expiresAt: session.expires_at,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return createErrorResponse(error, 'get-impersonation-status', 500, corsHeaders);
  }
});
