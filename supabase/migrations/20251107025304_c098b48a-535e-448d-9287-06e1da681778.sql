-- Fix Security Issue: Ensure student_temporary_transportation has proper RLS
-- This is the base table for active_temp_transportation view

-- First, ensure RLS is enabled (it should be, but verify)
ALTER TABLE public.student_temporary_transportation ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to recreate them properly
DROP POLICY IF EXISTS "system_admin_all_access" ON public.student_temporary_transportation;
DROP POLICY IF EXISTS "school_users_view_own_school" ON public.student_temporary_transportation;
DROP POLICY IF EXISTS "school_admins_manage_own_school" ON public.student_temporary_transportation;
DROP POLICY IF EXISTS "teachers_view_own_school" ON public.student_temporary_transportation;

-- System admins see all temporary transportation records
CREATE POLICY "system_admin_all_access"
ON public.student_temporary_transportation
FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- School admins can manage their school's temporary transportation
CREATE POLICY "school_admins_manage_own_school"
ON public.student_temporary_transportation
FOR ALL
USING (
  has_role(auth.uid(), 'school_admin'::app_role) AND
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = student_temporary_transportation.student_id
    AND can_view_school_data(s.school_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'school_admin'::app_role) AND
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = student_temporary_transportation.student_id
    AND can_manage_school_data(s.school_id)
  )
);

-- Teachers can view their school's temporary transportation
CREATE POLICY "teachers_view_own_school"
ON public.student_temporary_transportation
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = student_temporary_transportation.student_id
    AND can_view_school_data(s.school_id)
  )
);

-- Add comment explaining security model
COMMENT ON TABLE public.student_temporary_transportation IS 
'Stores temporary transportation overrides for students. RLS ensures users only see data for their school. View active_temp_transportation inherits these policies.';