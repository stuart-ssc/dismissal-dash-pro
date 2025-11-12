-- Create year_end_rollover_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.year_end_rollover_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  performed_by UUID NOT NULL,
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Session information
  archived_session_id UUID REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  archived_session_name TEXT NOT NULL,
  new_session_id UUID REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  new_session_name TEXT NOT NULL,
  
  -- Migration statistics
  groups_migrated INTEGER DEFAULT 0,
  groups_selected INTEGER DEFAULT 0,
  groups_available INTEGER DEFAULT 0,
  
  -- Validation results
  validation_passed BOOLEAN NOT NULL DEFAULT true,
  validation_warnings JSONB DEFAULT '[]'::jsonb,
  validation_errors JSONB DEFAULT '[]'::jsonb,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.year_end_rollover_logs ENABLE ROW LEVEL SECURITY;

-- School admins can view their school's rollover logs
CREATE POLICY "School admins can view their rollover logs"
ON public.year_end_rollover_logs
FOR SELECT
USING (can_view_school_data(school_id));

-- System admins can view all rollover logs
CREATE POLICY "System admins can view all rollover logs"
ON public.year_end_rollover_logs
FOR SELECT
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Service role can insert rollover logs
CREATE POLICY "Service role can insert rollover logs"
ON public.year_end_rollover_logs
FOR INSERT
WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX idx_year_end_rollover_logs_school_id ON public.year_end_rollover_logs(school_id);
CREATE INDEX idx_year_end_rollover_logs_performed_at ON public.year_end_rollover_logs(performed_at DESC);