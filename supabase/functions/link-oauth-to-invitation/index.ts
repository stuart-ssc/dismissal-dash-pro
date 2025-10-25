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

    // Email validation - check if OAuth email matches invitation email
    const invitedEmail = teacher.email.toLowerCase();
    const oauthEmail = user.email?.toLowerCase() || '';
    
    if (invitedEmail !== oauthEmail) {
      console.log(`[${requestId}] Email mismatch: invited=${invitedEmail}, oauth=${oauthEmail}`);
      // Allow but log the mismatch - update teacher record with OAuth email
    }

    // Update teacher record with OAuth user ID (idempotent)
    console.log(`[${requestId}] Updating teacher record`);
    const { error: updateError } = await supabase
      .from('teachers')
      .update({
        id: user.id,
        email: oauthEmail, // Update with OAuth email
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

    // Ensure profile exists
    console.log(`[${requestId}] Ensuring profile exists`);
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!existingProfile) {
      const { error: profileCreateError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          school_id: teacher.school_id,
          needs_school_association: false
        });

      if (profileCreateError) {
        console.error(`[${requestId}] Error creating profile:`, profileCreateError);
        return createErrorResponse(
          profileCreateError,
          'link-oauth-to-invitation',
          500,
          corsHeaders
        );
      }
    } else {
      // Update existing profile with school association
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
    }

    // Create or update user role (idempotent)
    console.log(`[${requestId}] Upserting user role`);
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: user.id,
        role: 'teacher'
      }, {
        onConflict: 'user_id,role',
        ignoreDuplicates: true
      });

    if (roleError) {
      console.error(`[${requestId}] Error upserting role:`, roleError);
      return createErrorResponse(
        roleError,
        'link-oauth-to-invitation',
        500,
        corsHeaders
      );
    }

    console.log(`[${requestId}] OAuth account linked to invitation successfully`);
    
    // Log email mismatch if applicable (for admin tracking)
    if (invitedEmail !== oauthEmail) {
      console.log(`[${requestId}] NOTE: Teacher signed up with different email. Invited: ${invitedEmail}, Used: ${oauthEmail}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Account linked successfully',
        schoolId: teacher.school_id,
        emailChanged: invitedEmail !== oauthEmail
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
