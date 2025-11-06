-- Create scheduler execution logs table for monitoring
CREATE TABLE IF NOT EXISTS public.scheduler_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_schools_processed INTEGER NOT NULL DEFAULT 0,
  successful_schools INTEGER NOT NULL DEFAULT 0,
  failed_schools INTEGER NOT NULL DEFAULT 0,
  execution_duration_ms INTEGER NOT NULL,
  errors JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('success', 'partial_failure', 'complete_failure')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for quick lookups of recent executions
CREATE INDEX IF NOT EXISTS idx_scheduler_execution_logs_execution_time 
ON public.scheduler_execution_logs(execution_time DESC);

-- Add unique constraint to prevent duplicate dismissal runs
ALTER TABLE public.dismissal_runs 
ADD CONSTRAINT unique_school_date_run UNIQUE (school_id, date);

-- Enable RLS on scheduler execution logs
ALTER TABLE public.scheduler_execution_logs ENABLE ROW LEVEL SECURITY;

-- System admins can view all execution logs
CREATE POLICY "System admins can view scheduler logs"
ON public.scheduler_execution_logs
FOR SELECT
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- School admins can view logs that affected their school
CREATE POLICY "School admins can view relevant scheduler logs"
ON public.scheduler_execution_logs
FOR SELECT
USING (
  has_role(auth.uid(), 'school_admin'::app_role) AND
  EXISTS (
    SELECT 1 FROM jsonb_array_elements(errors) AS error
    WHERE (error->>'school_id')::bigint = get_user_school_id(auth.uid())
  )
);