-- Delete the older dismissal run that has the incorrect time
-- Keep only the most recent run with the correct 9:35 PM schedule
DELETE FROM dismissal_runs 
WHERE date = CURRENT_DATE 
AND id != (
  SELECT id 
  FROM dismissal_runs 
  WHERE date = CURRENT_DATE 
  ORDER BY created_at DESC 
  LIMIT 1
);