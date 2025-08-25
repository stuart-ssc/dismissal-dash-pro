-- Delete all dismissal run data for today (2025-08-25)
-- This will clean up test data so we can verify the mode completion functionality

-- Delete related event data first (to avoid foreign key constraints)
DELETE FROM public.bus_run_events 
WHERE dismissal_run_id IN (
  SELECT id FROM public.dismissal_runs 
  WHERE date = '2025-08-25'
);

DELETE FROM public.car_line_pickups 
WHERE car_line_session_id IN (
  SELECT cls.id FROM public.car_line_sessions cls
  JOIN public.dismissal_runs dr ON dr.id = cls.dismissal_run_id
  WHERE dr.date = '2025-08-25'
);

DELETE FROM public.car_line_sessions 
WHERE dismissal_run_id IN (
  SELECT id FROM public.dismissal_runs 
  WHERE date = '2025-08-25'
);

DELETE FROM public.walker_pickups 
WHERE walker_session_id IN (
  SELECT ws.id FROM public.walker_sessions ws
  JOIN public.dismissal_runs dr ON dr.id = ws.dismissal_run_id
  WHERE dr.date = '2025-08-25'
);

DELETE FROM public.walker_sessions 
WHERE dismissal_run_id IN (
  SELECT id FROM public.dismissal_runs 
  WHERE date = '2025-08-25'
);

DELETE FROM public.dismissal_run_groups 
WHERE dismissal_run_id IN (
  SELECT id FROM public.dismissal_runs 
  WHERE date = '2025-08-25'
);

-- Finally delete the dismissal runs themselves
DELETE FROM public.dismissal_runs 
WHERE date = '2025-08-25';