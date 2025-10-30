import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { TeacherInvitationEmail } from '../_shared/email-templates/teacher-invitation-email.tsx';
import { createErrorResponse } from '../_shared/errorHandler.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TeacherInvitationRequest {
  email: string;
  firstName: string;
  lastName: string;
  schoolName: string;
  inviteUrl: string;
  schoolId: number;
}

// Disposable email domains to block
const DISPOSABLE_DOMAINS = [
  'tempmail.com', 'throwaway.email', '10minutemail.com', 'guerrillamail.com',
  'mailinator.com', 'maildrop.cc', 'temp-mail.org', 'getnada.com'
];

// Rate limiting: Track invitation sends per user
const invitationCounts = new Map<string, { count: number; resetTime: number }>();

function sanitizeInput(input: string, maxLength: number): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, '');
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email) || email.length > 254) return false;
  
  const domain = email.split('@')[1].toLowerCase();
  return !DISPOSABLE_DOMAINS.includes(domain);
}

function checkRateLimit(userId: string, maxInvites: number = 20, windowMs: number = 3600000): boolean {
  const now = Date.now();
  const existing = invitationCounts.get(userId);
  
  if (!existing || now > existing.resetTime) {
    invitationCounts.set(userId, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (existing.count >= maxInvites) {
    return false;
  }
  
  existing.count++;
  return true;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Missing authorization header");
      return createErrorResponse(
        new Error("Authentication required"),
        "send-teacher-invitation",
        401,
        corsHeaders
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("Authentication failed:", authError);
      return createErrorResponse(
        new Error("Invalid authentication"),
        "send-teacher-invitation",
        401,
        corsHeaders
      );
    }

    // 2. Create service role client for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 3. Check user role
    const { data: roles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError) {
      console.error("Error fetching user roles:", roleError);
      return createErrorResponse(roleError, "send-teacher-invitation", 500, corsHeaders);
    }

    const userRoles = roles?.map(r => r.role) || [];
    const isSystemAdmin = userRoles.includes('system_admin');
    const isSchoolAdmin = userRoles.includes('school_admin');

    if (!isSystemAdmin && !isSchoolAdmin) {
      console.error(`User ${user.id} lacks required role`);
      return createErrorResponse(
        new Error("Insufficient permissions"),
        "send-teacher-invitation",
        403,
        corsHeaders
      );
    }

    // 4. Parse and validate request body
    const { email, firstName, lastName, schoolName, inviteUrl, schoolId }: TeacherInvitationRequest = await req.json();

    // 5. Validate inputs
    if (!email || !firstName || !lastName || !schoolName || !inviteUrl || !schoolId) {
      console.error("Missing required fields");
      return createErrorResponse(
        new Error("Missing required fields"),
        "send-teacher-invitation",
        400,
        corsHeaders
      );
    }

    if (!isValidEmail(email)) {
      console.error(`Invalid or disposable email: ${email}`);
      return createErrorResponse(
        new Error("Invalid email address"),
        "send-teacher-invitation",
        400,
        corsHeaders
      );
    }

    // 6. Verify school access for school admins
    if (isSchoolAdmin && !isSystemAdmin) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();

      if (!profile || profile.school_id !== schoolId) {
        console.error(`School admin ${user.id} attempted to send invitation for different school`);
        return createErrorResponse(
          new Error("Cannot send invitations for other schools"),
          "send-teacher-invitation",
          403,
          corsHeaders
        );
      }
    }

    // 7. Check rate limiting
    if (!checkRateLimit(user.id)) {
      console.error(`Rate limit exceeded for user ${user.id}`);
      return createErrorResponse(
        new Error("Rate limit exceeded. Maximum 20 invitations per hour."),
        "send-teacher-invitation",
        429,
        corsHeaders
      );
    }

    // 8. Sanitize inputs
    const sanitizedFirstName = sanitizeInput(firstName, 100);
    const sanitizedLastName = sanitizeInput(lastName, 100);
    const sanitizedSchoolName = sanitizeInput(schoolName, 200);

    // 9. Render and send email
    const html = await renderAsync(
      React.createElement(TeacherInvitationEmail, {
        firstName: sanitizedFirstName,
        lastName: sanitizedLastName,
        schoolName: sanitizedSchoolName,
        inviteUrl,
      })
    );

    const emailResponse = await resend.emails.send({
      from: "School Admin <invite@dismissalpro.io>",
      to: [email],
      subject: `Invitation to join ${sanitizedSchoolName} - Dismissal Pro`,
      html,
    });

    console.log("Teacher invitation sent successfully:", emailResponse);

    // 10. Log to audit_logs
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'teacher_invitation_sent',
        table_name: 'teachers',
        details: {
          recipient_email: email,
          recipient_name: `${sanitizedFirstName} ${sanitizedLastName}`,
          school_id: schoolId,
          school_name: sanitizedSchoolName,
          email_id: emailResponse.data?.id
        }
      });

    return new Response(JSON.stringify({ success: true, id: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-teacher-invitation function:", error);
    return createErrorResponse(
      error,
      "send-teacher-invitation",
      500,
      corsHeaders
    );
  }
};

serve(handler);