-- Add academic_session_id to special_use_groups table
ALTER TABLE public.special_use_groups
ADD COLUMN academic_session_id uuid REFERENCES public.academic_sessions(id);

-- Add academic_session_id to special_use_runs table
ALTER TABLE public.special_use_runs
ADD COLUMN academic_session_id uuid REFERENCES public.academic_sessions(id);

-- Create indexes for better query performance
CREATE INDEX idx_special_use_groups_session ON public.special_use_groups(academic_session_id);
CREATE INDEX idx_special_use_runs_session ON public.special_use_runs(academic_session_id);

-- Backfill existing records with the current active session for each school
UPDATE public.special_use_groups
SET academic_session_id = (
  SELECT id FROM public.academic_sessions
  WHERE school_id = special_use_groups.school_id
    AND is_active = true
  LIMIT 1
);

UPDATE public.special_use_runs
SET academic_session_id = (
  SELECT id FROM public.academic_sessions
  WHERE school_id = special_use_runs.school_id
    AND is_active = true
  LIMIT 1
);