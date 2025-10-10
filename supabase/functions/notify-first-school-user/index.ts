import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  school_id: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, first_name, last_name, email, school_id }: NotificationRequest = await req.json();

    console.log("Checking if this is the first user for school:", school_id);

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check how many users this school has
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', school_id);

    if (countError) {
      console.error("Error counting users:", countError);
      throw countError;
    }

    console.log(`School ${school_id} now has ${count} user(s)`);

    // Only send email if this is the first user (count === 1)
    if (count !== 1) {
      console.log("Not the first user for this school, skipping notification");
      return new Response(
        JSON.stringify({ message: "Not first user, no notification sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch school details
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, school_name, city, state, school_district')
      .eq('id', school_id)
      .single();

    if (schoolError) {
      console.error("Error fetching school:", schoolError);
      throw schoolError;
    }

    // Check user's role
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user_id);

    const roles = userRoles?.map(r => r.role).join(', ') || 'No role assigned';

    // Send notification email
    const emailResponse = await resend.emails.send({
      from: "Dismissal Pro <notifications@dismissalpro.io>",
      to: ["stuart@dismissalpro.io"],
      subject: `🎉 New School Signup: ${school.school_name || 'Unknown School'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">New School Has Its First User!</h2>
          
          <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1F2937;">School Details</h3>
            <p><strong>School Name:</strong> ${school.school_name || 'Not set'}</p>
            <p><strong>School ID:</strong> ${school.id}</p>
            <p><strong>Location:</strong> ${school.city || 'Unknown'}, ${school.state || 'Unknown'}</p>
            <p><strong>District:</strong> ${school.school_district || 'Not set'}</p>
          </div>

          <div style="background-color: #EFF6FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1F2937;">User Details</h3>
            <p><strong>Name:</strong> ${first_name} ${last_name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Role(s):</strong> ${roles}</p>
            <p><strong>User ID:</strong> ${user_id}</p>
            <p><strong>Signup Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST</p>
          </div>

          <div style="margin-top: 30px;">
            <a href="https://lwbmtirzntexaxdlhgsk.supabase.co/project/lwbmtirzntexaxdlhgsk/auth/users" 
               style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View in Supabase Admin
            </a>
          </div>

          <p style="margin-top: 30px; color: #6B7280; font-size: 14px;">
            This notification was sent because this is the first user to sign up for this school.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in notify-first-school-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
