-- Create batch function for getting active temporary transportation overrides
CREATE OR REPLACE FUNCTION public.get_active_temp_transportation_batch(
  p_student_ids uuid[],
  p_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  student_id uuid,
  bus_id uuid,
  car_line_id uuid,
  walker_location_id uuid,
  after_school_activity_id uuid,
  notes text,
  override_type text,
  start_date date,
  end_date date
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (stt.student_id)
    stt.student_id,
    stt.bus_id,
    stt.car_line_id,
    stt.walker_location_id,
    stt.after_school_activity_id,
    stt.notes,
    stt.override_type,
    stt.start_date,
    stt.end_date
  FROM public.student_temporary_transportation stt
  WHERE stt.student_id = ANY(p_student_ids)
    AND (
      -- Single date match
      (stt.override_type = 'single_date' AND stt.start_date = p_date) OR
      
      -- Date range match
      (stt.override_type = 'date_range' AND p_date >= stt.start_date AND p_date <= stt.end_date) OR
      
      -- Recurring weekday match
      (stt.override_type = 'recurring_weekday' 
        AND p_date >= stt.start_date 
        AND (stt.end_date IS NULL OR p_date <= stt.end_date)
        AND EXTRACT(DOW FROM p_date)::integer = ANY(stt.weekday_pattern)) OR
      
      -- Specific dates match
      (stt.override_type = 'specific_dates' AND p_date = ANY(stt.specific_dates))
    )
  ORDER BY stt.student_id, stt.created_at DESC;
END;
$$;