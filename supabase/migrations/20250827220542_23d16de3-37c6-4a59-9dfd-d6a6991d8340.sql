-- Delete all dismissal data for today for fresh testing
-- Current date: 2024-12-31

-- Delete all pickups first (they reference sessions)
DELETE FROM walker_pickups 
WHERE walker_session_id IN (
  SELECT id FROM walker_sessions 
  WHERE dismissal_run_id IN (
    SELECT id FROM dismissal_runs 
    WHERE date = '2024-12-31'
  )
);

DELETE FROM car_line_pickups 
WHERE car_line_session_id IN (
  SELECT id FROM car_line_sessions 
  WHERE dismissal_run_id IN (
    SELECT id FROM dismissal_runs 
    WHERE date = '2024-12-31'
  )
);

-- Delete all sessions (they reference dismissal runs)
DELETE FROM walker_sessions 
WHERE dismissal_run_id IN (
  SELECT id FROM dismissal_runs 
  WHERE date = '2024-12-31'
);

DELETE FROM car_line_sessions 
WHERE dismissal_run_id IN (
  SELECT id FROM dismissal_runs 
  WHERE date = '2024-12-31'
);

-- Delete location completions (they reference dismissal runs)
DELETE FROM walker_location_completions 
WHERE dismissal_run_id IN (
  SELECT id FROM dismissal_runs 
  WHERE date = '2024-12-31'
);

DELETE FROM car_line_completions 
WHERE dismissal_run_id IN (
  SELECT id FROM dismissal_runs 
  WHERE date = '2024-12-31'
);

-- Delete bus events if any (they reference dismissal runs)
DELETE FROM bus_run_events 
WHERE dismissal_run_id IN (
  SELECT id FROM dismissal_runs 
  WHERE date = '2024-12-31'
);

-- Delete dismissal run groups if any (they reference dismissal runs)
DELETE FROM dismissal_run_groups 
WHERE dismissal_run_id IN (
  SELECT id FROM dismissal_runs 
  WHERE date = '2024-12-31'
);

-- Finally delete the dismissal run itself
DELETE FROM dismissal_runs 
WHERE date = '2024-12-31';