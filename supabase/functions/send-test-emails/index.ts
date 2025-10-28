import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { ConfirmationEmail } from '../_shared/email-templates/confirmation-email.tsx';
import { MagicLinkEmail } from '../_shared/email-templates/magic-link-email.tsx';
import { PasswordResetEmail } from '../_shared/email-templates/password-reset-email.tsx';
import { EmailChangeEmail } from '../_shared/email-templates/email-change-email.tsx';
import { TeacherInvitationEmail } from '../_shared/email-templates/teacher-invitation-email.tsx';
import { EmailVerification } from '../_shared/email-templates/email-verification.tsx';
import { AdminNotificationEmail } from '../_shared/email-templates/admin-notification-email.tsx';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sleep utility to respect Resend's rate limit (2 emails/second)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email address is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending test emails to: ${email}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://lwbmtirzntexaxdlhgsk.supabase.co';
    const sampleData = {
      supabaseUrl,
      token: 'SAMPLE-TOKEN-123456',
      tokenHash: 'sample-hash-789xyz',
      redirectTo: 'https://dismissalpro.io/dashboard',
      emailActionType: 'signup',
      firstName: 'Stuart',
      lastName: 'Demo',
      schoolName: 'Oakwood Elementary School',
      inviteUrl: 'https://dismissalpro.io/invite/sample-123',
      verificationUrl: 'https://dismissalpro.io/verify/sample-456',
      requestId: 'REQ-2025-001',
      schoolId: 1,
      schoolCity: 'Springfield',
      schoolState: 'IL',
      schoolDistrict: 'Springfield School District',
      userEmail: email,
      roles: 'school_admin',
      userId: 'user-123-sample',
      signupTime: new Date().toISOString(),
    };

    const results = [];

    // 1. Confirmation Email
    try {
      const html1 = await renderAsync(
        React.createElement(ConfirmationEmail, {
          token: sampleData.token,
          supabaseUrl: sampleData.supabaseUrl,
          emailActionType: sampleData.emailActionType,
          redirectTo: sampleData.redirectTo,
          tokenHash: sampleData.tokenHash,
        })
      );
      const res1 = await resend.emails.send({
        from: "Dismissal Pro <onboarding@dismissalpro.io>",
        to: [email],
        subject: "[TEST] Dismissal Pro - Confirmation Email",
        html: html1,
      });
      results.push({ template: "confirmation", status: "sent", messageId: res1.data?.id });
      console.log("✓ Confirmation email sent");
      await sleep(600);
    } catch (e) {
      results.push({ template: "confirmation", status: "error", error: e.message });
      console.error("✗ Confirmation email failed:", e.message);
    }

    // 2. Magic Link Email
    try {
      const html2 = await renderAsync(
        React.createElement(MagicLinkEmail, {
          token: sampleData.token,
          supabaseUrl: sampleData.supabaseUrl,
          emailActionType: 'magiclink',
          redirectTo: sampleData.redirectTo,
          tokenHash: sampleData.tokenHash,
        })
      );
      const res2 = await resend.emails.send({
        from: "Dismissal Pro <onboarding@dismissalpro.io>",
        to: [email],
        subject: "[TEST] Dismissal Pro - Magic Link Email",
        html: html2,
      });
      results.push({ template: "magic-link", status: "sent", messageId: res2.data?.id });
      console.log("✓ Magic link email sent");
      await sleep(600);
    } catch (e) {
      results.push({ template: "magic-link", status: "error", error: e.message });
      console.error("✗ Magic link email failed:", e.message);
    }

    // 3. Password Reset Email
    try {
      const html3 = await renderAsync(
        React.createElement(PasswordResetEmail, {
          token: sampleData.token,
          supabaseUrl: sampleData.supabaseUrl,
          emailActionType: 'recovery',
          redirectTo: sampleData.redirectTo,
          tokenHash: sampleData.tokenHash,
        })
      );
      const res3 = await resend.emails.send({
        from: "Dismissal Pro <onboarding@dismissalpro.io>",
        to: [email],
        subject: "[TEST] Dismissal Pro - Password Reset Email",
        html: html3,
      });
      results.push({ template: "password-reset", status: "sent", messageId: res3.data?.id });
      console.log("✓ Password reset email sent");
      await sleep(600);
    } catch (e) {
      results.push({ template: "password-reset", status: "error", error: e.message });
      console.error("✗ Password reset email failed:", e.message);
    }

    // 4. Email Change Email
    try {
      const html4 = await renderAsync(
        React.createElement(EmailChangeEmail, {
          token: sampleData.token,
          supabaseUrl: sampleData.supabaseUrl,
          emailActionType: 'email_change',
          redirectTo: sampleData.redirectTo,
          tokenHash: sampleData.tokenHash,
        })
      );
      const res4 = await resend.emails.send({
        from: "Dismissal Pro <onboarding@dismissalpro.io>",
        to: [email],
        subject: "[TEST] Dismissal Pro - Email Change Confirmation",
        html: html4,
      });
      results.push({ template: "email-change", status: "sent", messageId: res4.data?.id });
      console.log("✓ Email change email sent");
      await sleep(600);
    } catch (e) {
      results.push({ template: "email-change", status: "error", error: e.message });
      console.error("✗ Email change email failed:", e.message);
    }

    // 5. Teacher Invitation Email
    try {
      const html5 = await renderAsync(
        React.createElement(TeacherInvitationEmail, {
          firstName: sampleData.firstName,
          lastName: sampleData.lastName,
          schoolName: sampleData.schoolName,
          inviteUrl: sampleData.inviteUrl,
        })
      );
      const res5 = await resend.emails.send({
        from: "School Admin <invite@dismissalpro.io>",
        to: [email],
        subject: "[TEST] Dismissal Pro - Teacher Invitation",
        html: html5,
      });
      results.push({ template: "teacher-invitation", status: "sent", messageId: res5.data?.id });
      console.log("✓ Teacher invitation email sent");
      await sleep(600);
    } catch (e) {
      results.push({ template: "teacher-invitation", status: "error", error: e.message });
      console.error("✗ Teacher invitation email failed:", e.message);
    }

    // 6. Email Verification
    try {
      const html6 = await renderAsync(
        React.createElement(EmailVerification, {
          verificationUrl: sampleData.verificationUrl,
          requestId: sampleData.requestId,
        })
      );
      const res6 = await resend.emails.send({
        from: "Dismissal Pro <security@dismissalpro.io>",
        to: [email],
        subject: "[TEST] Dismissal Pro - Verify Email Change",
        html: html6,
      });
      results.push({ template: "email-verification", status: "sent", messageId: res6.data?.id });
      console.log("✓ Email verification email sent");
      await sleep(600);
    } catch (e) {
      results.push({ template: "email-verification", status: "error", error: e.message });
      console.error("✗ Email verification email failed:", e.message);
    }

    // 7. Admin Notification Email
    try {
      const html7 = await renderAsync(
        React.createElement(AdminNotificationEmail, {
          schoolName: sampleData.schoolName,
          schoolId: sampleData.schoolId,
          schoolCity: sampleData.schoolCity,
          schoolState: sampleData.schoolState,
          schoolDistrict: sampleData.schoolDistrict,
          userEmail: sampleData.userEmail,
          userName: `${sampleData.firstName} ${sampleData.lastName}`,
          userId: sampleData.userId,
          userRoles: sampleData.roles,
          signupTime: sampleData.signupTime,
        })
      );
      const res7 = await resend.emails.send({
        from: "Dismissal Pro <admin@dismissalpro.io>",
        to: [email],
        subject: "[TEST] Dismissal Pro - Admin Notification (New School Signup)",
        html: html7,
      });
      results.push({ template: "admin-notification", status: "sent", messageId: res7.data?.id });
      console.log("✓ Admin notification email sent");
    } catch (e) {
      results.push({ template: "admin-notification", status: "error", error: e.message });
      console.error("✗ Admin notification email failed:", e.message);
    }

    const successCount = results.filter(r => r.status === "sent").length;
    
    console.log(`Test emails completed: ${successCount}/${results.length} sent successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent: successCount,
        totalEmails: results.length,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-test-emails function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
