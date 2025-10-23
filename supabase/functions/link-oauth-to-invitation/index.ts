import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { handleEdgeFunctionError, createErrorResponse } from '../_shared/errorHandler.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface LinkOAuthRequest {
  invitationToken: string;
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
        'link-oauth-to-invitation',
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
        'link-oauth-to-invitation',
        401,
        corsHeaders
      );
    }

    const body: LinkOAuthRequest = await req.json();
    const { invitationToken } = body;

    console.log(`[${requestId}] Linking OAuth user ${user.id} to invitation`);

    if (!invitationToken) {
      return createErrorResponse(
        new Error('Missing invitation token'),
        'link-oauth-to-invitation',
        400,
        corsHeaders
      );
    }

    // Find and validate invitation
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('*')
      .eq('invitation_token', invitationToken)
      .eq('invitation_status', 'pending')
      .single();

    if (teacherError || !teacher) {
      console.error(`[${requestId}] Invalid or expired invitation:`, teacherError);
      return createErrorResponse(
        new Error('Invalid or expired invitation'),
        'link-oauth-to-invitation',
        404,
        corsHeaders
      );
    }

    // Check if invitation is expired
    if (teacher.invitation_expires_at && new Date(teacher.invitation_expires_at) < new Date()) {
      console.error(`[${requestId}] Invitation expired`);
      return createErrorResponse(
        new Error('Invitation has expired'),
        'link-oauth-to-invitation',
        400,
        corsHeaders
      );
    }

    // Update teacher record with OAuth user ID
    const { error: updateError } = await supabase
      .from('teachers')
      .update({
        id: user.id,
        invitation_status: 'completed',
        account_completed_at: new Date().toISOString(),
        auth_provider: user.app_metadata.provider || 'google'
      })
      .eq('invitation_token', invitationToken);

    if (updateError) {
      console.error(`[${requestId}] Error updating teacher record:`, updateError);
      return createErrorResponse(
        updateError,
        'link-oauth-to-invitation',
        500,
        corsHeaders
      );
    }

    // Update profile with school association
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        school_id: teacher.school_id,
        needs_school_association: false
      })
      .eq('id', user.id);

    if (profileError) {
      console.error(`[${requestId}] Error updating profile:`, profileError);
      return createErrorResponse(
        profileError,
        'link-oauth-to-invitation',
        500,
        corsHeaders
      );
    }

    // Create user role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'teacher'
      });

    if (roleError) {
      console.error(`[${requestId}] Error creating role:`, roleError);
      return createErrorResponse(
        roleError,
        'link-oauth-to-invitation',
        500,
        corsHeaders
      );
    }

    console.log(`[${requestId}] OAuth account linked to invitation successfully`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Account linked successfully',
        schoolId: teacher.school_id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return createErrorResponse(error, 'link-oauth-to-invitation', 500, corsHeaders);
  }
});
