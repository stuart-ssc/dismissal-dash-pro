-- Create table for IC scheduler execution logs
CREATE TABLE IF NOT EXISTS public.ic_scheduler_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_schools_processed INTEGER NOT NULL DEFAULT 0,
  successful_schools INTEGER NOT NULL DEFAULT 0,
  failed_schools INTEGER NOT NULL DEFAULT 0,
  skipped_schools INTEGER NOT NULL DEFAULT 0,
  execution_duration_ms INTEGER NOT NULL,
  errors JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('success', 'partial_failure', 'complete_failure')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for querying recent logs
CREATE INDEX idx_ic_scheduler_logs_created_at ON public.ic_scheduler_execution_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.ic_scheduler_execution_logs ENABLE ROW LEVEL SECURITY;

-- Policy: System admins can view all logs
CREATE POLICY "System admins can view IC scheduler logs"
  ON public.ic_scheduler_execution_logs
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Add helpful comment
COMMENT ON TABLE public.ic_scheduler_execution_logs IS 'Logs for automated IC sync scheduler executions';
