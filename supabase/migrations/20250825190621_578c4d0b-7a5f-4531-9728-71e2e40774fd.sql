-- First, let's see the current dismissal run data
SELECT id, school_id, date, scheduled_start_time, preparation_start_time, status 
FROM dismissal_runs 
WHERE date = CURRENT_DATE;

-- Delete the existing dismissal run with incorrect times
DELETE FROM dismissal_runs 
WHERE date = CURRENT_DATE;

-- Create a new dismissal run using the corrected timezone function
-- This will use the school_id from the deleted run (should be 1 based on the context)
SELECT create_scheduled_dismissal_run(1, CURRENT_DATE);

-- Verify the new run has correct times
SELECT id, school_id, date, scheduled_start_time, preparation_start_time, status 
FROM dismissal_runs 
WHERE date = CURRENT_DATE;