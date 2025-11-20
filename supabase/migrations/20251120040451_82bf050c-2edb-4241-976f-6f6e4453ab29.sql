-- Update RLS policies to check both admin and district impersonation sessions
-- This migration adds impersonation session checks to all school-scoped data tables

-- Helper function to check if user is impersonating a school (either as system or district admin)
CREATE OR REPLACE FUNCTION is_impersonating_school(check_school_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check system admin impersonation
  IF EXISTS (
    SELECT 1 FROM admin_impersonation_sessions
    WHERE admin_user_id = auth.uid()
      AND impersonated_school_id = check_school_id
      AND expires_at > now()
  ) THEN
    RETURN true;
  END IF;

  -- Check district admin impersonation
  IF EXISTS (
    SELECT 1 FROM district_impersonation_sessions
    WHERE district_admin_user_id = auth.uid()
      AND impersonated_school_id = check_school_id
      AND expires_at > now()
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Update students table policies
DROP POLICY IF EXISTS "Students view policy" ON students;
CREATE POLICY "Students view policy" ON students
FOR SELECT
USING (
  can_view_school_data(school_id)
  OR is_impersonating_school(school_id)
);

-- Update teachers table policies
DROP POLICY IF EXISTS "Teachers view policy" ON teachers;
CREATE POLICY "Teachers view policy" ON teachers
FOR SELECT
USING (
  can_view_school_data(school_id)
  OR is_impersonating_school(school_id)
);

-- Update classes table policies
DROP POLICY IF EXISTS "classes_school_admin" ON classes;
CREATE POLICY "classes_school_admin" ON classes
FOR ALL
USING (
  can_view_school_data(school_id)
  OR is_impersonating_school(school_id)
)
WITH CHECK (
  can_manage_school_data(school_id)
);

-- Update dismissal_runs table policies
DROP POLICY IF EXISTS "dismissal_runs_school_manage" ON dismissal_runs;
CREATE POLICY "dismissal_runs_school_manage" ON dismissal_runs
FOR ALL
USING (
  can_view_school_data(school_id)
  OR is_impersonating_school(school_id)
)
WITH CHECK (
  can_manage_school_data(school_id)
);

-- Update buses table policies
DROP POLICY IF EXISTS "buses_school_admin" ON buses;
CREATE POLICY "buses_school_admin" ON buses
FOR ALL
USING (
  can_view_school_data(school_id)
  OR is_impersonating_school(school_id)
)
WITH CHECK (
  can_manage_school_data(school_id)
);

-- Update car_lines table policies
DROP POLICY IF EXISTS "car_lines_school_admin" ON car_lines;
CREATE POLICY "car_lines_school_admin" ON car_lines
FOR ALL
USING (
  can_view_school_data(school_id)
  OR is_impersonating_school(school_id)
)
WITH CHECK (
  can_manage_school_data(school_id)
);

-- Update walker_locations table policies (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'walker_locations') THEN
    EXECUTE 'DROP POLICY IF EXISTS "walker_locations_school_admin" ON walker_locations';
    EXECUTE 'CREATE POLICY "walker_locations_school_admin" ON walker_locations
      FOR ALL
      USING (can_view_school_data(school_id) OR is_impersonating_school(school_id))
      WITH CHECK (can_manage_school_data(school_id))';
  END IF;
END $$;

-- Update after_school_activities table policies
DROP POLICY IF EXISTS "after_school_activities_school_admin" ON after_school_activities;
CREATE POLICY "after_school_activities_school_admin" ON after_school_activities
FOR ALL
USING (
  can_view_school_data(school_id)
  OR is_impersonating_school(school_id)
)
WITH CHECK (
  can_manage_school_data(school_id)
);

-- Update dismissal_plans table policies
DROP POLICY IF EXISTS "dismissal_plans_school_users_manage" ON dismissal_plans;
CREATE POLICY "dismissal_plans_school_users_manage" ON dismissal_plans
FOR ALL
USING (
  can_manage_school_data(school_id)
  OR is_impersonating_school(school_id)
)
WITH CHECK (
  can_manage_school_data(school_id)
);

DROP POLICY IF EXISTS "dismissal_plans_school_users_select" ON dismissal_plans;
CREATE POLICY "dismissal_plans_school_users_select" ON dismissal_plans
FOR SELECT
USING (
  can_view_school_data(school_id)
  OR is_impersonating_school(school_id)
);

-- Update academic_sessions table policies
DROP POLICY IF EXISTS "School admins can manage their school sessions" ON academic_sessions;
CREATE POLICY "School admins can manage their school sessions" ON academic_sessions
FOR ALL
USING (
  can_manage_school_data(school_id)
  OR is_impersonating_school(school_id)
)
WITH CHECK (
  can_manage_school_data(school_id)
);

DROP POLICY IF EXISTS "Teachers can view their school sessions" ON academic_sessions;
CREATE POLICY "Teachers can view their school sessions" ON academic_sessions
FOR SELECT
USING (
  can_view_school_data(school_id)
  OR is_impersonating_school(school_id)
);

COMMENT ON FUNCTION is_impersonating_school IS 'Helper function to check if current user is impersonating a school as either system admin or district admin';