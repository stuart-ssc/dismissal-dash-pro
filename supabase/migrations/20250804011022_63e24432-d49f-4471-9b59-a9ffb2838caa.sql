-- Fix infinite recursion in classes table RLS policies
DROP POLICY IF EXISTS "Teachers can view their classes" ON public.classes;

-- Create new non-recursive RLS policy for teachers to view their classes
CREATE POLICY "Teachers can view their classes" 
ON public.classes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'teacher'::app_role
  ) 
  AND EXISTS (
    SELECT 1 FROM public.class_teachers ct 
    WHERE ct.teacher_id = auth.uid() 
    AND ct.class_id = classes.id
  )
);