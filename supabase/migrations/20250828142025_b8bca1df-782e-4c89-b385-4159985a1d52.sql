-- Function to update dismissal run times when a plan's dismissal time changes
CREATE OR REPLACE FUNCTION public.update_dismissal_run_times(
  run_id uuid,
  new_dismissal_time time without time zone,
  school_timezone text DEFAULT 'America/New_York'::text,
  preparation_minutes integer DEFAULT 5
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  calculated_times record;
  run_record record;
  current_time timestamp with time zone := now();
BEGIN
  -- Get the current run details
  SELECT * INTO run_record 
  FROM public.dismissal_runs 
  WHERE id = run_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Only update runs that haven't been manually started or completed
  IF run_record.status IN ('completed', 'cancelled') OR run_record.started_by IS NOT NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate new times using the existing function
  SELECT * INTO calculated_times
  FROM public.calculate_dismissal_times(new_dismissal_time, preparation_minutes, school_timezone, run_record.date);
  
  -- Determine new status based on current time
  DECLARE
    new_status text := run_record.status;
  BEGIN
    IF calculated_times.preparation_start_time <= current_time AND calculated_times.dismissal_start_time > current_time THEN
      new_status := 'preparation';
    ELSIF calculated_times.dismissal_start_time <= current_time THEN
      new_status := 'active';
    ELSE
      new_status := 'scheduled';
    END IF;
  END;
  
  -- Update the run with new times and status
  UPDATE public.dismissal_runs
  SET 
    scheduled_start_time = calculated_times.dismissal_start_time,
    preparation_start_time = calculated_times.preparation_start_time,
    status = new_status,
    updated_at = current_time
  WHERE id = run_id;
  
  RETURN TRUE;
END;
$$;