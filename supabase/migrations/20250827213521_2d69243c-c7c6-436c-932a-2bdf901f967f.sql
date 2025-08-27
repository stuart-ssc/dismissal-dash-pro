-- Reset today's dismissal data for testing
DO $$
DECLARE
    today_date date := CURRENT_DATE;
BEGIN
    -- Delete walker pickups for today's sessions
    DELETE FROM walker_pickups 
    WHERE walker_session_id IN (
        SELECT ws.id 
        FROM walker_sessions ws
        JOIN dismissal_runs dr ON dr.id = ws.dismissal_run_id
        WHERE dr.date = today_date
    );

    -- Delete car line pickups for today's sessions
    DELETE FROM car_line_pickups 
    WHERE car_line_session_id IN (
        SELECT cls.id 
        FROM car_line_sessions cls
        JOIN dismissal_runs dr ON dr.id = cls.dismissal_run_id
        WHERE dr.date = today_date
    );

    -- Delete walker sessions for today
    DELETE FROM walker_sessions 
    WHERE dismissal_run_id IN (
        SELECT id FROM dismissal_runs WHERE date = today_date
    );

    -- Delete car line sessions for today
    DELETE FROM car_line_sessions 
    WHERE dismissal_run_id IN (
        SELECT id FROM dismissal_runs WHERE date = today_date
    );

    -- Delete bus run events for today
    DELETE FROM bus_run_events 
    WHERE dismissal_run_id IN (
        SELECT id FROM dismissal_runs WHERE date = today_date
    );

    -- Delete dismissal run groups for today
    DELETE FROM dismissal_run_groups 
    WHERE dismissal_run_id IN (
        SELECT id FROM dismissal_runs WHERE date = today_date
    );

    -- Delete today's dismissal runs
    DELETE FROM dismissal_runs WHERE date = today_date;

    -- Log the reset
    RAISE NOTICE 'Reset dismissal data for date: %', today_date;
END $$;