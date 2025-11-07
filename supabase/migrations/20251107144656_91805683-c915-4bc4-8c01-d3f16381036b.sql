-- Fix Critical RLS Security Issues for SOC2 Compliance

-- ============================================================================
-- 1. FIX email_change_requests RLS
-- ============================================================================
-- Current issues: Policies may allow too broad access, need to ensure proper school isolation

-- Drop existing policies to rebuild them properly
DROP POLICY IF EXISTS "users_own_requests" ON public.email_change_requests;
DROP POLICY IF EXISTS "school_admin_school_access" ON public.email_change_requests;
DROP POLICY IF EXISTS "system_admin_all_access" ON public.email_change_requests;

-- Users can only view their own email change requests
CREATE POLICY "users_view_own_email_requests"
ON public.email_change_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR auth.uid() = requested_by
);

-- School admins can view/manage requests for users in their school only
CREATE POLICY "school_admins_manage_school_email_requests"
ON public.email_change_requests
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'school_admin') AND
  EXISTS (
    SELECT 1 FROM profiles p1, profiles p2
    WHERE p1.id = auth.uid()
      AND p2.id = email_change_requests.user_id
      AND p1.school_id = p2.school_id
      AND p1.school_id IS NOT NULL
  )
)
WITH CHECK (
  has_role(auth.uid(), 'school_admin') AND
  EXISTS (
    SELECT 1 FROM profiles p1, profiles p2
    WHERE p1.id = auth.uid()
      AND p2.id = email_change_requests.user_id
      AND p1.school_id = p2.school_id
      AND p1.school_id IS NOT NULL
  )
);

-- System admins can view/manage all email change requests
CREATE POLICY "system_admins_manage_all_email_requests"
ON public.email_change_requests
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'system_admin'))
WITH CHECK (has_role(auth.uid(), 'system_admin'));

-- ============================================================================
-- 2. FIX help_requests RLS
-- ============================================================================
-- Current issues: Can't update or delete, need to add update for status changes by admins

-- Add policy for system admins to update help request status
CREATE POLICY "system_admins_update_help_requests"
ON public.help_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'system_admin'))
WITH CHECK (has_role(auth.uid(), 'system_admin'));

-- School admins should be able to view help requests from their school
CREATE POLICY "school_admins_view_school_help_requests"
ON public.help_requests
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'school_admin') AND
  school_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.school_id = help_requests.school_id
  )
);

-- ============================================================================
-- 3. FIX students TABLE RLS
-- ============================================================================
-- Verify students table has proper school isolation

-- First, ensure the students table has RLS enabled
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Drop any overly permissive policies if they exist
DROP POLICY IF EXISTS "students_public_access" ON public.students;
DROP POLICY IF EXISTS "students_read_all" ON public.students;

-- Create/replace proper policies for students table
DROP POLICY IF EXISTS "students_school_users_manage" ON public.students;
DROP POLICY IF EXISTS "students_school_users_view" ON public.students;
DROP POLICY IF EXISTS "students_system_admin" ON public.students;
DROP POLICY IF EXISTS "students_teacher_view" ON public.students;

-- School admins can manage students in their school
CREATE POLICY "students_school_admins_manage"
ON public.students
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'school_admin') AND
  can_view_school_data(school_id)
)
WITH CHECK (
  has_role(auth.uid(), 'school_admin') AND
  can_manage_school_data(school_id)
);

-- Teachers can view students in their school
CREATE POLICY "students_teachers_view"
ON public.students
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher') AND
  can_view_school_data(school_id)
);

-- System admins can manage all students
CREATE POLICY "students_system_admins_all"
ON public.students
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'system_admin'))
WITH CHECK (has_role(auth.uid(), 'system_admin'));

-- ============================================================================
-- 4. FIX active_temp_transportation VIEW
-- ============================================================================
-- Critical: Views don't have RLS by default, need to either:
-- Option A: Make the view SECURITY DEFINER (not supported in Postgres views)
-- Option B: Ensure base table has proper RLS (student_temporary_transportation)
-- Option C: Create a SECURITY DEFINER function instead

-- Let's verify the base table has proper RLS
ALTER TABLE public.student_temporary_transportation ENABLE ROW LEVEL SECURITY;

-- Create a SECURITY DEFINER function to safely query active temp transportation
CREATE OR REPLACE FUNCTION public.get_active_temp_transportation_for_student(
  _student_id uuid,
  _check_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  id uuid,
  student_id uuid,
  bus_id uuid,
  car_line_id uuid,
  walker_location_id uuid,
  after_school_activity_id uuid,
  start_date date,
  end_date date,
  weekday_pattern text[],
  specific_dates date[],
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  notification_sent boolean,
  notification_sent_at timestamptz,
  notes text,
  override_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.id,
    t.student_id,
    t.bus_id,
    t.car_line_id,
    t.walker_location_id,
    t.after_school_activity_id,
    t.start_date,
    t.end_date,
    t.weekday_pattern,
    t.specific_dates,
    t.created_by,
    t.created_at,
    t.updated_at,
    t.notification_sent,
    t.notification_sent_at,
    t.notes,
    t.override_type
  FROM student_temporary_transportation t
  JOIN students s ON s.id = t.student_id
  WHERE t.student_id = _student_id
    AND t.start_date <= _check_date
    AND (t.end_date IS NULL OR t.end_date >= _check_date)
    AND (
      -- Check if today's weekday is in the pattern
      (t.weekday_pattern IS NOT NULL AND EXTRACT(ISODOW FROM _check_date)::int = ANY(t.weekday_pattern))
      OR
      -- Or if today is in specific dates
      (t.specific_dates IS NOT NULL AND _check_date = ANY(t.specific_dates))
    )
    -- Ensure user has permission to view this student
    AND (
      has_role(auth.uid(), 'system_admin')
      OR can_view_school_data(s.school_id)
    );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_active_temp_transportation_for_student TO authenticated;

COMMENT ON FUNCTION public.get_active_temp_transportation_for_student IS 
'Securely retrieves active temporary transportation for a student with proper RLS checks. Use this instead of querying active_temp_transportation view directly.';