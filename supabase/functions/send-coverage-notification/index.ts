import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { coveringTeacherId, className, coverageDates, notes } = await req.json();

    // Get covering teacher email
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: teacher } = await supabase
      .from('teachers')
      .select('email, first_name')
      .eq('id', coveringTeacherId)
      .single();

    if (!teacher?.email) {
      throw new Error("Teacher email not found");
    }

    const datesString = Array.isArray(coverageDates) 
      ? coverageDates.join(', ')
      : coverageDates;

    // Send email via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Dismissal Pro <dismissal@updates.dismissal.pro>",
        to: [teacher.email],
        subject: `Coverage Assignment: ${className}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Dismissal Coverage Assignment</h2>
            <p>Hi ${teacher.first_name},</p>
            <p>You have been assigned to cover dismissal for <strong>${className}</strong>.</p>
            
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Date(s):</strong> ${datesString}</p>
              ${notes ? `<p style="margin: 10px 0 0 0;"><strong>Notes:</strong> ${notes}</p>` : ''}
            </div>

            <p>You'll be able to access this class in Classroom Mode on the day of coverage.</p>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This is an automated notification from Dismissal Pro.
            </p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Resend API error: ${error}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending coverage notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
