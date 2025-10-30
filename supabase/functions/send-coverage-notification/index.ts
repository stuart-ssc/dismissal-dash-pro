import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { CoverageNotificationEmail } from "../_shared/email-templates/coverage-notification-email.tsx";
import { createErrorResponse } from "../_shared/errorHandler.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authentication - verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get authenticated user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authorization - verify user has school_admin or system_admin role
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Authorization check failed' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hasPermission = userRoles?.some(r => 
      r.role === 'system_admin' || r.role === 'school_admin'
    );

    if (!hasPermission) {
      console.error('User lacks required permissions:', user.id);
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { coveringTeacherId, className, coverageDates, notes } = await req.json();

    // Input validation
    if (!coveringTeacherId || !className || !coverageDates) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input lengths to prevent abuse
    if (className.length > 200 || (notes && notes.length > 1000)) {
      return new Response(
        JSON.stringify({ error: 'Input exceeds maximum length' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get covering teacher and verify they're in the caller's school (unless system admin)
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('email, first_name, school_id')
      .eq('id', coveringTeacherId)
      .single();

    if (teacherError || !teacher?.email) {
      console.error('Teacher not found:', coveringTeacherId, teacherError);
      return new Response(
        JSON.stringify({ error: 'Teacher not found' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify school access - school admins can only notify teachers in their school
    const isSystemAdmin = userRoles?.some(r => r.role === 'system_admin');
    if (!isSystemAdmin) {
      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();

      if (!callerProfile?.school_id || callerProfile.school_id !== teacher.school_id) {
        console.error('Cross-school access attempt:', user.id, teacher.school_id);
        return new Response(
          JSON.stringify({ error: 'Cannot notify teachers from other schools' }), 
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const datesString = Array.isArray(coverageDates) 
      ? coverageDates.join(', ')
      : coverageDates;

    // Render email using React template with sanitized inputs
    const emailHtml = await renderAsync(
      React.createElement(CoverageNotificationEmail, {
        teacherFirstName: teacher.first_name,
        className,
        coverageDates: datesString,
        notes,
      })
    );

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
        subject: `Coverage Assignment: ${className.substring(0, 100)}`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('Resend API error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to send notification email' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Audit log the notification send
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      table_name: 'class_coverage',
      action: 'coverage_notification_sent',
      details: {
        covering_teacher_id: coveringTeacherId,
        class_name: className,
        coverage_dates: datesString,
      }
    });

    console.log('Coverage notification sent successfully:', coveringTeacherId);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending coverage notification:", error);
    return createErrorResponse(
      error,
      'send-coverage-notification',
      500,
      corsHeaders
    );
  }
});
