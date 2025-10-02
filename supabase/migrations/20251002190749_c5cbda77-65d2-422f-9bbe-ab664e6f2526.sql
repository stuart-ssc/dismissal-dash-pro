-- Fix RLS policies to prevent public access to sensitive data

-- ============================================
-- PROFILES TABLE - Restrict to authenticated users only
-- ============================================

-- Drop existing permissive policies if any exist
DROP POLICY IF EXISTS "profiles_users_own_and_school_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_system_admin" ON public.profiles;

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- System admins can see all profiles
CREATE POLICY "profiles_system_admin_access"
ON public.profiles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Users can view and update their own profile
CREATE POLICY "profiles_own_access"
ON public.profiles
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- School admins can view/manage profiles in their school
CREATE POLICY "profiles_school_admin_access"
ON public.profiles
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'school_admin'::app_role) 
  AND school_id IS NOT NULL 
  AND can_view_school_data(school_id)
)
WITH CHECK (
  has_role(auth.uid(), 'school_admin'::app_role) 
  AND school_id IS NOT NULL 
  AND can_manage_school_data(school_id)
);

-- Teachers can view profiles in their school (read-only)
CREATE POLICY "profiles_teacher_view_same_school"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND school_id IS NOT NULL
  AND can_view_school_data(school_id)
);

-- ============================================
-- STUDENTS TABLE - Ensure no public access
-- ============================================

-- Drop and recreate policies with explicit TO authenticated
DROP POLICY IF EXISTS "students_teacher_limited_access" ON public.students;
DROP POLICY IF EXISTS "students_school_admin_access" ON public.students;
DROP POLICY IF EXISTS "students_system_admin_access" ON public.students;

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- System admin full access
CREATE POLICY "students_system_admin_all"
ON public.students
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- School admin access for their school
CREATE POLICY "students_school_admin_manage"
ON public.students
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'school_admin'::app_role) 
  AND can_view_school_data(school_id)
)
WITH CHECK (
  has_role(auth.uid(), 'school_admin'::app_role) 
  AND can_manage_school_data(school_id)
);

-- Teachers can view students in their classes (limited data via get_students_for_teacher_safe)
CREATE POLICY "students_teacher_view_classes"
ON public.students
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND EXISTS (
    SELECT 1 
    FROM class_rosters cr
    JOIN class_teachers ct ON ct.class_id = cr.class_id
    WHERE cr.student_id = students.id 
      AND ct.teacher_id = auth.uid()
  )
);

-- ============================================
-- SCHOOLS TABLE - Restrict to authenticated users
-- ============================================

DROP POLICY IF EXISTS "schools_authenticated_users_own_school" ON public.schools;
DROP POLICY IF EXISTS "schools_authorized_update" ON public.schools;
DROP POLICY IF EXISTS "schools_system_admin" ON public.schools;

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- System admins can manage all schools
CREATE POLICY "schools_system_admin_all"
ON public.schools
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Authenticated users can view their own school
CREATE POLICY "schools_view_own_school"
ON public.schools
FOR SELECT
TO authenticated
USING (can_view_school_data(id));

-- School admins can update their school
CREATE POLICY "schools_admin_update"
ON public.schools
FOR UPDATE
TO authenticated
USING (can_manage_school_data(id))
WITH CHECK (can_manage_school_data(id));

-- ============================================
-- DISMISSAL_RUNS TABLE - Ensure proper restrictions
-- ============================================

DROP POLICY IF EXISTS "dismissal_runs_school_users" ON public.dismissal_runs;
DROP POLICY IF EXISTS "dismissal_runs_system_admin" ON public.dismissal_runs;
DROP POLICY IF EXISTS "dismissal_runs_teacher_select" ON public.dismissal_runs;

ALTER TABLE public.dismissal_runs ENABLE ROW LEVEL SECURITY;

-- System admin full access
CREATE POLICY "dismissal_runs_system_admin_all"
ON public.dismissal_runs
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- School admins and authorized staff can manage runs for their school
CREATE POLICY "dismissal_runs_school_manage"
ON public.dismissal_runs
FOR ALL
TO authenticated
USING (can_view_school_data(school_id))
WITH CHECK (can_manage_school_data(school_id));

-- Teachers can view dismissal runs for their school
CREATE POLICY "dismissal_runs_teacher_view"
ON public.dismissal_runs
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND can_view_school_data(school_id)
);

-- Log security policy updates
INSERT INTO public.audit_logs (
  table_name,
  action,
  user_id,
  details
) VALUES (
  'security_policies',
  'RLS_POLICIES_HARDENED',
  NULL,
  jsonb_build_object(
    'tables', ARRAY['profiles', 'students', 'schools', 'dismissal_runs'],
    'action', 'Restricted public access, enforced authentication',
    'timestamp', now()
  )
);