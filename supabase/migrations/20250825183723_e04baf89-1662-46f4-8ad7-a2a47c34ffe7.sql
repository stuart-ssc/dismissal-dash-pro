-- Reset today's dismissal run data
-- First, delete the existing dismissal run for today
DELETE FROM public.dismissal_runs WHERE date = CURRENT_DATE;

-- Create a new properly scheduled dismissal run for school_id 2 (the school from the current run)
-- This will use the new schedule-driven system with proper timing
SELECT public.create_scheduled_dismissal_run(2, CURRENT_DATE);