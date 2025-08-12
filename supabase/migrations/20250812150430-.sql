-- Create unified security definer functions for consistent RLS
CREATE OR REPLACE FUNCTION public.can_manage_school_data(target_school_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    has_role(auth.uid(), 'system_admin'::app_role) OR
    (has_role(auth.uid(), 'school_admin'::app_role) AND get_user_school_id(auth.uid()) = target_school_id)
$$;

CREATE OR REPLACE FUNCTION public.can_view_school_data(target_school_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    has_role(auth.uid(), 'system_admin'::app_role) OR
    get_user_school_id(auth.uid()) = target_school_id
$$;

CREATE OR REPLACE FUNCTION public.can_manage_student(student_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    has_role(auth.uid(), 'system_admin'::app_role) OR
    (has_role(auth.uid(), 'school_admin'::app_role) AND EXISTS (
      SELECT 1 FROM students s WHERE s.id = student_uuid AND s.school_id = get_user_school_id(auth.uid())
    )) OR
    (has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
      SELECT 1 FROM students s
      JOIN class_rosters cr ON cr.student_id = s.id
      JOIN class_teachers ct ON ct.class_id = cr.class_id
      JOIN teachers t ON t.id = ct.teacher_id
      JOIN profiles p ON p.id = t.id
      WHERE s.id = student_uuid AND p.id = auth.uid()
    ))
$$;

CREATE OR REPLACE FUNCTION public.get_user_accessible_school_ids()
RETURNS bigint[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN has_role(auth.uid(), 'system_admin'::app_role) THEN 
      ARRAY(SELECT id FROM schools)
    ELSE 
      ARRAY[get_user_school_id(auth.uid())]
  END
$$;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "School users and system admins can manage bus_run_events" ON public.bus_run_events;
DROP POLICY IF EXISTS "School users can manage their school buses" ON public.buses;
DROP POLICY IF EXISTS "School users and system admins can manage car_line_sessions" ON public.car_line_sessions;
DROP POLICY IF EXISTS "School users can manage their school car lines" ON public.car_lines;
DROP POLICY IF EXISTS "School admins and system admins full access to class rosters" ON public.class_rosters;
DROP POLICY IF EXISTS "School admins and system admins full access to class teachers" ON public.class_teachers;
DROP POLICY IF EXISTS "School admins and system admins full access to classes" ON public.classes;
DROP POLICY IF EXISTS "School admins and system admins can manage dismissal group buse" ON public.dismissal_group_buses;
DROP POLICY IF EXISTS "School admins and system admins can manage dismissal group car " ON public.dismissal_group_car_lines;
DROP POLICY IF EXISTS "School admins and system admins can manage dismissal group clas" ON public.dismissal_group_classes;
DROP POLICY IF EXISTS "School admins and system admins can manage dismissal group stud" ON public.dismissal_group_students;
DROP POLICY IF EXISTS "School admins and system admins can manage dismissal groups" ON public.dismissal_groups;
DROP POLICY IF EXISTS "School admins and system admins can manage dismissal plans" ON public.dismissal_plans;
DROP POLICY IF EXISTS "School users and system admins can manage dismissal_run_groups" ON public.dismissal_run_groups;
DROP POLICY IF EXISTS "School users and system admins can manage dismissal_runs" ON public.dismissal_runs;
DROP POLICY IF EXISTS "School admins can update school profiles" ON public.profiles;
DROP POLICY IF EXISTS "School admins can view school profiles" ON public.profiles;
DROP POLICY IF EXISTS "System admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "School admins can update their school" ON public.schools;
DROP POLICY IF EXISTS "System admins can manage schools" ON public.schools;
DROP POLICY IF EXISTS "Users can view schools" ON public.schools;
DROP POLICY IF EXISTS "School admins and system admins can manage student bus assignme" ON public.student_bus_assignments;
DROP POLICY IF EXISTS "School admins and system admins can manage student car assignme" ON public.student_car_assignments;
DROP POLICY IF EXISTS "School admins and system admins can manage student walker assig" ON public.student_walker_assignments;
DROP POLICY IF EXISTS "School admins and system admins full access to students" ON public.students;
DROP POLICY IF EXISTS "School admins and system admins can manage teachers" ON public.teachers;
DROP POLICY IF EXISTS "School admins can manage school roles" ON public.user_roles;
DROP POLICY IF EXISTS "School admins can view roles in their school" ON public.user_roles;
DROP POLICY IF EXISTS "System admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "School users can manage their school walker locations" ON public.walker_locations;
DROP POLICY IF EXISTS "School users and system admins can manage walker_sessions" ON public.walker_sessions;

-- Create simple, consistent policies for all tables

-- bus_run_events
CREATE POLICY "system_admin_full_access" ON public.bus_run_events FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "school_users_manage" ON public.bus_run_events FOR ALL USING (can_view_school_data(school_id)) WITH CHECK (can_manage_school_data(school_id));

-- buses  
CREATE POLICY "system_admin_full_access" ON public.buses FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "school_admin_manage" ON public.buses FOR ALL USING (can_view_school_data(school_id)) WITH CHECK (can_manage_school_data(school_id));

-- car_line_sessions
CREATE POLICY "system_admin_full_access" ON public.car_line_sessions FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "school_users_manage" ON public.car_line_sessions FOR ALL USING (can_view_school_data(school_id)) WITH CHECK (can_manage_school_data(school_id));

-- car_lines
CREATE POLICY "system_admin_full_access" ON public.car_lines FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "school_admin_manage" ON public.car_lines FOR ALL USING (can_view_school_data(school_id)) WITH CHECK (can_manage_school_data(school_id));

-- class_rosters
CREATE POLICY "system_admin_full_access" ON public.class_rosters FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "school_users_manage" ON public.class_rosters FOR ALL USING (
  EXISTS (SELECT 1 FROM students s JOIN classes c ON c.school_id = s.school_id WHERE s.id = class_rosters.student_id AND can_view_school_data(s.school_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM students s JOIN classes c ON c.school_id = s.school_id WHERE s.id = class_rosters.student_id AND can_manage_school_data(s.school_id))
);

-- class_teachers
CREATE POLICY "system_admin_full_access" ON public.class_teachers FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "school_users_manage" ON public.class_teachers FOR ALL USING (
  EXISTS (SELECT 1 FROM classes c WHERE c.id = class_teachers.class_id AND can_view_school_data(c.school_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM classes c WHERE c.id = class_teachers.class_id AND can_manage_school_data(c.school_id))
);

-- classes
CREATE POLICY "system_admin_full_access" ON public.classes FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "school_admin_manage" ON public.classes FOR ALL USING (can_view_school_data(school_id)) WITH CHECK (can_manage_school_data(school_id));

-- dismissal_group_buses
CREATE POLICY "system_admin_full_access" ON public.dismissal_group_buses FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "school_users_manage" ON public.dismissal_group_buses FOR ALL USING (
  EXISTS (SELECT 1 FROM dismissal_groups dg JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id WHERE dg.id = dismissal_group_buses.dismissal_group_id AND can_view_school_data(dp.school_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM dismissal_groups dg JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id WHERE dg.id = dismissal_group_buses.dismissal_group_id AND can_manage_school_data(dp.school_id))
);

-- dismissal_group_car_lines
CREATE POLICY "system_admin_full_access" ON public.dismissal_group_car_lines FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "school_users_manage" ON public.dismissal_group_car_lines FOR ALL USING (
  EXISTS (SELECT 1 FROM dismissal_groups dg JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id WHERE dg.id = dismissal_group_car_lines.dismissal_group_id AND can_view_school_data(dp.school_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM dismissal_groups dg JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id WHERE dg.id = dismissal_group_car_lines.dismissal_group_id AND can_manage_school_data(dp.school_id))
);

-- dismissal_group_classes
CREATE POLICY "system_admin_full_access" ON public.dismissal_group_classes FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "school_users_manage" ON public.dismissal_group_classes FOR ALL USING (
  EXISTS (SELECT 1 FROM dismissal_groups dg JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id WHERE dg.id = dismissal_group_classes.dismissal_group_id AND can_view_school_data(dp.school_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM dismissal_groups dg JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id WHERE dg.id = dismissal_group_classes.dismissal_group_id AND can_manage_school_data(dp.school_id))
);

-- dismissal_group_students
CREATE POLICY "system_admin_full_access" ON public.dismissal_group_students FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "school_users_manage" ON public.dismissal_group_students FOR ALL USING (
  EXISTS (SELECT 1 FROM dismissal_groups dg JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id WHERE dg.id = dismissal_group_students.dismissal_group_id AND can_view_school_data(dp.school_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM dismissal_groups dg JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id WHERE dg.id = dismissal_group_students.dismissal_group_id AND can_manage_school_data(dp.school_id))
);

-- dismissal_groups
CREATE POLICY "system_admin_full_access" ON public.dismissal_groups FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "school_users_manage" ON public.dismissal_groups FOR ALL USING (
  EXISTS (SELECT 1 FROM dismissal_plans dp WHERE dp.id = dismissal_groups.dismissal_plan_id AND can_view_school_data(dp.school_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM dismissal_plans dp WHERE dp.id = dismissal_groups.dismissal_plan_id AND can_manage_school_data(dp.school_id))
);

-- dismissal_plans
CREATE POLICY "system_admin_full_access" ON public.dismissal_plans FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "school_users_manage" ON public.dismissal_plans FOR ALL USING (can_view_school_data(school_id)) WITH CHECK (can_manage_school_data(school_id));

-- dismissal_run_groups
CREATE POLICY "system_admin_full_access" ON public.dismissal_run_groups FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "school_users_manage" ON public.dismissal_run_groups FOR ALL USING (
  EXISTS (SELECT 1 FROM dismissal_runs dr WHERE dr.id = dismissal_run_groups.dismissal_run_id AND can_view_school_data(dr.school_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM dismissal_runs dr WHERE dr.id = dismissal_run_groups.dismissal_run_id AND can_manage_school_data(dr.school_id))
);

-- dismissal_runs
CREATE POLICY "system_admin_full_access" ON public.dismissal_runs FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "school_users_manage" ON public.dismissal_runs FOR ALL USING (can_view_school_data(school_id)) WITH CHECK (can_manage_school_data(school_id));

-- profiles
CREATE POLICY "system_admin_full_access" ON public.profiles FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "school_admin_manage_school_profiles" ON public.profiles FOR ALL USING (
  auth.uid() = id OR (has_role(auth.uid(), 'school_admin'::app_role) AND school_id IS NOT NULL AND can_view_school_data(school_id))
) WITH CHECK (
  auth.uid() = id OR (has_role(auth.uid(), 'school_admin'::app_role) AND school_id IS NOT NULL AND can_manage_school_data(school_id))
);

-- schools
CREATE POLICY "system_admin_full_access" ON public.schools FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "users_view_schools" ON public.schools FOR SELECT USING (true);
CREATE POLICY "school_admin_update_own_school" ON public.schools FOR UPDATE USING (can_manage_school_data(id));

-- student_bus_assignments
CREATE POLICY "system_admin_full_access" ON public.student_bus_assignments FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "school_users_manage_assignments" ON public.student_bus_assignments FOR ALL USING (
  can_manage_student(student_id)
) WITH CHECK (
  can_manage_student(student_id)
);

-- student_car_assignments
CREATE POLICY "system_admin_full_access" ON public.student_car_assignments FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "school_users_manage_assignments" ON public.student_car_assignments FOR ALL USING (
  can_manage_student(student_id)
) WITH CHECK (
  can_manage_student(student_id)
);

-- student_walker_assignments
CREATE POLICY "system_admin_full_access" ON public.student_walker_assignments FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "school_users_manage_assignments" ON public.student_walker_assignments FOR ALL USING (
  can_manage_student(student_id)
) WITH CHECK (
  can_manage_student(student_id)
);

-- students
CREATE POLICY "system_admin_full_access" ON public.students FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "school_admin_manage" ON public.students FOR ALL USING (can_view_school_data(school_id)) WITH CHECK (can_manage_school_data(school_id));
CREATE POLICY "teacher_view_assigned_students" ON public.students FOR SELECT USING (
  has_role(auth.uid(), 'teacher'::app_role) AND can_view_school_data(school_id) AND EXISTS (
    SELECT 1 FROM class_rosters cr
    JOIN class_teachers ct ON ct.class_id = cr.class_id
    JOIN teachers t ON t.id = ct.teacher_id
    JOIN profiles p ON p.id = t.id
    WHERE cr.student_id = students.id AND p.id = auth.uid()
  )
);

-- teachers
CREATE POLICY "system_admin_full_access" ON public.teachers FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "school_admin_manage" ON public.teachers FOR ALL USING (can_view_school_data(school_id)) WITH CHECK (can_manage_school_data(school_id));

-- user_roles
CREATE POLICY "system_admin_full_access" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "users_view_own_roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_roles" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "school_admin_manage_school_roles" ON public.user_roles FOR ALL USING (
  has_role(auth.uid(), 'school_admin'::app_role) AND EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = user_roles.user_id AND can_view_school_data(p.school_id)
  )
) WITH CHECK (
  has_role(auth.uid(), 'school_admin'::app_role) AND EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = user_roles.user_id AND can_manage_school_data(p.school_id)
  ) AND role = ANY (ARRAY['teacher'::app_role, 'school_admin'::app_role])
);

-- walker_locations
CREATE POLICY "system_admin_full_access" ON public.walker_locations FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "school_admin_manage" ON public.walker_locations FOR ALL USING (can_view_school_data(school_id)) WITH CHECK (can_manage_school_data(school_id));

-- walker_sessions
CREATE POLICY "system_admin_full_access" ON public.walker_sessions FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "school_users_manage" ON public.walker_sessions FOR ALL USING (can_view_school_data(school_id)) WITH CHECK (can_manage_school_data(school_id));