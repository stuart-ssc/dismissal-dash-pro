-- Create student_after_school_assignments table for managing student assignments to after school activities
CREATE TABLE public.student_after_school_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  after_school_activity_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Create unique constraint to prevent duplicate assignments
  UNIQUE(student_id, after_school_activity_id)
);

-- Enable Row Level Security
ALTER TABLE public.student_after_school_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies following the same pattern as other student assignment tables
CREATE POLICY "student_after_school_assignments_manage" 
ON public.student_after_school_assignments 
FOR ALL 
USING (can_manage_student(student_id))
WITH CHECK (can_manage_student(student_id));

CREATE POLICY "student_after_school_assignments_system_admin" 
ON public.student_after_school_assignments 
FOR ALL 
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Add helpful indexes
CREATE INDEX idx_student_after_school_assignments_student_id ON public.student_after_school_assignments(student_id);
CREATE INDEX idx_student_after_school_assignments_activity_id ON public.student_after_school_assignments(after_school_activity_id);