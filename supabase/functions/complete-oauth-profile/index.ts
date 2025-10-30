import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { handleEdgeFunctionError, createErrorResponse } from '../_shared/errorHandler.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface CompleteProfileRequest {
  stateToken?: string; // New secure approach
  schoolId?: number; // Legacy fallback
  role?: 'school_admin' | 'teacher'; // Legacy fallback
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse(
        new Error('Missing authorization'),
        'complete-oauth-profile',
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
        'complete-oauth-profile',
        401,
        corsHeaders
      );
    }

    const body: CompleteProfileRequest = await req.json();
    let schoolId: number;
    let role: 'school_admin' | 'teacher';

    // New secure approach: Use state token to retrieve school/role
    if (body.stateToken) {
      console.log(`[${requestId}] Using secure state token approach`);
      
      const { data: pendingSignup, error: lookupError } = await supabase
        .from('oauth_pending_signups')
        .select('*')
        .eq('state_token', body.stateToken)
        .eq('completed', false)
        .single();

      if (lookupError || !pendingSignup) {
        console.error(`[${requestId}] Invalid or expired state token:`, lookupError);
        return createErrorResponse(
          new Error('Invalid or expired OAuth state. Please try signing up again.'),
          'complete-oauth-profile',
          400,
          corsHeaders
        );
      }

      // Check if token is expired
      if (new Date(pendingSignup.expires_at) < new Date()) {
        console.error(`[${requestId}] State token expired`);
        return createErrorResponse(
          new Error('OAuth state expired. Please try signing up again.'),
          'complete-oauth-profile',
          400,
          corsHeaders
        );
      }

      schoolId = pendingSignup.school_id;
      role = pendingSignup.role as 'school_admin' | 'teacher';

      console.log(`[${requestId}] Retrieved OAuth state for user ${user.id}, school ${schoolId}, role ${role}`);

      // Mark as completed
      await supabase
        .from('oauth_pending_signups')
        .update({ completed: true })
        .eq('id', pendingSignup.id);

    } else if (body.schoolId && body.role) {
      // Legacy fallback for backward compatibility
      console.warn(`[${requestId}] Using legacy direct school/role parameters (insecure)`);
      schoolId = body.schoolId;
      role = body.role;
    } else {
      return createErrorResponse(
        new Error('Missing required parameters'),
        'complete-oauth-profile',
        400,
        corsHeaders
      );
    }

    console.log(`[${requestId}] Completing OAuth profile for user ${user.id}, school ${schoolId}, role ${role}`);

    // Validate role
    if (role !== 'school_admin' && role !== 'teacher') {
      return createErrorResponse(
        new Error('Invalid role'),
        'complete-oauth-profile',
        400,
        corsHeaders
      );
    }

    // Verify school exists
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school) {
      console.error(`[${requestId}] School not found:`, schoolError);
      return createErrorResponse(
        new Error('School not found'),
        'complete-oauth-profile',
        404,
        corsHeaders
      );
    }

    // Ensure profile exists (defensive upsert)
    const { data: existingProfile, error: profileSelectErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileSelectErr) {
      console.error(`[${requestId}] Profile select error:`, profileSelectErr);
      return createErrorResponse(
        profileSelectErr,
        'complete-oauth-profile',
        500,
        corsHeaders
      );
    }

    if (!existingProfile) {
      console.log(`[${requestId}] Profile missing, creating it now`);
      const { error: createProfileErr } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email!,
          first_name: user.user_metadata.first_name || user.user_metadata.name || '',
          last_name: user.user_metadata.last_name || '',
          auth_provider: user.app_metadata.provider || 'google',
          needs_school_association: true,
        });

      if (createProfileErr) {
        console.error(`[${requestId}] Profile creation error:`, createProfileErr);
        return createErrorResponse(
          createProfileErr,
          'complete-oauth-profile',
          500,
          corsHeaders
        );
      }
    }

    // Update profile with school association
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        school_id: schoolId,
        needs_school_association: false
      })
      .eq('id', user.id);

    if (profileError) {
      console.error(`[${requestId}] Profile update error:`, profileError);
      return createErrorResponse(
        profileError,
        'complete-oauth-profile',
        500,
        corsHeaders
      );
    }

    // Create or update user role (idempotent)
    console.log(`[${requestId}] Upserting user role`);
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: user.id,
        role: role
      }, {
        onConflict: 'user_id,role',
        ignoreDuplicates: true
      });

    if (roleError) {
      console.error(`[${requestId}] Role upsert error:`, roleError);
      return createErrorResponse(
        roleError,
        'complete-oauth-profile',
        500,
        corsHeaders
      );
    }

    // If teacher, create or update teacher record (idempotent)
    if (role === 'teacher') {
      console.log(`[${requestId}] Upserting teacher record`);
      const { error: teacherError } = await supabase
        .from('teachers')
        .upsert({
          id: user.id,
          email: user.email!,
          first_name: user.user_metadata.first_name || user.user_metadata.name || '',
          last_name: user.user_metadata.last_name || '',
          school_id: schoolId,
          auth_provider: user.app_metadata.provider || 'google',
          invitation_status: 'completed',
          account_completed_at: new Date().toISOString()
        }, {
          onConflict: 'id',
          ignoreDuplicates: true
        });

      if (teacherError) {
        console.error(`[${requestId}] Teacher record upsert error:`, teacherError);
        return createErrorResponse(
          teacherError,
          'complete-oauth-profile',
          500,
          corsHeaders
        );
      }
    }

    console.log(`[${requestId}] OAuth profile completed successfully`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Profile completed successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return createErrorResponse(error, 'complete-oauth-profile', 500, corsHeaders);
  }
});
