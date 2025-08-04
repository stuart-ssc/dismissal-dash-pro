-- Fix infinite recursion in class_teachers RLS policies
DROP POLICY IF EXISTS "School admins can manage class teachers" ON public.class_teachers;
DROP POLICY IF EXISTS "Teachers can view their class assignments" ON public.class_teachers;

-- Create new non-recursive RLS policies for class_teachers
CREATE POLICY "School admins can manage class teachers" 
ON public.class_teachers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'school_admin'::app_role
  ) 
  AND EXISTS (
    SELECT 1 FROM public.classes c 
    WHERE c.id = class_teachers.class_id 
    AND public.get_user_school_id(auth.uid()) = c.school_id
  )
);

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
    AND EXISTS (
      SELECT 1 FROM public.classes c 
      WHERE c.id = class_teachers.class_id 
      AND public.get_user_school_id(auth.uid()) = c.school_id
    )
  )
);