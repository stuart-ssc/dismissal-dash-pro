-- Clear all dismissal data for today (2025-01-24)
-- Delete in correct order to respect foreign key constraints

-- 1. Delete pickup records first (child tables)
DELETE FROM car_line_pickups 
WHERE car_line_session_id IN (
  SELECT id FROM car_line_sessions 
  WHERE dismissal_run_id IN (
    SELECT id FROM dismissal_runs WHERE date = CURRENT_DATE
  )
);

DELETE FROM walker_pickups 
WHERE walker_session_id IN (
  SELECT id FROM walker_sessions 
  WHERE dismissal_run_id IN (
    SELECT id FROM dismissal_runs WHERE date = CURRENT_DATE
  )
);

-- 2. Delete session records
DELETE FROM car_line_sessions 
WHERE dismissal_run_id IN (
  SELECT id FROM dismissal_runs WHERE date = CURRENT_DATE
);

DELETE FROM walker_sessions 
WHERE dismissal_run_id IN (
  SELECT id FROM dismissal_runs WHERE date = CURRENT_DATE
);

-- 3. Delete event records
DELETE FROM bus_run_events 
WHERE dismissal_run_id IN (
  SELECT id FROM dismissal_runs WHERE date = CURRENT_DATE
);

-- 4. Delete dismissal run groups
DELETE FROM dismissal_run_groups 
WHERE dismissal_run_id IN (
  SELECT id FROM dismissal_runs WHERE date = CURRENT_DATE
);

-- 5. Finally delete the main dismissal run record
DELETE FROM dismissal_runs WHERE date = CURRENT_DATE;