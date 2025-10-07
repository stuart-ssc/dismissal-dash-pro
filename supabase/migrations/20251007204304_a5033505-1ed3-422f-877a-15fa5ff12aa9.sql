-- Add classroom mode layout preference to schools table
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS classroom_mode_layout text DEFAULT 'transportation-columns'
CHECK (classroom_mode_layout IN ('group-view', 'transportation-columns'));

COMMENT ON COLUMN public.schools.classroom_mode_layout IS 'Default layout preference for classroom dismissal mode';