-- Create table for student after school activities assignments
CREATE TABLE public.student_after_school_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.student_after_school_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for student after school activities assignments
CREATE POLICY "student_after_school_assignments_manage" 
ON public.student_after_school_assignments 
FOR ALL 
USING (can_manage_student(student_id))
WITH CHECK (can_manage_student(student_id));

CREATE POLICY "student_after_school_assignments_system_admin" 
ON public.student_after_school_assignments 
FOR ALL 
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_student_after_school_assignments_updated_at
BEFORE UPDATE ON public.student_after_school_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();