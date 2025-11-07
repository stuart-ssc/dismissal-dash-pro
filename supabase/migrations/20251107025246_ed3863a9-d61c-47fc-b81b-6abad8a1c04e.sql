-- Fix Critical Security Issue: Enable RLS on app_secrets table
-- This table stores sensitive API keys and secrets and MUST be protected

ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

-- Only service_role (backend edge functions) can access secrets
CREATE POLICY "service_role_only_access"
ON public.app_secrets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Explicitly deny all authenticated and anonymous users
CREATE POLICY "deny_authenticated_access"
ON public.app_secrets
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "deny_anon_access"
ON public.app_secrets
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Add audit comment
COMMENT ON TABLE public.app_secrets IS 'Stores sensitive secrets. Only accessible via service_role in edge functions. RLS enabled for security.';