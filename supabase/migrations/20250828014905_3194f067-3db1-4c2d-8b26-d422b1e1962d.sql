-- Fix the calculate_dismissal_times function to use target_date parameter
CREATE OR REPLACE FUNCTION public.calculate_dismissal_times(
  plan_dismissal_time time without time zone, 
  preparation_minutes integer DEFAULT 5, 
  school_timezone text DEFAULT 'America/New_York'::text,
  target_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(dismissal_start_time timestamp with time zone, preparation_start_time timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Calculate dismissal time using the target_date instead of CURRENT_DATE
  dismissal_start_time := (target_date + plan_dismissal_time) AT TIME ZONE school_timezone AT TIME ZONE 'UTC';
  
  -- Calculate preparation start time
  preparation_start_time := dismissal_start_time - (preparation_minutes || ' minutes')::interval;
  
  RETURN NEXT;
END;
$function$;

-- Update create_scheduled_dismissal_run to pass target_date to calculate_dismissal_times
CREATE OR REPLACE FUNCTION public.create_scheduled_dismissal_run(target_school_id bigint, target_date date DEFAULT CURRENT_DATE)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  run_id uuid;
  selected_plan_id uuid;
  plan_dismissal_time time;
  plan_preparation_minutes integer;
  school_timezone text;
  calculated_times record;
BEGIN
  -- Check if run already exists for this date
  SELECT id INTO run_id
  FROM public.dismissal_runs
  WHERE school_id = target_school_id AND date = target_date;
  
  IF run_id IS NOT NULL THEN
    RETURN run_id;
  END IF;
  
  -- Get school timezone and preparation time (default to Eastern timezone and 5 minutes if not set)
  SELECT COALESCE(timezone, 'America/New_York'), COALESCE(preparation_time_minutes, 5) 
  INTO school_timezone, plan_preparation_minutes
  FROM public.schools
  WHERE id = target_school_id;
  
  -- Find appropriate plan (same logic as useTodayDismissalRun)
  SELECT id, dismissal_time
  INTO selected_plan_id, plan_dismissal_time
  FROM public.dismissal_plans
  WHERE school_id = target_school_id
    AND status = 'active'
    AND (
      (start_date <= target_date AND end_date >= target_date) OR
      (start_date <= target_date AND end_date IS NULL) OR
      (start_date IS NULL AND end_date >= target_date) OR
      (start_date IS NULL AND end_date IS NULL)
    )
  ORDER BY updated_at DESC
  LIMIT 1;
  
  -- Fallback to default plan
  IF selected_plan_id IS NULL THEN
    SELECT id, dismissal_time
    INTO selected_plan_id, plan_dismissal_time
    FROM public.dismissal_plans
    WHERE school_id = target_school_id
      AND status = 'active'
      AND is_default = true
    ORDER BY updated_at DESC
    LIMIT 1;
  END IF;
  
  -- If we have a plan, calculate times and create run
  IF selected_plan_id IS NOT NULL AND plan_dismissal_time IS NOT NULL THEN
    -- Pass the target_date to calculate_dismissal_times
    SELECT * INTO calculated_times
    FROM public.calculate_dismissal_times(plan_dismissal_time, plan_preparation_minutes, school_timezone, target_date);
    
    INSERT INTO public.dismissal_runs (
      school_id,
      date,
      plan_id,
      status,
      started_by, -- NULL for automated creation
      scheduled_start_time,
      preparation_start_time
    ) VALUES (
      target_school_id,
      target_date,
      selected_plan_id,
      'scheduled',
      NULL, -- NULL for automated scheduled runs
      calculated_times.dismissal_start_time,
      calculated_times.preparation_start_time
    )
    RETURNING id INTO run_id;
  END IF;
  
  RETURN run_id;
END;
$function$;

-- Delete existing run for today and recreate with correct times
DELETE FROM dismissal_runs WHERE date = CURRENT_DATE AND school_id = 1;

-- Recreate today's dismissal run with the fixed function
SELECT create_scheduled_dismissal_run(1, CURRENT_DATE);