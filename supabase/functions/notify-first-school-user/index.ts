import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { Resend } from "npm:resend@2.0.0";
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { AdminNotificationEmail } from '../send-auth-email/_templates/admin-notification-email.tsx';

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
    const signupTime = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }) + ' EST';

    // Render React Email template
    const html = await renderAsync(
      React.createElement(AdminNotificationEmail, {
        schoolName: school.school_name || 'Unknown School',
        schoolId: school.id,
        schoolCity: school.city,
        schoolState: school.state,
        schoolDistrict: school.school_district,
        firstName: first_name,
        lastName: last_name,
        email,
        roles,
        userId: user_id,
        signupTime,
      })
    );

    // Send notification email
    const emailResponse = await resend.emails.send({
      from: "Dismissal Pro <notifications@dismissalpro.io>",
      to: ["stuart@dismissalpro.io"],
      subject: `🎉 New School Signup: ${school.school_name || 'Unknown School'}`,
      html,
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
