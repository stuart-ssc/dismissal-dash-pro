-- Create mode_sessions table to track teacher mode usage
CREATE TABLE public.mode_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  school_id bigint NOT NULL,
  dismissal_run_id uuid,
  mode_type text NOT NULL CHECK (mode_type IN ('classroom', 'bus', 'car_line', 'walker')),
  location_id uuid, -- For walker_location_id or car_line_id
  location_name text, -- Human readable location name
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  session_duration_seconds integer GENERATED ALWAYS AS (
    CASE 
      WHEN ended_at IS NOT NULL THEN EXTRACT(EPOCH FROM (ended_at - started_at))::integer
      ELSE NULL
    END
  ) STORED,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mode_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for school-level access
CREATE POLICY "mode_sessions_school_users" 
ON public.mode_sessions 
FOR ALL 
USING (can_view_school_data(school_id))
WITH CHECK (can_manage_school_data(school_id));

CREATE POLICY "mode_sessions_system_admin" 
ON public.mode_sessions 
FOR ALL 
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Create indexes for better query performance
CREATE INDEX idx_mode_sessions_user_id ON public.mode_sessions(user_id);
CREATE INDEX idx_mode_sessions_school_id ON public.mode_sessions(school_id);
CREATE INDEX idx_mode_sessions_dismissal_run_id ON public.mode_sessions(dismissal_run_id);
CREATE INDEX idx_mode_sessions_mode_type ON public.mode_sessions(mode_type);
CREATE INDEX idx_mode_sessions_started_at ON public.mode_sessions(started_at);

-- Create trigger for updated_at
CREATE TRIGGER update_mode_sessions_updated_at
  BEFORE UPDATE ON public.mode_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();