import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

        // Send email invitation
        const emailResponse = await resend.emails.send({
          from: `${school?.school_name || 'School'} Admin <invite@dismissalpro.io>`,
          to: [teacher.email],
          subject: `Invitation to join ${school?.school_name || 'your school'} - Dismissal Pro`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
              <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <div style="width: 60px; height: 60px; background: linear-gradient(135deg, ${school?.primary_color || '#3B82F6'}, ${school?.secondary_color || '#EF4444'}); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                    <span style="color: white; font-size: 24px; font-weight: bold;">📚</span>
                  </div>
                  <h1 style="color: #1f2937; margin: 0; font-size: 24px;">Welcome to ${school?.school_name || 'your school'}!</h1>
                </div>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.5;">Dear ${teacher.firstName} ${teacher.lastName},</p>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.5;">
                  You have been invited to join <strong>${school?.school_name || 'your school'}</strong> as a teacher on Dismissal Pro, 
                  our school dismissal management platform.
                </p>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.5;">
                  To complete your account setup and start managing your classes, please click the button below:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${inviteUrl}" 
                     style="background: linear-gradient(135deg, ${school?.primary_color || '#3B82F6'}, ${school?.secondary_color || '#EF4444'}); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
                    Complete Account Setup
                  </a>
                </div>
                
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0;">
                    <strong>⏰ This invitation expires in 24 hours</strong> for security purposes.
                  </p>
                </div>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.5;">
                  Once you complete your setup, you'll be able to:
                </p>
                <ul style="color: #374151; font-size: 16px; line-height: 1.5;">
                  <li>Manage your class rosters</li>
                  <li>Monitor student dismissal</li>
                  <li>Access dismissal modes and reports</li>
                </ul>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.5;">
                  If you have any questions, please contact your school administrator.
                </p>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.5;">
                  Best regards,<br>
                  The ${school?.school_name || 'School'} Team
                </p>
                
                <hr style="margin-top: 30px; border: none; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 20px;">
                  If you didn't expect this invitation, you can safely ignore this email.<br>
                  This invitation will expire automatically in 24 hours.
                </p>
              </div>
            </div>
          `,
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