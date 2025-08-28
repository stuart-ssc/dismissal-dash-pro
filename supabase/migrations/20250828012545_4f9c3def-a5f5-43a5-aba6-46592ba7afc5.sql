-- Update dismissal run times to allow immediate testing
-- Set times to current time minus buffer to ensure status transitions work

UPDATE dismissal_runs 
SET 
  preparation_start_time = NOW() - INTERVAL '10 minutes',
  scheduled_start_time = NOW() - INTERVAL '5 minutes',
  updated_at = NOW()
WHERE date = CURRENT_DATE;