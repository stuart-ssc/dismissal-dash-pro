import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@4.0.0';
import { render } from 'npm:@react-email/components@0.0.22';
import { corsHeaders } from '../_shared/cors.ts';
import { YearEndRolloverEmail } from '../_shared/email-templates/year-end-rollover-email.tsx';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const appUrl = Deno.env.get('APP_URL') || 'https://dismissalpro.io';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { 
      schoolId,
      schoolName,
      oldSessionName,
      newSessionName,
      newSessionStartDate,
      newSessionEndDate,
      completedByUserId,
    } = await req.json();

    console.log('Sending year-end rollover notification for school:', schoolId);

    // Get the user who completed the rollover
    const { data: completedByProfile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', completedByUserId)
      .single();

    const completedByName = completedByProfile 
      ? `${completedByProfile.first_name} ${completedByProfile.last_name}` 
      : 'Administrator';

    // Get all school staff (school admins and teachers)
    const { data: staffRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['school_admin', 'teacher']);

    if (rolesError) {
      console.error('Error fetching staff roles:', rolesError);
      throw rolesError;
    }

    if (!staffRoles || staffRoles.length === 0) {
      console.log('No staff found to notify');
      return new Response(
        JSON.stringify({ message: 'No staff to notify' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const staffUserIds = staffRoles.map(role => role.user_id);

    // Get profiles for staff at this specific school
    const { data: staffProfiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('school_id', schoolId)
      .in('id', staffUserIds);

    if (profilesError) {
      console.error('Error fetching staff profiles:', profilesError);
      throw profilesError;
    }

    if (!staffProfiles || staffProfiles.length === 0) {
      console.log('No staff profiles found for this school');
      return new Response(
        JSON.stringify({ message: 'No staff profiles found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format dates for email
    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    // Prepare email content
    const emailHtml = await render(
      YearEndRolloverEmail({
        schoolName,
        oldSessionName,
        newSessionName,
        newSessionStartDate: formatDate(newSessionStartDate),
        newSessionEndDate: formatDate(newSessionEndDate),
        appUrl,
        completedBy: completedByName,
        completedAt: new Date().toLocaleString('en-US', { 
          dateStyle: 'medium', 
          timeStyle: 'short' 
        }),
      })
    );

    // Send email to all staff
    const resend = new Resend(RESEND_API_KEY);
    
    const staffEmails = staffProfiles
      .map((profile) => profile.email)
      .filter((email) => email);

    if (staffEmails.length === 0) {
      console.log('No valid staff emails found');
      return new Response(
        JSON.stringify({ message: 'No valid staff emails' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending rollover notification to ${staffEmails.length} staff members`);

    const { data, error } = await resend.emails.send({
      from: 'Dismissal Pro <noreply@dismissalpro.io>',
      to: staffEmails,
      subject: `🎓 New Academic Year Activated: ${newSessionName}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    console.log('Rollover notification sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, emailsSent: staffEmails.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending rollover notification:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send notification' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
