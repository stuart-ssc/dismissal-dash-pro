-- Fix timezone handling in calculate_dismissal_times function
-- The issue: plan_dismissal_time should be treated as local time in school_timezone, not UTC

CREATE OR REPLACE FUNCTION public.calculate_dismissal_times(
  plan_dismissal_time time without time zone, 
  preparation_minutes integer DEFAULT 5, 
  school_timezone text DEFAULT 'America/New_York'::text, 
  target_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  dismissal_start_time timestamp with time zone, 
  preparation_start_time timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Correctly interpret plan_dismissal_time as local time in school_timezone
  -- Combine date + time, then treat as local time in school's timezone
  dismissal_start_time := (
    (target_date::text || ' ' || plan_dismissal_time::text)::timestamp 
    AT TIME ZONE school_timezone
  );
  
  -- Calculate preparation start time (subtract preparation minutes)
  preparation_start_time := dismissal_start_time - (preparation_minutes || ' minutes')::interval;
  
  RETURN NEXT;
END;
$function$;