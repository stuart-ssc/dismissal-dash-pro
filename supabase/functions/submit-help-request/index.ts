import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface HelpRequest {
  request_type: 'bug' | 'support' | 'suggestion';
  subject: string;
  description: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { request_type, subject, description }: HelpRequest = await req.json();

    // Validate input
    if (!request_type || !['bug', 'support', 'suggestion'].includes(request_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subject || subject.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Subject is required and must be less than 200 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!description || description.length < 10 || description.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Description must be between 10 and 2000 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile and school info
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, email, school_id, schools(school_name)')
      .eq('id', user.id)
      .single();

    const userName = profile 
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown User'
      : 'Unknown User';
    const userEmail = profile?.email || user.email || 'No email';
    const schoolId = profile?.school_id || null;
    const schoolName = profile?.schools?.school_name || 'No school assigned';

    // Insert help request into database
    const { data: helpRequest, error: insertError } = await supabaseClient
      .from('help_requests')
      .insert({
        user_id: user.id,
        school_id: schoolId,
        request_type,
        subject,
        description,
        user_email: userEmail,
        user_name: userName,
        school_name: schoolName,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting help request:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save help request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare email
    const typeLabels = {
      bug: { label: 'Bug Report', emoji: '🐛', color: '#EF4444' },
      support: { label: 'Support Request', emoji: '🆘', color: '#3B82F6' },
      suggestion: { label: 'Suggestion', emoji: '💡', color: '#10B981' },
    };

    const typeInfo = typeLabels[request_type];
    const timestamp = new Date().toLocaleString('en-US', { 
      timeZone: 'America/New_York',
      dateStyle: 'long',
      timeStyle: 'short'
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .badge { display: inline-block; background: ${typeInfo.color}; color: white; padding: 6px 12px; border-radius: 4px; font-weight: 600; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .section { margin-bottom: 24px; }
            .label { font-weight: 600; color: #4b5563; margin-bottom: 8px; }
            .value { background: white; padding: 12px; border-radius: 4px; border: 1px solid #e5e7eb; }
            .description { white-space: pre-wrap; }
            .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 14px; border-radius: 0 0 8px 8px; }
            .divider { border-top: 2px solid #e5e7eb; margin: 24px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">${typeInfo.emoji} New Help Request Received</h1>
            </div>
            <div class="content">
              <div class="section">
                <span class="badge">${typeInfo.label}</span>
              </div>
              
              <div class="section">
                <div class="label">Subject</div>
                <div class="value">${subject}</div>
              </div>
              
              <div class="section">
                <div class="label">Description</div>
                <div class="value description">${description}</div>
              </div>
              
              <div class="divider"></div>
              
              <div class="section">
                <div class="label">Submitted By</div>
                <div class="value">${userName} (${userEmail})</div>
              </div>
              
              <div class="section">
                <div class="label">School</div>
                <div class="value">${schoolName}${schoolId ? ` (ID: ${schoolId})` : ''}</div>
              </div>
              
              <div class="section">
                <div class="label">Date & Time</div>
                <div class="value">${timestamp} EST</div>
              </div>
              
              <div class="section">
                <div class="label">Request ID</div>
                <div class="value" style="font-family: monospace; font-size: 12px;">${helpRequest.id}</div>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 0;">Dismissal Pro - Help Request System</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email (non-blocking - don't fail if email fails)
    try {
      await resend.emails.send({
        from: 'Dismissal Pro Support <support@dismissalpro.io>',
        to: ['stuart@dismissalpro.io'],
        subject: `[${typeInfo.label.toUpperCase()}] ${subject} - ${schoolName}`,
        html: emailHtml,
      });
      console.log('Email sent successfully');
    } catch (emailError) {
      console.error('Error sending email (non-blocking):', emailError);
      // Continue - request was saved to database
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Help request submitted successfully',
        id: helpRequest.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in submit-help-request:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
