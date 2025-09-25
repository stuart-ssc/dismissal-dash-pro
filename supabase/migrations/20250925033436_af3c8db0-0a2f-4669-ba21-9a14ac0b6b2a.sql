-- Create email change requests table for secure email management
CREATE TABLE public.email_change_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_email TEXT NOT NULL,
  new_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  verification_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  request_ip TEXT,
  user_agent TEXT,
  reason TEXT,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.email_change_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "system_admin_all_access" ON public.email_change_requests
  FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "school_admin_school_access" ON public.email_change_requests
  FOR ALL USING (
    has_role(auth.uid(), 'school_admin'::app_role) AND 
    EXISTS (
      SELECT 1 FROM profiles p1, profiles p2 
      WHERE p1.id = auth.uid() 
        AND p2.id = email_change_requests.user_id 
        AND p1.school_id = p2.school_id
        AND p1.school_id IS NOT NULL
    )
  );

CREATE POLICY "users_own_requests" ON public.email_change_requests
  FOR SELECT USING (user_id = auth.uid() OR requested_by = auth.uid());

-- Create updated_at trigger
CREATE TRIGGER update_email_change_requests_updated_at
  BEFORE UPDATE ON public.email_change_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_email_change_requests_user_id ON public.email_change_requests(user_id);
CREATE INDEX idx_email_change_requests_status ON public.email_change_requests(status);
CREATE INDEX idx_email_change_requests_expires_at ON public.email_change_requests(expires_at);

-- Enhanced audit logging function for email changes
CREATE OR REPLACE FUNCTION public.log_email_change_request()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    action,
    user_id,
    details
  ) VALUES (
    'email_change_requests',
    COALESCE(NEW.id, OLD.id),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'EMAIL_CHANGE_REQUESTED'
      WHEN TG_OP = 'UPDATE' THEN 'EMAIL_CHANGE_UPDATED'
      WHEN TG_OP = 'DELETE' THEN 'EMAIL_CHANGE_DELETED'
    END,
    auth.uid(),
    jsonb_build_object(
      'old_email', COALESCE(NEW.old_email, OLD.old_email),
      'new_email', COALESCE(NEW.new_email, OLD.new_email),
      'status', COALESCE(NEW.status, OLD.status),
      'user_id', COALESCE(NEW.user_id, OLD.user_id),
      'requested_by', COALESCE(NEW.requested_by, OLD.requested_by),
      'approved_by', COALESCE(NEW.approved_by, OLD.approved_by),
      'request_ip', COALESCE(NEW.request_ip, OLD.request_ip)
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for email change audit logging
CREATE TRIGGER email_change_requests_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.email_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_email_change_request();

-- Function to clean up expired email change requests
CREATE OR REPLACE FUNCTION public.cleanup_expired_email_requests()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.email_change_requests 
  WHERE status = 'pending' AND expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log cleanup
  IF deleted_count > 0 THEN
    INSERT INTO public.audit_logs (
      table_name,
      action,
      user_id,
      details
    ) VALUES (
      'email_change_requests',
      'CLEANUP_EXPIRED_REQUESTS',
      NULL,
      jsonb_build_object('expired_requests_deleted', deleted_count)
    );
  END IF;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;