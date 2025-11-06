-- Create student_absences table
CREATE TABLE IF NOT EXISTS public.student_absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_id bigint NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  absence_type text NOT NULL CHECK (absence_type IN ('single_date', 'date_range')),
  start_date date NOT NULL,
  end_date date NULL,
  reason text NULL,
  notes text NULL,
  marked_by uuid NOT NULL,
  returned_at timestamptz NULL,
  returned_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_absences_student_id ON public.student_absences(student_id);
CREATE INDEX IF NOT EXISTS idx_student_absences_school_id ON public.student_absences(school_id);
CREATE INDEX IF NOT EXISTS idx_student_absences_dates ON public.student_absences(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_student_absences_returned ON public.student_absences(returned_at) WHERE returned_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.student_absences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "School users can view absences for their school"
  ON public.student_absences
  FOR SELECT
  USING (
    can_view_school_data(school_id)
  );

CREATE POLICY "School users can insert absences for their school"
  ON public.student_absences
  FOR INSERT
  WITH CHECK (
    can_operate_school_data(school_id)
  );

CREATE POLICY "School users can update absences for their school"
  ON public.student_absences
  FOR UPDATE
  USING (
    can_operate_school_data(school_id)
  );

CREATE POLICY "School users can delete absences they created"
  ON public.student_absences
  FOR DELETE
  USING (
    can_operate_school_data(school_id)
  );

CREATE POLICY "System admins can manage all absences"
  ON public.student_absences
  FOR ALL
  USING (
    has_role(auth.uid(), 'system_admin'::app_role)
  );

-- Create helper function to check if student is absent on a given date
CREATE OR REPLACE FUNCTION public.is_student_absent(
  p_student_id uuid,
  p_date date DEFAULT CURRENT_DATE
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.student_absences
    WHERE student_id = p_student_id
      AND returned_at IS NULL
      AND (
        (absence_type = 'single_date' AND start_date = p_date) OR
        (absence_type = 'date_range' AND p_date >= start_date AND p_date <= end_date)
      )
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Create updated_at trigger
CREATE TRIGGER update_student_absences_updated_at
  BEFORE UPDATE ON public.student_absences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_absences;