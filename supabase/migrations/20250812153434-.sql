-- Create security definer functions to avoid RLS recursion

-- Function to safely check if user can manage a student without causing recursion
CREATE OR REPLACE FUNCTION public.can_manage_student_safe(student_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    has_role(auth.uid(), 'system_admin'::app_role) OR
    (has_role(auth.uid(), 'school_admin'::app_role) AND EXISTS (
      SELECT 1 FROM students s WHERE s.id = student_uuid AND s.school_id = get_user_school_id(auth.uid())
    ))
$function$;

-- Function to get class IDs that the current user teaches
CREATE OR REPLACE FUNCTION public.get_user_taught_class_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT ARRAY(
    SELECT ct.class_id 
    FROM class_teachers ct
    JOIN teachers t ON t.id = ct.teacher_id
    WHERE t.id = auth.uid()
  )
$function$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "class_rosters_school_users" ON public.class_rosters;
DROP POLICY IF EXISTS "students_teacher_assigned" ON public.students;

-- Create simplified class_rosters policies
CREATE POLICY "Users can view class rosters for their school" 
ON public.class_rosters 
FOR SELECT 
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR
  (has_role(auth.uid(), 'school_admin'::app_role) AND EXISTS (
    SELECT 1 FROM classes c WHERE c.id = class_id AND c.school_id = get_user_school_id(auth.uid())
  )) OR
  (has_role(auth.uid(), 'teacher'::app_role) AND class_id = ANY(get_user_taught_class_ids()))
);

CREATE POLICY "Users can manage class rosters for their school" 
ON public.class_rosters 
FOR ALL 
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR
  (has_role(auth.uid(), 'school_admin'::app_role) AND EXISTS (
    SELECT 1 FROM classes c WHERE c.id = class_id AND c.school_id = get_user_school_id(auth.uid())
  ))
);

-- Create simplified students policies
CREATE POLICY "System and school admins can view students" 
ON public.students 
FOR SELECT 
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR
  (has_role(auth.uid(), 'school_admin'::app_role) AND school_id = get_user_school_id(auth.uid()))
);

CREATE POLICY "Teachers can view their assigned students" 
ON public.students 
FOR SELECT 
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
    SELECT 1 FROM class_rosters cr 
    WHERE cr.student_id = id AND cr.class_id = ANY(get_user_taught_class_ids())
  )
);

CREATE POLICY "Users can manage students for their school" 
ON public.students 
FOR ALL 
USING (can_manage_student_safe(id));