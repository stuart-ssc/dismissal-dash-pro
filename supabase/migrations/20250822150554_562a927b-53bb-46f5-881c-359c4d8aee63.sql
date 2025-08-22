-- Clear all dismissal run testing data in proper order to avoid foreign key constraints

-- 1. Delete car line pickups first
DELETE FROM car_line_pickups;

-- 2. Delete walker pickups 
DELETE FROM walker_pickups;

-- 3. Delete car line sessions
DELETE FROM car_line_sessions;

-- 4. Delete walker sessions
DELETE FROM walker_sessions;

-- 5. Delete bus run events
DELETE FROM bus_run_events;

-- 6. Delete dismissal run groups (should already be empty)
DELETE FROM dismissal_run_groups;

-- 7. Finally delete dismissal runs
DELETE FROM dismissal_runs;