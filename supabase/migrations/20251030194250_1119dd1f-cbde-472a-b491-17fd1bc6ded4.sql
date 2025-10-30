-- Add RLS policies for admin_impersonation_sessions table
CREATE POLICY "System admins can view their own impersonation sessions"
ON admin_impersonation_sessions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'system_admin'::app_role) 
  AND admin_user_id = auth.uid()
);

COMMENT ON TABLE admin_impersonation_sessions IS 
'Stores active admin impersonation sessions. INSERT/UPDATE/DELETE operations are restricted to edge functions using service role. Users with system_admin role can SELECT their own sessions for transparency.';

-- Add RLS policies for oauth_pending_signups table
CREATE POLICY "System admins can audit OAuth signups"
ON oauth_pending_signups
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'system_admin'::app_role));

COMMENT ON TABLE oauth_pending_signups IS 
'Stores temporary OAuth signup state tokens with 5-minute expiry. This table is designed for service-role access only via edge functions. Direct user access is intentionally blocked for regular users. System admins can SELECT for audit purposes.';