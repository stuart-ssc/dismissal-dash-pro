import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { TeacherInvitationEmail } from '../_shared/email-templates/teacher-invitation-email.tsx';

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
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName, schoolName, inviteUrl }: TeacherInvitationRequest = await req.json();

    // Render React Email template
    const html = await renderAsync(
      React.createElement(TeacherInvitationEmail, {
        firstName,
        lastName,
        schoolName,
        inviteUrl,
      })
    );

    const emailResponse = await resend.emails.send({
      from: "School Admin <invite@dismissalpro.io>",
      to: [email],
      subject: `Invitation to join ${schoolName} - Dismissal Pro`,
      html,
    });

    console.log("Teacher invitation sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-teacher-invitation function:", error);
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