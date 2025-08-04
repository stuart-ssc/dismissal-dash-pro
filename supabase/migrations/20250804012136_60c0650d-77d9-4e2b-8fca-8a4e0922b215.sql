-- Fix the students RLS policy to use the same simple approach as classes
-- The current policy is doing complex joins that cause issues

-- Drop the problematic students policy
DROP POLICY IF EXISTS "School admins can manage students" ON public.students;

-- Create a simple, direct policy for school admins to manage students
CREATE POLICY "School admins can manage students in their school" 
ON public.students 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'school_admin'::app_role
  ) 
  AND get_user_school_id(auth.uid()) = school_id
);

-- Also create a separate policy for teachers to view their students
CREATE POLICY "Teachers can view their assigned students" 
ON public.students 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'teacher'::app_role
  ) 
  AND EXISTS (
    SELECT 1 
    FROM public.class_rosters cr
    JOIN public.class_teachers ct ON cr.class_id = ct.class_id
    WHERE cr.student_id = students.id 
    AND ct.teacher_id = auth.uid()
  )
);