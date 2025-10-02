# Resend Email Configuration Guide

This guide covers the complete setup of Resend for all email types in your Dismissal Pro application.

## Overview

Your application now supports three types of email workflows:
1. **Teacher Invitations** ✅ Already working with Resend
2. **Email Change Verification** ✅ Implemented with custom templates
3. **Authentication Emails** 🔧 Requires Supabase dashboard configuration

---

## Phase 1: Configure Supabase Auth SMTP (Required)

To route all authentication emails (signup, password reset, magic links) through your Resend account:

### Step 1: Access Supabase Dashboard SMTP Settings

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/lwbmtirzntexaxdlhgsk
2. Navigate to **Authentication** → **Settings** → **SMTP Settings**
3. Click **Enable Custom SMTP**

### Step 2: Configure Resend as SMTP Provider

Enter the following values:

| Field | Value |
|-------|-------|
| **SMTP Host** | `smtp.resend.com` |
| **SMTP Port** | `465` (SSL) or `587` (TLS recommended) |
| **SMTP Username** | `resend` |
| **SMTP Password** | Your Resend API key |
| **Sender Email** | Your verified email (e.g., `noreply@yourdomain.com`) |
| **Sender Name** | `Dismissal Pro` or your school name |

**Important Notes:**
- Use port `587` with TLS for better compatibility
- The sender email must be verified in your Resend account
- For production, use a custom domain email (not `@resend.dev`)

### Step 3: Verify Domain in Resend (Recommended for Production)

1. Go to https://resend.com/domains
2. Click **Add Domain**
3. Add your school's domain (e.g., `yourschool.edu`)
4. Follow the DNS configuration instructions to verify ownership
5. Once verified, update the Sender Email in Supabase to use your domain

### Step 4: Customize Email Templates

In Supabase Dashboard:
1. Go to **Authentication** → **Email Templates**
2. Customize each template to match your branding:
   - **Confirmation Email** (signup)
   - **Magic Link Email**
   - **Password Reset Email**
   - **Email Change Confirmation**

**Template Tips:**
- Use your school colors and logo
- Keep subject lines clear and under 50 characters
- Include helpful support contact information
- Test templates by triggering each email type

---

## Phase 2: Auth Webhook Setup (Optional - Advanced)

For full control over auth email templates using React Email components:

### Step 1: Set Up Webhook Secret

```bash
# Generate a secure random secret
openssl rand -base64 32

# Add to Supabase secrets
# Go to: Settings → Edge Functions → Secrets
# Add: AUTH_HOOK_SECRET = <your-generated-secret>
```

### Step 2: Configure Auth Hook in Supabase

1. Go to **Authentication** → **Hooks**
2. Enable **Send Email Hook**
3. Configure the hook:
   - **URL:** `https://lwbmtirzntexaxdlhgsk.supabase.co/functions/v1/send-auth-email`
   - **Secret:** The `AUTH_HOOK_SECRET` you created
   - **Events:** Select all (signup, recovery, magic_link, email_change)

### Step 3: Test the Webhook

Trigger each email type and verify they're sent via Resend:
- **Signup:** Create a new test account
- **Password Reset:** Click "Forgot Password"
- **Magic Link:** Try passwordless login
- **Email Change:** Request an email change

Check Resend dashboard for delivery logs: https://resend.com/emails

---

## Phase 3: Email Change Verification

**Status:** ✅ Already implemented

Email change verification is now fully functional with:
- Branded HTML email templates matching your app design
- Secure token-based verification
- Automatic email updates across all tables (auth, profiles, teachers)
- Frontend verification page at `/verify-email-change`

**How it works:**
1. Admin requests email change for a user
2. Verification email sent to new address
3. User clicks link in email
4. Email automatically updated after verification

---

## Testing Checklist

Before going to production, test each email type:

### Teacher Invitations
- [ ] Send invitation to a new teacher
- [ ] Verify email received and formatted correctly
- [ ] Test invitation link works

### Email Change Verification
- [ ] Request email change for a test user
- [ ] Check verification email received
- [ ] Click verification link
- [ ] Confirm email updated in database

### Authentication Emails (via SMTP or Webhook)
- [ ] Sign up new account → Confirmation email
- [ ] Request password reset → Reset email
- [ ] Use magic link login → Magic link email
- [ ] Request email change → Change confirmation email

### Email Deliverability
- [ ] Check spam folder
- [ ] Verify SPF/DKIM records for custom domain
- [ ] Test on multiple email providers (Gmail, Outlook, etc.)

---

## Monitoring and Troubleshooting

### View Email Logs

**Resend Dashboard:**
- https://resend.com/emails
- Shows delivery status, opens, clicks, bounces

**Supabase Edge Function Logs:**
- https://supabase.com/dashboard/project/lwbmtirzntexaxdlhgsk/functions/send-auth-email/logs
- Shows function invocations and errors

### Common Issues

**Emails not sending:**
1. Verify Resend API key is correct
2. Check sender email is verified in Resend
3. Review edge function logs for errors
4. Ensure SMTP settings are correct

**Emails going to spam:**
1. Add SPF, DKIM, and DMARC records
2. Use verified custom domain
3. Avoid spam trigger words in subject/body
4. Maintain good sender reputation

**Template not rendering:**
1. Check HTML is valid
2. Test with email preview tools
3. Verify all variables are passed correctly
4. Use inline CSS for better compatibility

---

## Production Readiness

Before deploying to production:

1. **Domain Verification**
   - [ ] Custom domain added and verified in Resend
   - [ ] DNS records configured (SPF, DKIM, DMARC)
   - [ ] Update all sender emails to use custom domain

2. **Email Templates**
   - [ ] All templates customized with school branding
   - [ ] Templates tested across email clients
   - [ ] Links verified to point to production URLs

3. **Rate Limits**
   - [ ] Understand Resend plan limits
   - [ ] Implement rate limiting if needed
   - [ ] Set up monitoring for quota usage

4. **Security**
   - [ ] AUTH_HOOK_SECRET is secure and stored as secret
   - [ ] RESEND_API_KEY is secure and stored as secret
   - [ ] Webhook signature verification enabled

5. **Monitoring**
   - [ ] Set up Resend webhook for delivery events
   - [ ] Configure alerts for bounce/complaint rates
   - [ ] Regular review of edge function logs

---

## Support

### Resend Documentation
- Main docs: https://resend.com/docs
- SMTP guide: https://resend.com/docs/send-with-smtp
- React Email: https://react.email/docs

### Supabase Documentation
- Auth SMTP: https://supabase.com/docs/guides/auth/auth-smtp
- Auth Hooks: https://supabase.com/docs/guides/auth/auth-hooks
- Edge Functions: https://supabase.com/docs/guides/functions

### Need Help?
- Resend Support: support@resend.com
- Supabase Support: https://supabase.com/dashboard/support
