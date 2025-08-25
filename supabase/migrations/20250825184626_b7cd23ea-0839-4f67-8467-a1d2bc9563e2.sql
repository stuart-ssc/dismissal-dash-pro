-- Add timezone column to schools table
ALTER TABLE public.schools 
ADD COLUMN timezone text DEFAULT 'America/New_York';

-- Add comment for clarity
COMMENT ON COLUMN public.schools.timezone IS 'School timezone (e.g., America/New_York, America/Chicago, etc.)';