-- Audit and fix students table RLS to ensure dismissal_mode_id is protected
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "students_school_access" ON public.students;
DROP POLICY IF EXISTS "students_system_admin" ON public.students;
DROP POLICY IF EXISTS "students_school_users" ON public.students;

-- System admins see all students
CREATE POLICY "students_system_admin"
ON public.students
FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- School staff can view and manage their school's students
CREATE POLICY "students_school_users"
ON public.students
FOR ALL
USING (can_view_school_data(school_id))
WITH CHECK (can_manage_school_data(school_id));

-- Add comment
COMMENT ON TABLE public.students IS 'Student records including dismissal_mode_id for quick lookup during dismissal. Protected by school-based RLS to prevent cross-school data access.';