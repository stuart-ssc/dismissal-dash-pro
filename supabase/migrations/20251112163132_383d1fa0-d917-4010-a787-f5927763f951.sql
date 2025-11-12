-- Update create_scheduled_dismissal_run to use current academic session

DROP FUNCTION IF EXISTS public.create_scheduled_dismissal_run(bigint, date);

CREATE OR REPLACE FUNCTION public.create_scheduled_dismissal_run(
  target_school_id bigint,
  target_date date DEFAULT CURRENT_DATE
)
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
  current_session_id uuid;
BEGIN
  -- Get current academic session for the school
  SELECT id INTO current_session_id
  FROM public.academic_sessions
  WHERE school_id = target_school_id
    AND start_date <= target_date
    AND end_date >= target_date
  ORDER BY start_date DESC
  LIMIT 1;
  
  -- If no current session found, log warning and continue without session (backward compatibility)
  IF current_session_id IS NULL THEN
    RAISE WARNING 'No active academic session found for school % on date %', target_school_id, target_date;
  END IF;
  
  -- Check if run already exists for this date and session
  SELECT id INTO run_id
  FROM public.dismissal_runs
  WHERE school_id = target_school_id 
    AND date = target_date
    AND (academic_session_id = current_session_id OR (academic_session_id IS NULL AND current_session_id IS NULL));
  
  IF run_id IS NOT NULL THEN
    RETURN run_id;
  END IF;
  
  -- Get school timezone and preparation time (default to Eastern timezone and 5 minutes if not set)
  SELECT COALESCE(timezone, 'America/New_York'), COALESCE(preparation_time_minutes, 5) 
  INTO school_timezone, plan_preparation_minutes
  FROM public.schools
  WHERE id = target_school_id;
  
  -- PRIORITY 1: Find date-specific plan for target date (filtered by session)
  SELECT id, dismissal_time
  INTO selected_plan_id, plan_dismissal_time
  FROM public.dismissal_plans
  WHERE school_id = target_school_id
    AND status = 'active'
    AND start_date IS NOT NULL  -- Must have a start date (date-specific)
    AND (
      (start_date <= target_date AND end_date >= target_date) OR
      (start_date <= target_date AND end_date IS NULL)
    )
    AND (academic_session_id = current_session_id OR (academic_session_id IS NULL AND current_session_id IS NULL))
  ORDER BY start_date DESC  -- Most recent date-specific plan first
  LIMIT 1;
  
  -- PRIORITY 2: Fallback to default plan if no date-specific plan found (filtered by session)
  IF selected_plan_id IS NULL THEN
    SELECT id, dismissal_time
    INTO selected_plan_id, plan_dismissal_time
    FROM public.dismissal_plans
    WHERE school_id = target_school_id
      AND status = 'active'
      AND is_default = true
      AND (academic_session_id = current_session_id OR (academic_session_id IS NULL AND current_session_id IS NULL))
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
      started_by,
      scheduled_start_time,
      preparation_start_time,
      academic_session_id
    ) VALUES (
      target_school_id,
      target_date,
      selected_plan_id,
      'scheduled',
      NULL, -- NULL for automated scheduled runs
      calculated_times.dismissal_start_time,
      calculated_times.preparation_start_time,
      current_session_id
    )
    RETURNING id INTO run_id;
  END IF;
  
  RETURN run_id;
END;
$function$;