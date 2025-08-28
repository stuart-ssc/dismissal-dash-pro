-- Delete existing dismissal runs for school_id = 2 and create immediate active run
DELETE FROM dismissal_runs WHERE school_id = 2 AND date = CURRENT_DATE;

-- Create immediate active dismissal run for school_id = 2
INSERT INTO dismissal_runs (
  school_id,
  date,
  plan_id,
  status,
  started_by,
  started_at,
  scheduled_start_time,
  preparation_start_time,
  bus_completed,
  car_line_completed,
  walker_completed
) 
SELECT 
  2 as school_id,
  CURRENT_DATE as date,
  dp.id as plan_id,
  'active' as status,
  '00000000-0000-0000-0000-000000000000'::uuid as started_by,
  now() as started_at,
  now() as scheduled_start_time,
  now() - interval '5 minutes' as preparation_start_time,
  false as bus_completed,
  false as car_line_completed,
  false as walker_completed
FROM dismissal_plans dp 
WHERE dp.school_id = 2 
  AND dp.status = 'active' 
  AND dp.is_default = true
LIMIT 1;