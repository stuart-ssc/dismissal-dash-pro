-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "system_admin_full_access" ON public.bus_run_events;
DROP POLICY IF EXISTS "school_users_manage" ON public.bus_run_events;
DROP POLICY IF EXISTS "system_admin_full_access" ON public.buses;
DROP POLICY IF EXISTS "school_admin_manage" ON public.buses;
DROP POLICY IF EXISTS "system_admin_full_access" ON public.car_line_sessions;
DROP POLICY IF EXISTS "school_users_manage" ON public.car_line_sessions;
DROP POLICY IF EXISTS "system_admin_full_access" ON public.car_lines;
DROP POLICY IF EXISTS "school_admin_manage" ON public.car_lines;
DROP POLICY IF EXISTS "system_admin_full_access" ON public.class_rosters;
DROP POLICY IF EXISTS "school_users_manage" ON public.class_rosters;
DROP POLICY IF EXISTS "system_admin_full_access" ON public.class_teachers;
DROP POLICY IF EXISTS "school_users_manage" ON public.class_teachers;
DROP POLICY IF EXISTS "system_admin_full_access" ON public.classes;
DROP POLICY IF EXISTS "school_admin_manage" ON public.classes;
DROP POLICY IF EXISTS "system_admin_full_access" ON public.dismissal_group_buses;
DROP POLICY IF EXISTS "school_users_manage" ON public.dismissal_group_buses;
DROP POLICY IF EXISTS "system_admin_full_access" ON public.dismissal_group_car_lines;
DROP POLICY IF EXISTS "school_users_manage" ON public.dismissal_group_car_lines;
DROP POLICY IF EXISTS "system_admin_full_access" ON public.dismissal_group_classes;
DROP POLICY IF EXISTS "school_users_manage" ON public.dismissal_group_classes;
DROP POLICY IF EXISTS "system_admin_full_access" ON public.dismissal_group_students;
DROP POLICY IF EXISTS "school_users_manage" ON public.dismissal_group_students;
DROP POLICY IF EXISTS "system_admin_full_access" ON public.dismissal_groups;
DROP POLICY IF EXISTS "school_users_manage" ON public.dismissal_groups;
DROP POLICY IF EXISTS "system_admin_full_access" ON public.dismissal_plans;
DROP POLICY IF EXISTS "school_users_manage" ON public.dismissal_plans;
DROP POLICY IF EXISTS "system_admin_full_access" ON public.dismissal_run_groups;
DROP POLICY IF EXISTS "school_users_manage" ON public.dismissal_run_groups;
DROP POLICY IF EXISTS "system_admin_full_access" ON public.dismissal_runs;
DROP POLICY IF EXISTS "school_users_manage" ON public.dismissal_runs;
DROP POLICY IF EXISTS "system_admin_full_access" ON public.profiles;
DROP POLICY IF EXISTS "school_admin_manage_school_profiles" ON public.profiles;
DROP POLICY IF EXISTS "system_admin_full_access" ON public.schools;
DROP POLICY IF EXISTS "users_view_schools" ON public.schools;
DROP POLICY IF EXISTS "school_admin_update_own_school" ON public.schools;
DROP POLICY IF EXISTS "system_admin_full_access" ON public.student_bus_assignments;
DROP POLICY IF EXISTS "school_users_manage_assignments" ON public.student_bus_assignments;
DROP POLICY IF EXISTS "system_admin_full_access" ON public.student_car_assignments;
DROP POLICY IF EXISTS "school_users_manage_assignments" ON public.student_car_assignments;
DROP POLICY IF EXISTS "system_admin_full_access" ON public.student_walker_assignments;
DROP POLICY IF EXISTS "school_users_manage_assignments" ON public.student_walker_assignments;
DROP POLICY IF EXISTS "system_admin_full_access" ON public.students;
DROP POLICY IF EXISTS "school_admin_manage" ON public.students;
DROP POLICY IF EXISTS "teacher_view_assigned_students" ON public.students;
DROP POLICY IF EXISTS "system_admin_full_access" ON public.teachers;
DROP POLICY IF EXISTS "school_admin_manage" ON public.teachers;
DROP POLICY IF EXISTS "system_admin_full_access" ON public.user_roles;
DROP POLICY IF EXISTS "users_view_own_roles" ON public.user_roles;
DROP POLICY IF EXISTS "users_insert_own_roles" ON public.user_roles;
DROP POLICY IF EXISTS "school_admin_manage_school_roles" ON public.user_roles;
DROP POLICY IF EXISTS "system_admin_full_access" ON public.walker_locations;
DROP POLICY IF EXISTS "school_admin_manage" ON public.walker_locations;
DROP POLICY IF EXISTS "system_admin_full_access" ON public.walker_sessions;
DROP POLICY IF EXISTS "school_users_manage" ON public.walker_sessions;

-- Create simple, consistent policies for all tables with unique names

