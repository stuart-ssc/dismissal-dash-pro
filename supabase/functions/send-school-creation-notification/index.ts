import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@4.0.0';
import { render } from 'npm:@react-email/components@0.0.22';
import { corsHeaders } from '../_shared/cors.ts';
import { SchoolCreationNotification } from '../_shared/email-templates/school-creation-notification.tsx';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { 
      schoolId,
      schoolName,
      schoolData,
      creatorEmail,
      creatorIp,
      userAgent,
      flagged,
      flagReasons,
    } = await req.json();

    // Get all system admins
    const { data: systemAdmins, error: adminsError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, profiles!inner(email, first_name, last_name)')
      .eq('role', 'system_admin');

    if (adminsError) {
      console.error('Error fetching system admins:', adminsError);
      throw adminsError;
    }

    if (!systemAdmins || systemAdmins.length === 0) {
      console.log('No system admins found to notify');
      return new Response(
        JSON.stringify({ message: 'No system admins to notify' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare email content
    const emailHtml = await render(
      SchoolCreationNotification({
        schoolName: schoolName,
        city: schoolData.city,
        state: schoolData.state,
        streetAddress: schoolData.streetAddress,
        zipcode: schoolData.zipcode,
        county: schoolData.county,
        schoolDistrict: schoolData.schoolDistrict,
        phoneNumber: schoolData.phoneNumber,
        creatorEmail: creatorEmail,
        creatorIp: creatorIp,
        userAgent: userAgent,
        createdAt: new Date().toISOString(),
        flagged: flagged,
        flagReasons: flagReasons || [],
        schoolId: schoolId,
      })
    );

    // Send email to all system admins
    const resend = new Resend(RESEND_API_KEY);
    
    const adminEmails = systemAdmins
      .map((admin: any) => admin.profiles?.email)
      .filter((email: string | null) => email);

    if (adminEmails.length === 0) {
      console.log('No valid admin emails found');
      return new Response(
        JSON.stringify({ message: 'No valid admin emails' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await resend.emails.send({
      from: 'Dismissal Pro <noreply@dismissalpro.io>',
      to: adminEmails,
      subject: `🏫 New School Created: ${schoolName}${flagged ? ' [FLAGGED]' : ''}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    console.log('Admin notification sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, emailsSent: adminEmails.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending admin notification:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send notification' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
