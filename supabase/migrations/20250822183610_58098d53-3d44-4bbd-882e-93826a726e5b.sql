-- Reset today's dismissal data (2025-08-22)
-- Delete in order to respect foreign key relationships

-- 1. Delete car line pickups
DELETE FROM car_line_pickups 
WHERE car_line_session_id IN (
  SELECT id FROM car_line_sessions 
  WHERE dismissal_run_id = '34148863-27a1-4f3b-8161-c9ffd2778ea9'
);

-- 2. Delete car line sessions
DELETE FROM car_line_sessions 
WHERE dismissal_run_id = '34148863-27a1-4f3b-8161-c9ffd2778ea9';

-- 3. Delete bus run events
DELETE FROM bus_run_events 
WHERE dismissal_run_id = '34148863-27a1-4f3b-8161-c9ffd2778ea9';

-- 4. Delete walker pickups
DELETE FROM walker_pickups 
WHERE walker_session_id IN (
  SELECT id FROM walker_sessions 
  WHERE dismissal_run_id = '34148863-27a1-4f3b-8161-c9ffd2778ea9'
);

-- 5. Delete walker sessions
DELETE FROM walker_sessions 
WHERE dismissal_run_id = '34148863-27a1-4f3b-8161-c9ffd2778ea9';

-- 6. Delete dismissal run groups
DELETE FROM dismissal_run_groups 
WHERE dismissal_run_id = '34148863-27a1-4f3b-8161-c9ffd2778ea9';

-- 7. Finally delete the dismissal run
DELETE FROM dismissal_runs 
WHERE id = '34148863-27a1-4f3b-8161-c9ffd2778ea9';