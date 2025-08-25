-- Reset dismissal data for today
-- First, delete the existing dismissal run for today
DELETE FROM public.dismissal_runs 
WHERE date = CURRENT_DATE 
  AND school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid());

-- Create a fresh scheduled dismissal run for today using the RPC function
-- This will use the correct dismissal plan and calculate proper times based on timezone
SELECT public.create_scheduled_dismissal_run(
  (SELECT school_id FROM public.profiles WHERE id = auth.uid()),
  CURRENT_DATE
);