-- bus_run_events
CREATE POLICY "bus_run_events_system_admin" ON public.bus_run_events FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "bus_run_events_school_users" ON public.bus_run_events FOR ALL USING (can_view_school_data(school_id)) WITH CHECK (can_manage_school_data(school_id));

-- buses  
CREATE POLICY "buses_system_admin" ON public.buses FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "buses_school_admin" ON public.buses FOR ALL USING (can_view_school_data(school_id)) WITH CHECK (can_manage_school_data(school_id));

-- car_line_sessions
CREATE POLICY "car_line_sessions_system_admin" ON public.car_line_sessions FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "car_line_sessions_school_users" ON public.car_line_sessions FOR ALL USING (can_view_school_data(school_id)) WITH CHECK (can_manage_school_data(school_id));

-- car_lines
CREATE POLICY "car_lines_system_admin" ON public.car_lines FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "car_lines_school_admin" ON public.car_lines FOR ALL USING (can_view_school_data(school_id)) WITH CHECK (can_manage_school_data(school_id));

-- class_rosters
CREATE POLICY "class_rosters_system_admin" ON public.class_rosters FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "class_rosters_school_users" ON public.class_rosters FOR ALL USING (
  EXISTS (SELECT 1 FROM students s JOIN classes c ON c.school_id = s.school_id WHERE s.id = class_rosters.student_id AND can_view_school_data(s.school_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM students s JOIN classes c ON c.school_id = s.school_id WHERE s.id = class_rosters.student_id AND can_manage_school_data(s.school_id))
);

-- class_teachers
CREATE POLICY "class_teachers_system_admin" ON public.class_teachers FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "class_teachers_school_users" ON public.class_teachers FOR ALL USING (
  EXISTS (SELECT 1 FROM classes c WHERE c.id = class_teachers.class_id AND can_view_school_data(c.school_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM classes c WHERE c.id = class_teachers.class_id AND can_manage_school_data(c.school_id))
);

-- classes
CREATE POLICY "classes_system_admin" ON public.classes FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "classes_school_admin" ON public.classes FOR ALL USING (can_view_school_data(school_id)) WITH CHECK (can_manage_school_data(school_id));

-- dismissal_group_buses
CREATE POLICY "dismissal_group_buses_system_admin" ON public.dismissal_group_buses FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "dismissal_group_buses_school_users" ON public.dismissal_group_buses FOR ALL USING (
  EXISTS (SELECT 1 FROM dismissal_groups dg JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id WHERE dg.id = dismissal_group_buses.dismissal_group_id AND can_view_school_data(dp.school_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM dismissal_groups dg JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id WHERE dg.id = dismissal_group_buses.dismissal_group_id AND can_manage_school_data(dp.school_id))
);

-- dismissal_group_car_lines
CREATE POLICY "dismissal_group_car_lines_system_admin" ON public.dismissal_group_car_lines FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "dismissal_group_car_lines_school_users" ON public.dismissal_group_car_lines FOR ALL USING (
  EXISTS (SELECT 1 FROM dismissal_groups dg JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id WHERE dg.id = dismissal_group_car_lines.dismissal_group_id AND can_view_school_data(dp.school_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM dismissal_groups dg JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id WHERE dg.id = dismissal_group_car_lines.dismissal_group_id AND can_manage_school_data(dp.school_id))
);

-- dismissal_group_classes
CREATE POLICY "dismissal_group_classes_system_admin" ON public.dismissal_group_classes FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "dismissal_group_classes_school_users" ON public.dismissal_group_classes FOR ALL USING (
  EXISTS (SELECT 1 FROM dismissal_groups dg JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id WHERE dg.id = dismissal_group_classes.dismissal_group_id AND can_view_school_data(dp.school_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM dismissal_groups dg JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id WHERE dg.id = dismissal_group_classes.dismissal_group_id AND can_manage_school_data(dp.school_id))
);

-- dismissal_group_students
CREATE POLICY "dismissal_group_students_system_admin" ON public.dismissal_group_students FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "dismissal_group_students_school_users" ON public.dismissal_group_students FOR ALL USING (
  EXISTS (SELECT 1 FROM dismissal_groups dg JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id WHERE dg.id = dismissal_group_students.dismissal_group_id AND can_view_school_data(dp.school_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM dismissal_groups dg JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id WHERE dg.id = dismissal_group_students.dismissal_group_id AND can_manage_school_data(dp.school_id))
);

-- dismissal_groups
CREATE POLICY "dismissal_groups_system_admin" ON public.dismissal_groups FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "dismissal_groups_school_users" ON public.dismissal_groups FOR ALL USING (
  EXISTS (SELECT 1 FROM dismissal_plans dp WHERE dp.id = dismissal_groups.dismissal_plan_id AND can_view_school_data(dp.school_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM dismissal_plans dp WHERE dp.id = dismissal_groups.dismissal_plan_id AND can_manage_school_data(dp.school_id))
);

-- dismissal_plans
CREATE POLICY "dismissal_plans_system_admin" ON public.dismissal_plans FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "dismissal_plans_school_users" ON public.dismissal_plans FOR ALL USING (can_view_school_data(school_id)) WITH CHECK (can_manage_school_data(school_id));

-- dismissal_run_groups
CREATE POLICY "dismissal_run_groups_system_admin" ON public.dismissal_run_groups FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "dismissal_run_groups_school_users" ON public.dismissal_run_groups FOR ALL USING (
  EXISTS (SELECT 1 FROM dismissal_runs dr WHERE dr.id = dismissal_run_groups.dismissal_run_id AND can_view_school_data(dr.school_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM dismissal_runs dr WHERE dr.id = dismissal_run_groups.dismissal_run_id AND can_manage_school_data(dr.school_id))
);

-- dismissal_runs
CREATE POLICY "dismissal_runs_system_admin" ON public.dismissal_runs FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "dismissal_runs_school_users" ON public.dismissal_runs FOR ALL USING (can_view_school_data(school_id)) WITH CHECK (can_manage_school_data(school_id));

-- profiles
CREATE POLICY "profiles_system_admin" ON public.profiles FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "profiles_users_own_and_school_admin" ON public.profiles FOR ALL USING (
  auth.uid() = id OR (has_role(auth.uid(), 'school_admin'::app_role) AND school_id IS NOT NULL AND can_view_school_data(school_id))
) WITH CHECK (
  auth.uid() = id OR (has_role(auth.uid(), 'school_admin'::app_role) AND school_id IS NOT NULL AND can_manage_school_data(school_id))
);

-- schools
CREATE POLICY "schools_system_admin" ON public.schools FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "schools_public_view" ON public.schools FOR SELECT USING (true);
CREATE POLICY "schools_admin_update" ON public.schools FOR UPDATE USING (can_manage_school_data(id));

-- student_bus_assignments - This is the key fix for the transportation display issue
CREATE POLICY "student_bus_assignments_system_admin" ON public.student_bus_assignments FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "student_bus_assignments_manage" ON public.student_bus_assignments FOR ALL USING (
  can_manage_student(student_id)
) WITH CHECK (
  can_manage_student(student_id)
);

-- student_car_assignments
CREATE POLICY "student_car_assignments_system_admin" ON public.student_car_assignments FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "student_car_assignments_manage" ON public.student_car_assignments FOR ALL USING (
  can_manage_student(student_id)
) WITH CHECK (
  can_manage_student(student_id)
);

-- student_walker_assignments
CREATE POLICY "student_walker_assignments_system_admin" ON public.student_walker_assignments FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "student_walker_assignments_manage" ON public.student_walker_assignments FOR ALL USING (
  can_manage_student(student_id)
) WITH CHECK (
  can_manage_student(student_id)
);

-- students
CREATE POLICY "students_system_admin" ON public.students FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "students_school_admin" ON public.students FOR ALL USING (can_view_school_data(school_id)) WITH CHECK (can_manage_school_data(school_id));
CREATE POLICY "students_teacher_assigned" ON public.students FOR SELECT USING (
  has_role(auth.uid(), 'teacher'::app_role) AND can_view_school_data(school_id) AND EXISTS (
    SELECT 1 FROM class_rosters cr
    JOIN class_teachers ct ON ct.class_id = cr.class_id
    JOIN teachers t ON t.id = ct.teacher_id
    JOIN profiles p ON p.id = t.id
    WHERE cr.student_id = students.id AND p.id = auth.uid()
  )
);

-- teachers
CREATE POLICY "teachers_system_admin" ON public.teachers FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "teachers_school_admin" ON public.teachers FOR ALL USING (can_view_school_data(school_id)) WITH CHECK (can_manage_school_data(school_id));

-- user_roles
CREATE POLICY "user_roles_system_admin" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "user_roles_own" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_roles_insert_own" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_roles_school_admin" ON public.user_roles FOR ALL USING (
  has_role(auth.uid(), 'school_admin'::app_role) AND EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = user_roles.user_id AND can_view_school_data(p.school_id)
  )
) WITH CHECK (
  has_role(auth.uid(), 'school_admin'::app_role) AND EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = user_roles.user_id AND can_manage_school_data(p.school_id)
  ) AND role = ANY (ARRAY['teacher'::app_role, 'school_admin'::app_role])
);

-- walker_locations
CREATE POLICY "walker_locations_system_admin" ON public.walker_locations FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "walker_locations_school_admin" ON public.walker_locations FOR ALL USING (can_view_school_data(school_id)) WITH CHECK (can_manage_school_data(school_id));

-- walker_sessions
CREATE POLICY "walker_sessions_system_admin" ON public.walker_sessions FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "walker_sessions_school_users" ON public.walker_sessions FOR ALL USING (can_view_school_data(school_id)) WITH CHECK (can_manage_school_data(school_id));