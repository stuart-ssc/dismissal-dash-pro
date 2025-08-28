-- Clean up early morning test data for school 2 (2025-08-28)
-- Delete in order to avoid foreign key constraints

-- First, get the dismissal run ID for reference
DO $$
DECLARE
    test_run_id uuid := '801f412f-775d-4cee-87dd-8da06ccaaecf';
BEGIN
    -- Delete car_line_pickups first (child of car_line_sessions)
    DELETE FROM public.car_line_pickups 
    WHERE car_line_session_id IN (
        SELECT id FROM public.car_line_sessions 
        WHERE dismissal_run_id = test_run_id
    );

    -- Delete walker_pickups first (child of walker_sessions) 
    DELETE FROM public.walker_pickups
    WHERE walker_session_id IN (
        SELECT id FROM public.walker_sessions
        WHERE dismissal_run_id = test_run_id
    );

    -- Delete completion records
    DELETE FROM public.car_line_completions 
    WHERE dismissal_run_id = test_run_id;

    DELETE FROM public.walker_location_completions
    WHERE dismissal_run_id = test_run_id;

    -- Delete session records
    DELETE FROM public.car_line_sessions 
    WHERE dismissal_run_id = test_run_id;

    DELETE FROM public.walker_sessions 
    WHERE dismissal_run_id = test_run_id;

    -- Delete bus events
    DELETE FROM public.bus_run_events 
    WHERE dismissal_run_id = test_run_id;

    -- Delete any dismissal run groups
    DELETE FROM public.dismissal_run_groups 
    WHERE dismissal_run_id = test_run_id;

    -- Finally, delete the main dismissal run
    DELETE FROM public.dismissal_runs 
    WHERE id = test_run_id;

    -- Log the cleanup
    RAISE NOTICE 'Cleaned up early morning test data for dismissal run %', test_run_id;
END $$;