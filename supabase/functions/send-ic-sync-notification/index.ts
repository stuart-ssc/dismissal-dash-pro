import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import React from 'npm:react@18.3.1';
import { ICSyncNotificationEmail } from '../_shared/email-templates/ic-sync-notification-email.tsx';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncStatistics {
  totalStudents: number;
  studentsAdded: number;
  studentsUpdated: number;
  errors: number;
  duration: string;
}

interface NotificationRequest {
  schoolId: number;
  status: 'success' | 'failure';
  statistics: SyncStatistics;
  errorDetails?: string[];
  syncedAt: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { schoolId, status, statistics, errorDetails, syncedAt }: NotificationRequest = await req.json();

    console.log(`[IC Sync Notification] Processing notification for school ${schoolId}, status: ${status}`);

    // Get school details
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('school_name')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school) {
      throw new Error(`Failed to fetch school: ${schoolError?.message}`);
    }

    // Get school admin emails
    const { data: adminProfiles, error: adminsError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('school_id', schoolId)
      .in('id', 
        supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'school_admin')
      );

    if (adminsError) {
      throw new Error(`Failed to fetch admins: ${adminsError.message}`);
    }

    if (!adminProfiles || adminProfiles.length === 0) {
      console.log(`[IC Sync Notification] No admins found for school ${schoolId}, skipping notification`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No admins to notify',
          emailsSent: 0 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const adminEmails = adminProfiles
      .filter(p => p.email)
      .map(p => p.email as string);

    if (adminEmails.length === 0) {
      console.log(`[IC Sync Notification] No valid admin emails for school ${schoolId}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No valid admin emails',
          emailsSent: 0 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Render email
    const html = await renderAsync(
      React.createElement(ICSyncNotificationEmail, {
        schoolName: school.school_name,
        status,
        statistics,
        errorDetails,
        syncedAt,
        appUrl: supabaseUrl.replace('.supabase.co', '').replace('https://', 'https://') + '.lovableproject.com',
      })
    );

    // Send email
    const { error: sendError } = await resend.emails.send({
      from: 'Dismissal Pro <noreply@dismissalpro.io>',
      to: adminEmails,
      subject: `Infinite Campus Sync ${status === 'success' ? 'Completed' : 'Failed'} - ${school.school_name}`,
      html,
    });

    if (sendError) {
      console.error('[IC Sync Notification] Resend error:', sendError);
      throw sendError;
    }

    console.log(`[IC Sync Notification] Successfully sent ${adminEmails.length} notification(s) for school ${schoolId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent: adminEmails.length,
        recipients: adminEmails 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[IC Sync Notification] Error:', error);
    return new Response(
      JSON.stringify({
        error: {
          http_code: error.code || 500,
          message: error.message || 'Internal server error',
        },
      }),
      {
        status: error.code || 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
