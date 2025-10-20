import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignupRequest {
  token: string;
  password: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, password } = await req.json() as SignupRequest;

    if (!token || !password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate password requirements
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate token and get teacher data
    const { data: teacher, error: findError } = await supabase
      .from('teachers')
      .select('id, first_name, last_name, email, school_id, invitation_status, invitation_expires_at')
      .eq('invitation_token', token)
      .eq('invitation_status', 'pending')
      .single();

    if (findError || !teacher) {
      console.warn('Invalid or expired invitation token in signup');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invitation' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if token has expired
    if (new Date(teacher.invitation_expires_at) < new Date()) {
      console.warn('Expired invitation token attempted for signup');
      return new Response(
        JSON.stringify({ error: 'Invitation has expired' }),
        { 
          status: 410, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create user account
    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email: teacher.email,
      password: password,
      email_confirm: false, // Require email confirmation
      user_metadata: {
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        school_id: teacher.school_id,
      }
    });

    if (signUpError) {
      console.error('Error creating user account:', signUpError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create account',
          code: 'SIGNUP_ERROR'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!authData.user) {
      console.error('No user returned from signup');
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create account',
          code: 'SIGNUP_ERROR'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const userId = authData.user.id;

    // Update teacher record
    const { error: updateTeacherError } = await supabase
      .from('teachers')
      .update({
        id: userId, // Link teacher record to auth user
        invitation_status: 'completed',
        account_completed_at: new Date().toISOString(),
        invitation_token: null // Clear the token
      })
      .eq('invitation_token', token);

    if (updateTeacherError) {
      console.error('Error updating teacher record:', updateTeacherError);
      // Don't fail the request, user is created
    }

    // Create user role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'teacher'
      });

    if (roleError) {
      console.error('Error creating user role:', roleError);
      // Don't fail the request, user is created
    }

    console.info(`Successfully completed teacher signup for email: ${teacher.email}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Account created successfully. Please check your email to verify your account.'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    // Log detailed error server-side
    console.error("Error in complete-teacher-signup:", error);
    
    // Return generic error to client
    return new Response(
      JSON.stringify({ 
        error: 'Failed to complete signup',
        code: 'SIGNUP_ERROR'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);
