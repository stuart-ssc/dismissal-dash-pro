-- Create student_temporary_transportation table
CREATE TABLE public.student_temporary_transportation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  
  -- Transportation assignment (one of these will be set)
  bus_id uuid REFERENCES public.buses(id) ON DELETE CASCADE,
  car_line_id uuid REFERENCES public.car_lines(id) ON DELETE CASCADE,
  walker_location_id uuid REFERENCES public.walker_locations(id) ON DELETE CASCADE,
  after_school_activity_id uuid REFERENCES public.after_school_activities(id) ON DELETE CASCADE,
  
  -- Date handling - support multiple patterns
  override_type text NOT NULL CHECK (override_type IN ('single_date', 'date_range', 'recurring_weekday', 'specific_dates')),
  
  -- For single_date: only start_date is used
  -- For date_range: both start_date and end_date are used
  -- For recurring_weekday: start_date and end_date define the range, weekday_pattern defines which days
  -- For specific_dates: specific_dates array contains exact dates
  start_date date NOT NULL,
  end_date date,
  
  -- For recurring patterns (e.g., "every Thursday")
  weekday_pattern integer[], -- Array of weekday numbers (0=Sunday, 1=Monday, ..., 6=Saturday)
  
  -- For specific multiple dates (e.g., "March 5, March 12, March 19")
  specific_dates date[],
  
  -- Metadata
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Notification tracking
  notification_sent boolean DEFAULT false,
  notification_sent_at timestamptz,
  
  -- Ensure only one transportation type is set
  CONSTRAINT one_transport_type CHECK (
    (bus_id IS NOT NULL AND car_line_id IS NULL AND walker_location_id IS NULL AND after_school_activity_id IS NULL) OR
    (bus_id IS NULL AND car_line_id IS NOT NULL AND walker_location_id IS NULL AND after_school_activity_id IS NULL) OR
    (bus_id IS NULL AND car_line_id IS NULL AND walker_location_id IS NOT NULL AND after_school_activity_id IS NULL) OR
    (bus_id IS NULL AND car_line_id IS NULL AND walker_location_id IS NULL AND after_school_activity_id IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_temp_transport_student ON public.student_temporary_transportation(student_id);
CREATE INDEX idx_temp_transport_dates ON public.student_temporary_transportation(start_date, end_date);
CREATE INDEX idx_temp_transport_created_by ON public.student_temporary_transportation(created_by);

-- Trigger for updated_at
CREATE TRIGGER update_temp_transport_updated_at 
  BEFORE UPDATE ON public.student_temporary_transportation
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.student_temporary_transportation ENABLE ROW LEVEL SECURITY;

-- System admins can do everything
CREATE POLICY "System admins can manage all temporary transportation"
  ON public.student_temporary_transportation
  FOR ALL
  USING (has_role(auth.uid(), 'system_admin'::app_role));

-- School admins can manage for students in their school
CREATE POLICY "School admins can manage temporary transportation"
  ON public.student_temporary_transportation
  FOR ALL
  USING (
    has_role(auth.uid(), 'school_admin'::app_role) AND
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_temporary_transportation.student_id
        AND can_view_school_data(s.school_id)
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'school_admin'::app_role) AND
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_temporary_transportation.student_id
        AND can_manage_school_data(s.school_id)
    )
  );

-- Teachers can manage for students in their classes (permanent or coverage)
CREATE POLICY "Teachers can manage temporary transportation for their students"
  ON public.student_temporary_transportation
  FOR ALL
  USING (
    has_role(auth.uid(), 'teacher'::app_role) AND
    EXISTS (
      SELECT 1 
      FROM class_rosters cr
      JOIN class_teachers ct ON ct.class_id = cr.class_id
      WHERE cr.student_id = student_temporary_transportation.student_id
        AND ct.teacher_id = auth.uid()
      
      UNION
      
      SELECT 1
      FROM class_rosters cr
      JOIN class_coverage cc ON cc.class_id = cr.class_id
      WHERE cr.student_id = student_temporary_transportation.student_id
        AND cc.covering_teacher_id = auth.uid()
        AND cc.coverage_date = CURRENT_DATE
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'teacher'::app_role) AND
    EXISTS (
      SELECT 1 
      FROM class_rosters cr
      JOIN class_teachers ct ON ct.class_id = cr.class_id
      WHERE cr.student_id = student_temporary_transportation.student_id
        AND ct.teacher_id = auth.uid()
      
      UNION
      
      SELECT 1
      FROM class_rosters cr
      JOIN class_coverage cc ON cc.class_id = cr.class_id
      WHERE cr.student_id = student_temporary_transportation.student_id
        AND cc.covering_teacher_id = auth.uid()
        AND cc.coverage_date = CURRENT_DATE
    )
  );

-- Function to get active temporary transportation for a student on a specific date
CREATE OR REPLACE FUNCTION public.get_active_temp_transportation(
  p_student_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  id uuid,
  bus_id uuid,
  car_line_id uuid,
  walker_location_id uuid,
  after_school_activity_id uuid,
  notes text,
  created_by uuid,
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
  SELECT 
    stt.id,
    stt.bus_id,
    stt.car_line_id,
    stt.walker_location_id,
    stt.after_school_activity_id,
    stt.notes,
    stt.created_by,
    stt.override_type,
    stt.start_date,
    stt.end_date
  FROM public.student_temporary_transportation stt
  WHERE stt.student_id = p_student_id
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
  ORDER BY stt.created_at DESC
  LIMIT 1; -- Return most recent override if multiple exist
END;
$$;

-- Create view for active overrides
CREATE VIEW public.active_temp_transportation AS
SELECT *
FROM public.student_temporary_transportation
WHERE 
  (override_type = 'single_date' AND start_date >= CURRENT_DATE) OR
  (override_type = 'date_range' AND end_date >= CURRENT_DATE) OR
  (override_type = 'recurring_weekday' AND (end_date IS NULL OR end_date >= CURRENT_DATE)) OR
  (override_type = 'specific_dates' AND EXISTS (
    SELECT 1 FROM unnest(specific_dates) AS d WHERE d >= CURRENT_DATE
  ));