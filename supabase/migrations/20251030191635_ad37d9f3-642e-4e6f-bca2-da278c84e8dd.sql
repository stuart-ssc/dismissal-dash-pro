-- Create table for secure OAuth pending signups
CREATE TABLE public.oauth_pending_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_token text UNIQUE NOT NULL,
  school_id bigint REFERENCES public.schools(id),
  role app_role,
  email text,
  invitation_token text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '5 minutes'),
  completed boolean NOT NULL DEFAULT false
);

-- Enable RLS on oauth_pending_signups
ALTER TABLE public.oauth_pending_signups ENABLE ROW LEVEL SECURITY;

-- Only edge functions (service role) can access this table
-- No policies needed - all access via edge functions only

-- Create index for faster state token lookups
CREATE INDEX idx_oauth_state_token ON public.oauth_pending_signups(state_token) WHERE NOT completed;

-- Create index for cleanup job
CREATE INDEX idx_oauth_expires_at ON public.oauth_pending_signups(expires_at) WHERE NOT completed;

-- Function to cleanup expired OAuth pending signups
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_signups()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.oauth_pending_signups 
  WHERE expires_at < now() AND NOT completed;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;