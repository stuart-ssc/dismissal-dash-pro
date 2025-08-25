-- Fix security warnings by adding search_path to functions
CREATE OR REPLACE FUNCTION public.calculate_dismissal_times(
  plan_dismissal_time time,
  preparation_minutes integer DEFAULT 5
)
RETURNS TABLE(
  dismissal_start_time timestamp with time zone,
  preparation_start_time timestamp with time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Calculate today's dismissal time
  dismissal_start_time := (CURRENT_DATE + plan_dismissal_time)::timestamp with time zone;
  
  -- Calculate preparation start time
  preparation_start_time := dismissal_start_time - (preparation_minutes || ' minutes')::interval;
  
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_dismissal_run_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-transition from scheduled to preparation
  IF NEW.status = 'scheduled' AND NEW.preparation_start_time <= now() THEN
    NEW.status := 'preparation';
  END IF;
  
  -- Auto-transition from preparation to active
  IF NEW.status = 'preparation' AND NEW.scheduled_start_time <= now() THEN
    NEW.status := 'active';
  END IF;
  
  -- Auto-transition to completed when all enabled modes are complete
  IF NEW.status = 'active' AND 
     NEW.bus_completed = true AND 
     NEW.car_line_completed = true AND 
     NEW.walker_completed = true AND
     NEW.ended_at IS NULL THEN
    NEW.status := 'completed';
    NEW.ended_at := now();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_scheduled_dismissal_run(
  target_school_id bigint,
  target_date date DEFAULT CURRENT_DATE
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  run_id uuid;
  selected_plan_id uuid;
  plan_dismissal_time time;
  plan_preparation_minutes integer;
  calculated_times record;
BEGIN
  -- Check if run already exists for this date
  SELECT id INTO run_id
  FROM public.dismissal_runs
  WHERE school_id = target_school_id AND date = target_date;
  
  IF run_id IS NOT NULL THEN
    RETURN run_id;
  END IF;
  
  -- Find appropriate plan (same logic as useTodayDismissalRun)
  SELECT id, dismissal_time, 5 as preparation_minutes -- Default 5 minutes
  INTO selected_plan_id, plan_dismissal_time, plan_preparation_minutes
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
    SELECT id, dismissal_time, 5 as preparation_minutes
    INTO selected_plan_id, plan_dismissal_time, plan_preparation_minutes
    FROM public.dismissal_plans
    WHERE school_id = target_school_id
      AND status = 'active'
      AND is_default = true
    ORDER BY updated_at DESC
    LIMIT 1;
  END IF;
  
  -- If we have a plan, calculate times and create run
  IF selected_plan_id IS NOT NULL AND plan_dismissal_time IS NOT NULL THEN
    SELECT * INTO calculated_times
    FROM public.calculate_dismissal_times(plan_dismissal_time, plan_preparation_minutes);
    
    INSERT INTO public.dismissal_runs (
      school_id,
      date,
      plan_id,
      status,
      started_by,
      scheduled_start_time,
      preparation_start_time
    ) VALUES (
      target_school_id,
      target_date,
      selected_plan_id,
      'scheduled',
      auth.uid(), -- Will be null for automated creation
      calculated_times.dismissal_start_time,
      calculated_times.preparation_start_time
    )
    RETURNING id INTO run_id;
  END IF;
  
  RETURN run_id;
END;
$$;