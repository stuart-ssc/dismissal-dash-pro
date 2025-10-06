import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import React from 'npm:react@18.3.1';
import { ConfirmationEmail } from './_templates/confirmation-email.tsx';
import { MagicLinkEmail } from './_templates/magic-link-email.tsx';
import { PasswordResetEmail } from './_templates/password-reset-email.tsx';
import { EmailChangeEmail } from './_templates/email-change-email.tsx';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);
const hookSecret = Deno.env.get('AUTH_HOOK_SECRET') as string;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    const wh = new Webhook(hookSecret);
    
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = wh.verify(payload, headers) as {
      user: {
        email: string;
      };
      email_data: {
        token: string;
        token_hash: string;
        redirect_to: string;
        email_action_type: string;
        site_url: string;
      };
    };

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    let html: string;
    let subject: string;

    // Route to appropriate template based on email action type
    switch (email_action_type) {
      case 'signup':
        html = await renderAsync(
          React.createElement(ConfirmationEmail, {
            supabaseUrl,
            token,
            tokenHash: token_hash,
            redirectTo: redirect_to,
            emailActionType: email_action_type,
          })
        );
        subject = 'Welcome to Dismissal Pro - Confirm Your Email';
        break;

      case 'magiclink':
        html = await renderAsync(
          React.createElement(MagicLinkEmail, {
            supabaseUrl,
            token,
            tokenHash: token_hash,
            redirectTo: redirect_to,
            emailActionType: email_action_type,
          })
        );
        subject = 'Your Dismissal Pro Sign-In Link';
        break;

      case 'recovery':
        html = await renderAsync(
          React.createElement(PasswordResetEmail, {
            supabaseUrl,
            token,
            tokenHash: token_hash,
            redirectTo: redirect_to,
            emailActionType: email_action_type,
          })
        );
        subject = 'Reset Your Dismissal Pro Password';
        break;

      case 'email_change':
        html = await renderAsync(
          React.createElement(EmailChangeEmail, {
            supabaseUrl,
            token,
            tokenHash: token_hash,
            redirectTo: redirect_to,
            emailActionType: email_action_type,
          })
        );
        subject = 'Confirm Your Email Change';
        break;

      default:
        throw new Error(`Unsupported email action type: ${email_action_type}`);
    }

    const { error } = await resend.emails.send({
      from: 'Dismissal Pro <noreply@dismissalpro.io>',
      to: [user.email],
      subject,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    console.log(`Successfully sent ${email_action_type} email to ${user.email}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in send-auth-email function:', error);
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
