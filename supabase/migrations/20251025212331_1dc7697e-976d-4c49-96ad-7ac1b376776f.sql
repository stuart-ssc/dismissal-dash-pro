-- Create class_coverage table for temporary classroom dismissal coverage
CREATE TABLE public.class_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  covering_teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES auth.users(id),
  coverage_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  
  -- Ensure unique coverage: one covering teacher per class per day
  CONSTRAINT unique_class_coverage_per_day UNIQUE (class_id, covering_teacher_id, coverage_date)
);

-- Create indexes for efficient lookups
CREATE INDEX idx_class_coverage_teacher_date 
  ON public.class_coverage(covering_teacher_id, coverage_date);

CREATE INDEX idx_class_coverage_class_date 
  ON public.class_coverage(class_id, coverage_date);

-- Enable RLS
ALTER TABLE public.class_coverage ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Teachers can view coverage for their own classes or coverage assigned to them
CREATE POLICY "Teachers can view their class coverage" 
  ON public.class_coverage 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM class_teachers ct
      WHERE ct.class_id = class_coverage.class_id
        AND ct.teacher_id = auth.uid()
    )
    OR
    covering_teacher_id = auth.uid()
  );

-- RLS Policy: Teachers can create coverage for their own classes
CREATE POLICY "Teachers can assign coverage for their classes" 
  ON public.class_coverage 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM class_teachers ct
      WHERE ct.class_id = class_coverage.class_id
        AND ct.teacher_id = auth.uid()
    )
    AND assigned_by = auth.uid()
  );

-- RLS Policy: Teachers can delete coverage they created for their own classes
CREATE POLICY "Teachers can delete their class coverage" 
  ON public.class_coverage 
  FOR DELETE 
  USING (
    assigned_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM class_teachers ct
      WHERE ct.class_id = class_coverage.class_id
        AND ct.teacher_id = auth.uid()
    )
  );

-- RLS Policy: School admins can manage all coverage in their school
CREATE POLICY "School admins can manage class coverage" 
  ON public.class_coverage 
  FOR ALL 
  USING (
    has_role(auth.uid(), 'school_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_coverage.class_id
        AND can_view_school_data(c.school_id)
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'school_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_coverage.class_id
        AND can_manage_school_data(c.school_id)
    )
  );

-- RLS Policy: System admins have full access
CREATE POLICY "System admins can manage all class coverage" 
  ON public.class_coverage 
  FOR ALL 
  USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_class_coverage_updated_at
  BEFORE UPDATE ON public.class_coverage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper function to get all classes a teacher can access (permanent + temporary)
CREATE OR REPLACE FUNCTION public.get_teacher_accessible_classes(
  teacher_uuid uuid,
  target_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  class_id uuid,
  class_name text,
  grade_level text,
  is_permanent boolean,
  coverage_notes text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Permanent class assignments
  SELECT 
    c.id as class_id,
    c.class_name,
    c.grade_level,
    true as is_permanent,
    NULL::text as coverage_notes
  FROM classes c
  JOIN class_teachers ct ON ct.class_id = c.id
  WHERE ct.teacher_id = teacher_uuid

  UNION ALL

  -- Temporary coverage assignments for target date
  SELECT 
    c.id as class_id,
    c.class_name,
    c.grade_level,
    false as is_permanent,
    cc.notes as coverage_notes
  FROM classes c
  JOIN class_coverage cc ON cc.class_id = c.id
  WHERE cc.covering_teacher_id = teacher_uuid
    AND cc.coverage_date = target_date;
$$;