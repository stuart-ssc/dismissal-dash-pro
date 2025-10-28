import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from 'npm:resend@4.0.0';
import { createErrorResponse } from '../_shared/errorHandler.ts';
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { EmailVerification } from '../_shared/email-templates/email-verification.tsx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailChangeRequest {
  userId: string;
  newEmail: string;
  reason?: string;
  requestType: 'completed_account' | 'pending_teacher';
}

interface EmailChangeVerification {
  requestId: string;
  verificationToken: string;
}

interface EmailChangeApproval {
  requestId: string;
  action: 'approve' | 'reject';
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    
    // Verify endpoint doesn't require authentication (uses token from email)
    if (path === 'verify') {
      return await handleEmailVerification(req, supabase, null);
    }
    
    // All other endpoints require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const currentUser = userData.user;
    
    // Check user permissions
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id);

    if (roleError) {
      console.error('Error fetching user roles:', roleError);
      return new Response(JSON.stringify({ error: 'Permission check failed' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const roles = userRoles?.map(r => r.role) || [];
    const isSystemAdmin = roles.includes('system_admin');
    const isSchoolAdmin = roles.includes('school_admin');

    if (!isSystemAdmin && !isSchoolAdmin) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle different endpoints
    switch (path) {
      case 'request':
        return await handleEmailChangeRequest(req, supabase, currentUser, isSystemAdmin, isSchoolAdmin);
      case 'approve':
        return await handleEmailChangeApproval(req, supabase, currentUser, isSystemAdmin, isSchoolAdmin);
      case 'list':
        return await handleListRequests(req, supabase, currentUser, isSystemAdmin, isSchoolAdmin);
      default:
        return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    return createErrorResponse(error, 'secure-email-change', 500, corsHeaders);
  }
};

async function handleEmailChangeRequest(
  req: Request, 
  supabase: any, 
  currentUser: any,
  isSystemAdmin: boolean,
  isSchoolAdmin: boolean
): Promise<Response> {
  const { userId, newEmail, reason, requestType }: EmailChangeRequest = await req.json();

  // Validate required fields
  if (!userId || !newEmail || !requestType) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    return new Response(JSON.stringify({ error: 'Invalid email format' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if user can manage this target user
  if (!isSystemAdmin) {
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', userId)
      .single();

    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', currentUser.id)
      .single();

    if (!targetProfile || !requesterProfile || 
        targetProfile.school_id !== requesterProfile.school_id) {
      return new Response(JSON.stringify({ error: 'Cannot manage user from different school' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // Get current email
  const { data: currentEmailData, error: emailError } = await supabase.auth.admin.getUserById(userId);
  if (emailError || !currentEmailData.user) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const oldEmail = currentEmailData.user.email;
  if (oldEmail === newEmail) {
    return new Response(JSON.stringify({ error: 'New email must be different from current email' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check for pending requests
  const { data: existingRequests } = await supabase
    .from('email_change_requests')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'pending');

  if (existingRequests && existingRequests.length > 0) {
    return new Response(JSON.stringify({ error: 'User already has a pending email change request' }), {
      status: 409,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Generate verification token
  const verificationToken = crypto.randomUUID();
  const requestIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  // Create email change request
  const { data: request, error: insertError } = await supabase
    .from('email_change_requests')
    .insert({
      user_id: userId,
      old_email: oldEmail,
      new_email: newEmail,
      requested_by: currentUser.id,
      verification_token: verificationToken,
      request_ip: requestIp,
      user_agent: userAgent,
      reason: reason || null
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error creating email change request:', insertError);
    return new Response(JSON.stringify({ error: 'Failed to create request' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Handle different request types
  let response: any = { requestId: request.id, status: 'pending' };

  if (requestType === 'completed_account') {
    // For completed accounts, send verification email to new address
    await sendVerificationEmail(newEmail, verificationToken, request.id);
    response.message = 'Verification email sent to new address';
  } else if (requestType === 'pending_teacher') {
    // For pending teachers, update teacher record and send new invitation
    await handlePendingTeacherEmailChange(supabase, userId, newEmail, oldEmail);
    response.message = 'Teacher email updated and new invitation sent';
    response.status = 'completed';
    
    // Mark request as approved since it's handled immediately
    await supabase
      .from('email_change_requests')
      .update({ 
        status: 'approved', 
        approved_by: currentUser.id 
      })
      .eq('id', request.id);
  }

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleEmailVerification(
  req: Request, 
  supabase: any, 
  currentUser: any
): Promise<Response> {
  // POST-only for security - no URL parameters
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                   req.headers.get('x-real-ip') ||
                   'unknown';
  
  let verificationToken: string;
  
  try {
    const body = await req.json();
    verificationToken = body.token;
  } catch {
    return new Response(JSON.stringify({ 
      error: 'Invalid request body',
      code: 'INVALID_REQUEST'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!verificationToken) {
    return new Response(JSON.stringify({ 
      error: 'Verification token required in request body',
      code: 'MISSING_TOKEN'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Find and validate request by token
  const { data: request, error: requestError } = await supabase
    .from('email_change_requests')
    .select('*')
    .eq('verification_token', verificationToken)
    .eq('status', 'pending')
    .single();

  if (requestError || !request) {
    console.warn(`Failed verification attempt from IP ${clientIp}: Invalid token`);
    return new Response(JSON.stringify({ error: 'Invalid or expired verification token' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Rate limiting: Check verification attempts
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 3600000);
  
  // Check if there have been too many recent attempts
  if (request.verification_attempts >= 5) {
    const lastAttempt = request.last_verification_attempt_at 
      ? new Date(request.last_verification_attempt_at)
      : null;
    
    if (lastAttempt && lastAttempt > oneHourAgo) {
      console.warn(`Rate limit exceeded for verification token from IP ${clientIp}`);
      
      return new Response(
        JSON.stringify({ 
          error: 'Too many verification attempts. Please try again in 1 hour.' 
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Reset counter if more than 1 hour has passed
    await supabase
      .from('email_change_requests')
      .update({ 
        verification_attempts: 0,
        last_verification_attempt_at: now.toISOString()
      })
      .eq('id', request.id);
  }

  // Progressive delay based on attempts
  const delays = [0, 2000, 5000, 10000, 20000]; // milliseconds
  const delayMs = delays[Math.min(request.verification_attempts || 0, delays.length - 1)];
  
  if (delayMs > 0) {
    console.info(`Applying ${delayMs}ms delay for verification attempt ${request.verification_attempts + 1}`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  // Check if expired
  if (new Date(request.expires_at) < now) {
    // Increment failed attempt counter
    await supabase
      .from('email_change_requests')
      .update({ 
        status: 'expired',
        verification_attempts: (request.verification_attempts || 0) + 1,
        last_verification_attempt_at: now.toISOString()
      })
      .eq('id', request.id);

    console.warn(`Expired token verification attempt from IP ${clientIp}`);

    return new Response(JSON.stringify({ error: 'Verification token has expired' }), {
      status: 410,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Update user email via Admin API
  const { error: updateError } = await supabase.auth.admin.updateUserById(request.user_id, {
    email: request.new_email
  });

  if (updateError) {
    console.error('Error updating user email:', updateError);
    
    // Increment failed attempt counter
    await supabase
      .from('email_change_requests')
      .update({ 
        verification_attempts: (request.verification_attempts || 0) + 1,
        last_verification_attempt_at: now.toISOString()
      })
      .eq('id', request.id);
    
    return new Response(JSON.stringify({ error: 'Failed to update email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Update profile email
  await supabase
    .from('profiles')
    .update({ email: request.new_email })
    .eq('id', request.user_id);

  // Update teacher email if applicable
  await supabase
    .from('teachers')
    .update({ email: request.new_email })
    .eq('id', request.user_id);

  // Mark request as approved and reset attempt counter
  await supabase
    .from('email_change_requests')
    .update({ 
      status: 'approved',
      approved_by: request.user_id, // Self-approved via verification
      verification_attempts: 0, // Reset on success
      last_verification_attempt_at: now.toISOString()
    })
    .eq('id', request.id);

  // Log successful verification
  console.info(`Successful email verification from IP ${clientIp} for user ${request.user_id}`);

  return new Response(JSON.stringify({ 
    message: 'Email successfully updated',
    newEmail: request.new_email 
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleEmailChangeApproval(
  req: Request, 
  supabase: any, 
  currentUser: any,
  isSystemAdmin: boolean,
  isSchoolAdmin: boolean
): Promise<Response> {
  const { requestId, action, notes }: EmailChangeApproval = await req.json();

  const { data: request, error: requestError } = await supabase
    .from('email_change_requests')
    .select('*')
    .eq('id', requestId)
    .eq('status', 'pending')
    .single();

  if (requestError || !request) {
    return new Response(JSON.stringify({ error: 'Request not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check permissions
  if (!isSystemAdmin) {
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', request.user_id)
      .single();

    const { data: approverProfile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', currentUser.id)
      .single();

    if (!targetProfile || !approverProfile || 
        targetProfile.school_id !== approverProfile.school_id) {
      return new Response(JSON.stringify({ error: 'Cannot approve request for different school' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  
  // Update request status
  await supabase
    .from('email_change_requests')
    .update({ 
      status: newStatus,
      approved_by: currentUser.id,
      notes: notes || null
    })
    .eq('id', requestId);

  if (action === 'approve') {
    // Perform the actual email change
    const { error: updateError } = await supabase.auth.admin.updateUserById(request.user_id, {
      email: request.new_email
    });

    if (!updateError) {
      // Update profile and teacher records
      await supabase
        .from('profiles')
        .update({ email: request.new_email })
        .eq('id', request.user_id);

      await supabase
        .from('teachers')
        .update({ email: request.new_email })
        .eq('id', request.user_id);
    }
  }

  return new Response(JSON.stringify({ 
    message: `Request ${action}d successfully`,
    status: newStatus 
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleListRequests(
  req: Request, 
  supabase: any, 
  currentUser: any,
  isSystemAdmin: boolean,
  isSchoolAdmin: boolean
): Promise<Response> {
  const url = new URL(req.url);
  const status = url.searchParams.get('status') || 'pending';

  let query = supabase
    .from('email_change_requests')
    .select(`
      *,
      requester:requested_by(first_name, last_name, email),
      approver:approved_by(first_name, last_name, email),
      target_user:user_id(first_name, last_name, email)
    `)
    .eq('status', status)
    .order('created_at', { ascending: false });

  // Apply school filtering for school admins
  if (!isSystemAdmin && isSchoolAdmin) {
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', currentUser.id)
      .single();

    if (adminProfile?.school_id) {
      // Filter to same school users only
      const { data: schoolUsers } = await supabase
        .from('profiles')
        .select('id')
        .eq('school_id', adminProfile.school_id);

      const userIds = schoolUsers?.map((u: any) => u.id) || [];
      query = query.in('user_id', userIds);
    }
  }

  const { data: requests, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch requests' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ requests }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sendVerificationEmail(email: string, token: string, requestId: string) {
  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
  
  const verificationUrl = `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '')}/verify-email-change?token=${token}`;
  
  try {
    // Render React Email template
    const html = await renderAsync(
      React.createElement(EmailVerification, {
        verificationUrl,
        requestId,
      })
    );

    await resend.emails.send({
      from: 'Dismissal Pro <noreply@dismissalpro.io>',
      to: [email],
      subject: 'Verify Your Email Change',
      html,
    });
    
    console.log('Verification email sent successfully to:', email);
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

async function handlePendingTeacherEmailChange(
  supabase: any, 
  teacherId: string, 
  newEmail: string, 
  oldEmail: string
) {
  // Update teacher record
  await supabase
    .from('teachers')
    .update({ 
      email: newEmail,
      invitation_status: 'pending',
      invitation_sent_at: new Date().toISOString()
    })
    .eq('id', teacherId);

  // Send new invitation email via existing function
  try {
    await supabase.functions.invoke('invite-teacher-unified', {
      body: {
        teachers: [{
          email: newEmail,
          firstName: '', // Will be populated by the function
          lastName: ''
        }],
        schoolId: null // Will be determined by the function
      }
    });
  } catch (error) {
    console.error('Failed to send new teacher invitation:', error);
  }
}

serve(handler);