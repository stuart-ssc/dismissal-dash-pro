-- Create help_requests table for bug reports, support requests, and suggestions
CREATE TABLE IF NOT EXISTS public.help_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  school_id bigint REFERENCES public.schools(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('bug', 'support', 'suggestion')),
  subject text NOT NULL,
  description text NOT NULL,
  user_email text NOT NULL,
  user_name text NOT NULL,
  school_name text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own help requests
CREATE POLICY "Users can view own help requests"
  ON public.help_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own help requests
CREATE POLICY "Users can insert own help requests"
  ON public.help_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- System admins can view all help requests
CREATE POLICY "System admins can view all help requests"
  ON public.help_requests
  FOR SELECT
  USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Indexes for performance
CREATE INDEX idx_help_requests_user_id ON public.help_requests(user_id);
CREATE INDEX idx_help_requests_created_at ON public.help_requests(created_at DESC);
CREATE INDEX idx_help_requests_status ON public.help_requests(status);

-- Trigger to update updated_at
CREATE TRIGGER update_help_requests_updated_at
  BEFORE UPDATE ON public.help_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();