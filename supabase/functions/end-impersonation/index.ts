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
        'end-impersonation',
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
        'end-impersonation',
        401,
        corsHeaders
      );
    }

    // Get the current active session (if any)
    const { data: session } = await supabase
      .from('admin_impersonation_sessions')
      .select('*')
      .eq('admin_user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Delete all active sessions for this admin
    const { error: deleteError } = await supabase
      .from('admin_impersonation_sessions')
      .delete()
      .eq('admin_user_id', user.id);

    if (deleteError) {
      console.error(`[${requestId}] Failed to end impersonation:`, deleteError);
      return createErrorResponse(
        deleteError,
        'end-impersonation',
        500,
        corsHeaders
      );
    }

    // Log impersonation end if there was an active session
    if (session) {
      await supabase
        .from('audit_logs')
        .insert({
          table_name: 'admin_impersonation_sessions',
          record_id: session.id,
          action: 'END_IMPERSONATION',
          user_id: user.id,
          details: {
            impersonated_school_id: session.impersonated_school_id,
            session_id: session.id,
            session_duration_seconds: Math.floor(
              (Date.now() - new Date(session.created_at).getTime()) / 1000
            ),
          },
        });

      console.log(`[${requestId}] Impersonation ended: admin ${user.id}, school ${session.impersonated_school_id}`);
    } else {
      console.log(`[${requestId}] No active impersonation session for admin ${user.id}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Impersonation ended',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return createErrorResponse(error, 'end-impersonation', 500, corsHeaders);
  }
});
