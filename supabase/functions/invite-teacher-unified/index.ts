import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { TeacherInvitationEmail } from '../_shared/email-templates/teacher-invitation-email.tsx';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TeacherInvitation {
  email: string;
  firstName: string;
  lastName: string;
  schoolId: number;
}

interface BulkTeacherInvitationRequest {
  teachers: TeacherInvitation[];
  schoolId: number;
}

interface SingleTeacherInvitationRequest extends TeacherInvitation {}

const generateInvitationToken = () => {
  return crypto.randomUUID() + "-" + Date.now().toString(36);
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user has permission to invite teachers
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const hasPermission = userRoles?.some(r => 
      r.role === 'system_admin' || r.role === 'school_admin'
    );

    if (!hasPermission) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestData = await req.json();
    
    // Determine if this is bulk or single invitation
    const isBulk = 'teachers' in requestData;
    const teachers: TeacherInvitation[] = isBulk 
      ? (requestData as BulkTeacherInvitationRequest).teachers
      : [requestData as SingleTeacherInvitationRequest];

    const schoolId = isBulk 
      ? (requestData as BulkTeacherInvitationRequest).schoolId
      : (requestData as SingleTeacherInvitationRequest).schoolId;

    // Get school information for branding
    const { data: school } = await supabase
      .from('schools')
      .select('school_name, primary_color, secondary_color')
      .eq('id', schoolId)
      .single();

    const results = {
      success: 0,
      errors: [] as string[],
      invitations: [] as any[]
    };

    // Process each teacher invitation
    for (const teacher of teachers) {
      try {
        // Generate invitation token and expiry (24 hours)
        const invitationToken = generateInvitationToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Create or update teacher record
        const { data: existingTeacher } = await supabase
          .from('teachers')
          .select('id, invitation_status')
          .eq('email', teacher.email)
          .eq('school_id', schoolId)
          .single();

        let teacherId;
        
        if (existingTeacher) {
          // Update existing teacher with new invitation token
          const { error: updateError } = await supabase
            .from('teachers')
            .update({
              invitation_token: invitationToken,
              invitation_sent_at: new Date().toISOString(),
              invitation_expires_at: expiresAt.toISOString(),
              invitation_status: 'pending'
            })
            .eq('id', existingTeacher.id);

          if (updateError) throw updateError;
          teacherId = existingTeacher.id;
        } else {
          // Create new teacher record
          const { data: newTeacher, error: createError } = await supabase
            .from('teachers')
            .insert({
              first_name: teacher.firstName,
              last_name: teacher.lastName,
              email: teacher.email,
              school_id: schoolId,
              invitation_token: invitationToken,
              invitation_sent_at: new Date().toISOString(),
              invitation_expires_at: expiresAt.toISOString(),
              invitation_status: 'pending'
            })
            .select('id')
            .single();

          if (createError) throw createError;
          teacherId = newTeacher.id;
        }

        // Create invitation URL
        const baseUrl = req.headers.get('origin') || 'https://dismissalpro.com';
        const inviteUrl = `${baseUrl}/auth?invitation=${invitationToken}&type=teacher`;

        // Render React Email template
        const html = await renderAsync(
          React.createElement(TeacherInvitationEmail, {
            firstName: teacher.firstName,
            lastName: teacher.lastName,
            schoolName: school?.school_name || 'your school',
            inviteUrl,
            schoolPrimaryColor: school?.primary_color,
            schoolSecondaryColor: school?.secondary_color,
          })
        );

        // Send email invitation
        const emailResponse = await resend.emails.send({
          from: `${school?.school_name || 'School'} Admin <invite@dismissalpro.io>`,
          to: [teacher.email],
          subject: `Invitation to join ${school?.school_name || 'your school'} - Dismissal Pro`,
          html,
        });

        console.log(`Teacher invitation sent to ${teacher.email}:`, emailResponse);

        results.success++;
        results.invitations.push({
          email: teacher.email,
          teacherId,
          invitationToken,
          status: 'sent'
        });

      } catch (error: any) {
        console.error(`Error inviting teacher ${teacher.email}:`, error);
        results.errors.push(`Failed to invite ${teacher.email}: ${error.message}`);
      }
    }

    return new Response(JSON.stringify({
      message: `Successfully sent ${results.success} invitation(s)`,
      ...results
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    // Log detailed error server-side
    console.error("Error in invite-teacher-unified function:", error);
    
    // Return generic error to client
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send teacher invitation',
        code: 'INVITE_TEACHER_ERROR'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);