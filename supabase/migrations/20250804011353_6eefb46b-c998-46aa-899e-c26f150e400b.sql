-- Fix remaining infinite recursion in RLS policies for classes and class_teachers
-- This prevents students from showing up due to circular dependencies when joining tables

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Teachers can view their class assignments" ON public.class_teachers;
DROP POLICY IF EXISTS "Teachers can view their class rosters" ON public.class_rosters;

-- Recreate class_teachers policy without recursion
CREATE POLICY "Teachers can view their class assignments" 
ON public.class_teachers 
FOR SELECT 
USING (
  auth.uid() = teacher_id 
  OR (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'school_admin'::app_role
    ) 
    AND get_user_school_id(auth.uid()) = (
      SELECT school_id FROM public.classes 
      WHERE id = class_teachers.class_id
    )
  )
);

-- Recreate class_rosters policy without recursion
CREATE POLICY "Teachers can view their class rosters" 
ON public.class_rosters 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'teacher'::app_role
  ) 
  AND auth.uid() IN (
    SELECT teacher_id FROM public.class_teachers 
    WHERE class_id = class_rosters.class_id
  )
);