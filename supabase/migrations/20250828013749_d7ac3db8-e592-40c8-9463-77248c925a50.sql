-- Delete today's dismissal data to reset for testing
-- Order is important to avoid foreign key constraint violations

-- First delete completion records
DELETE FROM car_line_completions 
WHERE dismissal_run_id IN (
  SELECT id FROM dismissal_runs WHERE date = CURRENT_DATE
);

DELETE FROM walker_location_completions 
WHERE dismissal_run_id IN (
  SELECT id FROM dismissal_runs WHERE date = CURRENT_DATE
);

-- Then delete pickup records
DELETE FROM car_line_pickups 
WHERE car_line_session_id IN (
  SELECT cls.id FROM car_line_sessions cls 
  JOIN dismissal_runs dr ON dr.id = cls.dismissal_run_id 
  WHERE dr.date = CURRENT_DATE
);

DELETE FROM walker_pickups 
WHERE walker_session_id IN (
  SELECT ws.id FROM walker_sessions ws 
  JOIN dismissal_runs dr ON dr.id = ws.dismissal_run_id 
  WHERE dr.date = CURRENT_DATE
);

-- Then delete session records
DELETE FROM car_line_sessions 
WHERE dismissal_run_id IN (
  SELECT id FROM dismissal_runs WHERE date = CURRENT_DATE
);

DELETE FROM walker_sessions 
WHERE dismissal_run_id IN (
  SELECT id FROM dismissal_runs WHERE date = CURRENT_DATE
);

-- Delete bus events
DELETE FROM bus_run_events 
WHERE dismissal_run_id IN (
  SELECT id FROM dismissal_runs WHERE date = CURRENT_DATE
);

-- Finally delete the dismissal run itself
DELETE FROM dismissal_runs WHERE date = CURRENT_DATE;