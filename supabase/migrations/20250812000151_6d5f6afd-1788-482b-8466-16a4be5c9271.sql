-- Fix RLS policies to ensure proper authentication context

-- First, let's check if we have the correct helper functions
CREATE OR REPLACE FUNCTION public.get_current_user_school_id()
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Update students RLS policy to be more explicit
DROP POLICY IF EXISTS "School admins and system admins full access to students" ON public.students;
CREATE POLICY "School admins and system admins full access to students" 
ON public.students 
FOR ALL 
TO authenticated
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR 
  (
    has_role(auth.uid(), 'school_admin'::app_role) AND 
    school_id = get_current_user_school_id()
  ) OR
  (
    has_role(auth.uid(), 'teacher'::app_role) AND 
    school_id = get_current_user_school_id()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'system_admin'::app_role) OR 
  (
    has_role(auth.uid(), 'school_admin'::app_role) AND 
    school_id = get_current_user_school_id()
  )
);

-- Update classes RLS policy to be more explicit  
DROP POLICY IF EXISTS "School admins and system admins full access to classes" ON public.classes;
CREATE POLICY "School admins and system admins full access to classes" 
ON public.classes 
FOR ALL 
TO authenticated
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR 
  (
    has_role(auth.uid(), 'school_admin'::app_role) AND 
    school_id = get_current_user_school_id()
  ) OR
  (
    has_role(auth.uid(), 'teacher'::app_role) AND 
    school_id = get_current_user_school_id()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'system_admin'::app_role) OR 
  (
    has_role(auth.uid(), 'school_admin'::app_role) AND 
    school_id = get_current_user_school_id()
  )
);

-- Update teachers RLS policy to be more explicit
DROP POLICY IF EXISTS "School admins and system admins can manage teachers" ON public.teachers;
CREATE POLICY "School admins and system admins can manage teachers" 
ON public.teachers 
FOR ALL 
TO authenticated
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR 
  (
    has_role(auth.uid(), 'school_admin'::app_role) AND 
    school_id = get_current_user_school_id()
  ) OR
  (
    has_role(auth.uid(), 'teacher'::app_role) AND 
    school_id = get_current_user_school_id()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'system_admin'::app_role) OR 
  (
    has_role(auth.uid(), 'school_admin'::app_role) AND 
    school_id = get_current_user_school_id()
  )
);