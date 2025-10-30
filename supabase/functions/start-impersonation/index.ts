import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { createErrorResponse } from '../_shared/errorHandler.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface StartImpersonationRequest {
  schoolId: number;
}

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
        'start-impersonation',
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
        'start-impersonation',
        401,
        corsHeaders
      );
    }

    // Verify user is system admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'system_admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.error(`[${requestId}] User ${user.id} is not a system admin`);
      return createErrorResponse(
        new Error('Only system administrators can impersonate schools'),
        'start-impersonation',
        403,
        corsHeaders
      );
    }

    const body: StartImpersonationRequest = await req.json();
    const { schoolId } = body;

    if (!schoolId) {
      return createErrorResponse(
        new Error('Missing school ID'),
        'start-impersonation',
        400,
        corsHeaders
      );
    }

    // Verify school exists
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, school_name')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school) {
      console.error(`[${requestId}] School ${schoolId} not found:`, schoolError);
      return createErrorResponse(
        new Error('School not found'),
        'start-impersonation',
        404,
        corsHeaders
      );
    }

    // Get client info
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // End any existing active sessions for this admin
    await supabase
      .from('admin_impersonation_sessions')
      .delete()
      .eq('admin_user_id', user.id);

    // Create new impersonation session
    const { data: session, error: sessionError } = await supabase
      .from('admin_impersonation_sessions')
      .insert({
        admin_user_id: user.id,
        impersonated_school_id: schoolId,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single();

    if (sessionError) {
      console.error(`[${requestId}] Failed to create impersonation session:`, sessionError);
      return createErrorResponse(
        sessionError,
        'start-impersonation',
        500,
        corsHeaders
      );
    }

    // Log impersonation start in audit logs
    await supabase
      .from('audit_logs')
      .insert({
        table_name: 'admin_impersonation_sessions',
        record_id: session.id,
        action: 'START_IMPERSONATION',
        user_id: user.id,
        details: {
          impersonated_school_id: schoolId,
          school_name: school.school_name,
          session_id: session.id,
          ip_address: ipAddress,
        },
      });

    console.log(`[${requestId}] Impersonation started: admin ${user.id} -> school ${schoolId}`);

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        schoolId: schoolId,
        schoolName: school.school_name,
        expiresAt: session.expires_at,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return createErrorResponse(error, 'start-impersonation', 500, corsHeaders);
  }
});
