-- Fix potential recursion in class_rosters RLS policies
DROP POLICY IF EXISTS "School admins can manage class rosters" ON public.class_rosters;
DROP POLICY IF EXISTS "Teachers can view their class rosters" ON public.class_rosters;

-- Create new non-recursive RLS policies for class_rosters
CREATE POLICY "School admins can manage class rosters" 
ON public.class_rosters 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'school_admin'::app_role
  ) 
  AND EXISTS (
    SELECT 1 FROM public.students s 
    WHERE s.id = class_rosters.student_id 
    AND public.get_user_school_id(auth.uid()) = s.school_id
  )
);

CREATE POLICY "Teachers can view their class rosters" 
ON public.class_rosters 
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
    AND ct.class_id = class_rosters.class_id
  )
);