-- Create table for server-side impersonation sessions
CREATE TABLE public.admin_impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  impersonated_school_id bigint NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '1 hour'),
  ip_address text,
  user_agent text
);

-- Enable RLS on impersonation sessions (only accessible via service role)
ALTER TABLE public.admin_impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- Create indexes for fast lookups
CREATE INDEX idx_impersonation_admin_user ON public.admin_impersonation_sessions(admin_user_id, expires_at DESC);
CREATE INDEX idx_impersonation_expires ON public.admin_impersonation_sessions(expires_at);

-- Security definer function to get current impersonated school ID
CREATE OR REPLACE FUNCTION public.get_impersonated_school_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT impersonated_school_id 
  FROM public.admin_impersonation_sessions
  WHERE admin_user_id = auth.uid()
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- Update can_view_school_data to check impersonation first
CREATE OR REPLACE FUNCTION public.can_view_school_data(target_school_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(auth.uid(), 'system_admin'::app_role) AND (
      -- System admin viewing their actual school OR impersonating
      get_user_school_id(auth.uid()) = target_school_id OR
      get_impersonated_school_id() = target_school_id OR
      -- System admin can view any school when not impersonating
      get_impersonated_school_id() IS NULL
    )
    OR
    -- Regular school users see their own school only
    (NOT has_role(auth.uid(), 'system_admin'::app_role) AND get_user_school_id(auth.uid()) = target_school_id)
$$;

-- Update can_manage_school_data to check impersonation
CREATE OR REPLACE FUNCTION public.can_manage_school_data(target_school_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(auth.uid(), 'system_admin'::app_role) AND (
      -- System admin managing their actual school OR the impersonated school
      get_user_school_id(auth.uid()) = target_school_id OR
      get_impersonated_school_id() = target_school_id
    )
    OR
    -- School admins manage their own school only
    (has_role(auth.uid(), 'school_admin'::app_role) AND get_user_school_id(auth.uid()) = target_school_id)
$$;

-- Function to cleanup expired impersonation sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_impersonation_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.admin_impersonation_sessions 
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log cleanup
  IF deleted_count > 0 THEN
    INSERT INTO public.audit_logs (
      table_name,
      action,
      user_id,
      details
    ) VALUES (
      'admin_impersonation_sessions',
      'CLEANUP_EXPIRED_SESSIONS',
      NULL,
      jsonb_build_object('expired_sessions_deleted', deleted_count)
    );
  END IF;
  
  RETURN deleted_count;
END;
$$;