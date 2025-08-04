-- Fix infinite recursion by separating school admin and teacher policies
-- This breaks the circular dependency between classes and class_teachers tables

-- Drop the problematic "Teachers can view their classes" policy that causes recursion
DROP POLICY IF EXISTS "Teachers can view their classes" ON public.classes;

-- Create a simple, direct policy for school admins to view all classes in their school
CREATE POLICY "School admins can view all classes in their school" 
ON public.classes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'school_admin'::app_role
  ) 
  AND get_user_school_id(auth.uid()) = school_id
);

-- Create a security definer function to get teacher's class IDs without recursion
CREATE OR REPLACE FUNCTION public.get_teacher_class_ids(teacher_uuid uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ARRAY(
    SELECT class_id 
    FROM public.class_teachers 
    WHERE teacher_id = teacher_uuid
  );
$$;

-- Create a separate policy for teachers using the security definer function
CREATE POLICY "Teachers can view their assigned classes" 
ON public.classes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'teacher'::app_role
  ) 
  AND id = ANY(get_teacher_class_ids(auth.uid()))
);