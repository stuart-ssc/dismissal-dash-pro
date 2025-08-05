import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

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

    const emailResponse = await resend.emails.send({
      from: "School Admin <onboarding@resend.dev>",
      to: [email],
      subject: `Invitation to join ${schoolName} as a Teacher`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">Welcome to ${schoolName}!</h1>
          
          <p>Dear ${firstName} ${lastName},</p>
          
          <p>You have been invited to join <strong>${schoolName}</strong> as a teacher on our school management platform.</p>
          
          <p>To complete your account setup and create your password, please click the link below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Complete Account Setup
            </a>
          </div>
          
          <p>This invitation link will expire in 24 hours for security purposes.</p>
          
          <p>If you have any questions, please contact your school administrator.</p>
          
          <p>Best regards,<br>
          The ${schoolName} Team</p>
          
          <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666; text-align: center;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
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