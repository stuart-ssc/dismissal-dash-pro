-- Add district admin RLS policies for profiles and related tables

-- Profiles: District admins can view profiles from schools in their district
CREATE POLICY profiles_district_admin_view ON profiles
  FOR SELECT
  TO authenticated
  USING (
    has_district_admin_role(auth.uid()) 
    AND school_id IS NOT NULL 
    AND can_view_school_data(school_id)
  );

-- Students: District admins can view students from schools in their district
CREATE POLICY students_district_admin_view ON students
  FOR SELECT
  TO authenticated
  USING (
    has_district_admin_role(auth.uid())
    AND can_view_school_data(school_id)
  );

-- Teachers: District admins can view teachers from schools in their district
CREATE POLICY teachers_district_admin_view ON teachers
  FOR SELECT
  TO authenticated
  USING (
    has_district_admin_role(auth.uid())
    AND can_view_school_data(school_id)
  );

-- Classes: District admins can view classes from schools in their district
CREATE POLICY classes_district_admin_view ON classes
  FOR SELECT
  TO authenticated
  USING (
    has_district_admin_role(auth.uid())
    AND can_view_school_data(school_id)
  );

-- User Roles: District admins can view roles for users in their district schools
CREATE POLICY user_roles_district_admin_view ON user_roles
  FOR SELECT
  TO authenticated
  USING (
    has_district_admin_role(auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = user_roles.user_id
        AND p.school_id IS NOT NULL
        AND can_view_school_data(p.school_id)
    )
  );