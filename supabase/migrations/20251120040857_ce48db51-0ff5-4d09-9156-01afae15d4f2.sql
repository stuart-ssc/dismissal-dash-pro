-- Create district_impersonation_sessions table for district admin impersonation
CREATE TABLE IF NOT EXISTS public.district_impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_admin_user_id uuid NOT NULL,
  impersonated_school_id bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  ip_address text,
  user_agent text
);

-- Add foreign key constraints
ALTER TABLE public.district_impersonation_sessions
  ADD CONSTRAINT district_impersonation_sessions_district_admin_user_id_fkey
  FOREIGN KEY (district_admin_user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

ALTER TABLE public.district_impersonation_sessions
  ADD CONSTRAINT district_impersonation_sessions_impersonated_school_id_fkey
  FOREIGN KEY (impersonated_school_id)
  REFERENCES public.schools(id)
  ON DELETE CASCADE;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_district_impersonation_sessions_admin_expires
  ON public.district_impersonation_sessions(district_admin_user_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_district_impersonation_sessions_expires
  ON public.district_impersonation_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_district_impersonation_sessions_school
  ON public.district_impersonation_sessions(impersonated_school_id);

-- Enable Row Level Security
ALTER TABLE public.district_impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: District admins can view their own impersonation sessions
CREATE POLICY "District admins can view their own impersonation sessions"
  ON public.district_impersonation_sessions
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'district_admin'::app_role) 
    AND district_admin_user_id = auth.uid()
  );

-- RLS Policy: District admins can insert their own impersonation sessions
CREATE POLICY "District admins can insert their own impersonation sessions"
  ON public.district_impersonation_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'district_admin'::app_role) 
    AND district_admin_user_id = auth.uid()
  );

-- RLS Policy: District admins can delete their own impersonation sessions
CREATE POLICY "District admins can delete their own impersonation sessions"
  ON public.district_impersonation_sessions
  FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'district_admin'::app_role) 
    AND district_admin_user_id = auth.uid()
  );

-- Create audit log trigger for district impersonation sessions
CREATE OR REPLACE FUNCTION public.log_district_impersonation_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      table_name,
      record_id,
      action,
      user_id,
      details
    ) VALUES (
      'district_impersonation_sessions',
      NEW.id,
      'DISTRICT_IMPERSONATION_STARTED',
      NEW.district_admin_user_id,
      jsonb_build_object(
        'impersonated_school_id', NEW.impersonated_school_id,
        'expires_at', NEW.expires_at,
        'ip_address', NEW.ip_address,
        'user_agent', NEW.user_agent
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      table_name,
      record_id,
      action,
      user_id,
      details
    ) VALUES (
      'district_impersonation_sessions',
      OLD.id,
      'DISTRICT_IMPERSONATION_ENDED',
      OLD.district_admin_user_id,
      jsonb_build_object(
        'impersonated_school_id', OLD.impersonated_school_id,
        'duration_minutes', EXTRACT(EPOCH FROM (now() - OLD.created_at)) / 60
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on district_impersonation_sessions
DROP TRIGGER IF EXISTS district_impersonation_sessions_audit_trigger ON public.district_impersonation_sessions;
CREATE TRIGGER district_impersonation_sessions_audit_trigger
  AFTER INSERT OR DELETE ON public.district_impersonation_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_district_impersonation_session();

-- Add comment to table
COMMENT ON TABLE public.district_impersonation_sessions IS 'Tracks active district admin impersonation sessions for school access';