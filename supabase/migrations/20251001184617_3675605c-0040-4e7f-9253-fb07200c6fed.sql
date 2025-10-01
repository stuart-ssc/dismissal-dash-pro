-- Add testing_mode field to dismissal_runs table
ALTER TABLE public.dismissal_runs 
ADD COLUMN testing_mode boolean DEFAULT false;

-- Add index for faster queries
CREATE INDEX idx_dismissal_runs_testing_mode ON public.dismissal_runs(testing_mode);

COMMENT ON COLUMN public.dismissal_runs.testing_mode IS 'When true, auto-timeout logic is disabled for testing purposes';