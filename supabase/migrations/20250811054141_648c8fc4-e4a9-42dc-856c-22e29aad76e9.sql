-- Grant system_admin full access alongside school-scoped access across key tables

-- Helper: function has_role already exists per context

-- 1) Classes and related tables
DROP POLICY IF EXISTS "School admins full access to classes" ON public.classes;
CREATE POLICY "School admins and system admins full access to classes"
ON public.classes AS RESTRICTIVE FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role) OR get_user_school_id(auth.uid()) = school_id)
WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role) OR get_user_school_id(auth.uid()) = school_id);

DROP POLICY IF EXISTS "School admins full access to class teachers" ON public.class_teachers;
CREATE POLICY "School admins and system admins full access to class teachers"
ON public.class_teachers AS RESTRICTIVE FOR ALL
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR EXISTS (
    SELECT 1 FROM classes c WHERE c.id = class_teachers.class_id AND get_user_school_id(auth.uid()) = c.school_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'system_admin'::app_role) OR EXISTS (
    SELECT 1 FROM classes c WHERE c.id = class_teachers.class_id AND get_user_school_id(auth.uid()) = c.school_id
  )
);

DROP POLICY IF EXISTS "School admins full access to class rosters" ON public.class_rosters;
CREATE POLICY "School admins and system admins full access to class rosters"
ON public.class_rosters AS RESTRICTIVE FOR ALL
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR EXISTS (
    SELECT 1 FROM students s WHERE s.id = class_rosters.student_id AND get_user_school_id(auth.uid()) = s.school_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'system_admin'::app_role) OR EXISTS (
    SELECT 1 FROM students s WHERE s.id = class_rosters.student_id AND get_user_school_id(auth.uid()) = s.school_id
  )
);

-- 2) Students and assignments
DROP POLICY IF EXISTS "School admins full access to students" ON public.students;
CREATE POLICY "School admins and system admins full access to students"
ON public.students AS RESTRICTIVE FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role) OR get_user_school_id(auth.uid()) = school_id)
WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role) OR get_user_school_id(auth.uid()) = school_id);

DROP POLICY IF EXISTS "School admins can manage student bus assignments" ON public.student_bus_assignments;
CREATE POLICY "School admins and system admins can manage student bus assignments"
ON public.student_bus_assignments AS RESTRICTIVE FOR ALL
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR EXISTS (
    SELECT 1 FROM students s WHERE s.id = student_bus_assignments.student_id AND get_user_school_id(auth.uid()) = s.school_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'system_admin'::app_role) OR EXISTS (
    SELECT 1 FROM students s WHERE s.id = student_bus_assignments.student_id AND get_user_school_id(auth.uid()) = s.school_id
  )
);

DROP POLICY IF EXISTS "School admins can manage student car assignments" ON public.student_car_assignments;
CREATE POLICY "School admins and system admins can manage student car assignments"
ON public.student_car_assignments AS RESTRICTIVE FOR ALL
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR EXISTS (
    SELECT 1 FROM students s WHERE s.id = student_car_assignments.student_id AND get_user_school_id(auth.uid()) = s.school_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'system_admin'::app_role) OR EXISTS (
    SELECT 1 FROM students s WHERE s.id = student_car_assignments.student_id AND get_user_school_id(auth.uid()) = s.school_id
  )
);

DROP POLICY IF EXISTS "School admins can manage student walker assignments" ON public.student_walker_assignments;
CREATE POLICY "School admins and system admins can manage student walker assignments"
ON public.student_walker_assignments AS RESTRICTIVE FOR ALL
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR EXISTS (
    SELECT 1 FROM students s WHERE s.id = student_walker_assignments.student_id AND get_user_school_id(auth.uid()) = s.school_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'system_admin'::app_role) OR EXISTS (
    SELECT 1 FROM students s WHERE s.id = student_walker_assignments.student_id AND get_user_school_id(auth.uid()) = s.school_id
  )
);

-- 3) Transportation entities
DROP POLICY IF EXISTS "School admins can manage buses" ON public.buses;
CREATE POLICY "School admins and system admins can manage buses"
ON public.buses AS RESTRICTIVE FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role) OR get_user_school_id(auth.uid()) = school_id)
WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role) OR get_user_school_id(auth.uid()) = school_id);

DROP POLICY IF EXISTS "School users can manage bus_run_events" ON public.bus_run_events;
CREATE POLICY "School users and system admins can manage bus_run_events"
ON public.bus_run_events AS RESTRICTIVE FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role) OR get_user_school_id(auth.uid()) = school_id)
WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role) OR get_user_school_id(auth.uid()) = school_id);

DROP POLICY IF EXISTS "School admins can manage car lines" ON public.car_lines;
CREATE POLICY "School admins and system admins can manage car lines"
ON public.car_lines AS RESTRICTIVE FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role) OR get_user_school_id(auth.uid()) = school_id)
WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role) OR get_user_school_id(auth.uid()) = school_id);

DROP POLICY IF EXISTS "School users can manage car_line_sessions" ON public.car_line_sessions;
CREATE POLICY "School users and system admins can manage car_line_sessions"
ON public.car_line_sessions AS RESTRICTIVE FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role) OR get_user_school_id(auth.uid()) = school_id)
WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role) OR get_user_school_id(auth.uid()) = school_id);

DROP POLICY IF EXISTS "School admins can manage walker locations" ON public.walker_locations;
CREATE POLICY "School admins and system admins can manage walker locations"
ON public.walker_locations AS RESTRICTIVE FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role) OR get_user_school_id(auth.uid()) = school_id)
WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role) OR get_user_school_id(auth.uid()) = school_id);

DROP POLICY IF EXISTS "School users can manage walker_sessions" ON public.walker_sessions;
CREATE POLICY "School users and system admins can manage walker_sessions"
ON public.walker_sessions AS RESTRICTIVE FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role) OR get_user_school_id(auth.uid()) = school_id)
WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role) OR get_user_school_id(auth.uid()) = school_id);

-- 4) Dismissal runs and links (some policies already updated earlier)
DROP POLICY IF EXISTS "School users can manage dismissal_runs" ON public.dismissal_runs;
CREATE POLICY "School users and system admins can manage dismissal_runs"
ON public.dismissal_runs AS RESTRICTIVE FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role) OR get_user_school_id(auth.uid()) = school_id)
WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role) OR get_user_school_id(auth.uid()) = school_id);

DROP POLICY IF EXISTS "School users can manage dismissal_run_groups" ON public.dismissal_run_groups;
CREATE POLICY "School users and system admins can manage dismissal_run_groups"
ON public.dismissal_run_groups AS RESTRICTIVE FOR ALL
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR EXISTS (
    SELECT 1 FROM dismissal_runs dr WHERE dr.id = dismissal_run_groups.dismissal_run_id AND get_user_school_id(auth.uid()) = dr.school_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'system_admin'::app_role) OR EXISTS (
    SELECT 1 FROM dismissal_runs dr WHERE dr.id = dismissal_run_groups.dismissal_run_id AND get_user_school_id(auth.uid()) = dr.school_id
  )
);

DROP POLICY IF EXISTS "School admins can manage dismissal group buses" ON public.dismissal_group_buses;
CREATE POLICY "School admins and system admins can manage dismissal group buses"
ON public.dismissal_group_buses AS RESTRICTIVE FOR ALL
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR EXISTS (
    SELECT 1 FROM dismissal_groups dg JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id
    WHERE dg.id = dismissal_group_buses.dismissal_group_id AND get_user_school_id(auth.uid()) = dp.school_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'system_admin'::app_role) OR EXISTS (
    SELECT 1 FROM dismissal_groups dg JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id
    WHERE dg.id = dismissal_group_buses.dismissal_group_id AND get_user_school_id(auth.uid()) = dp.school_id
  )
);

DROP POLICY IF EXISTS "School admins can manage dismissal group car lines" ON public.dismissal_group_car_lines;
CREATE POLICY "School admins and system admins can manage dismissal group car lines"
ON public.dismissal_group_car_lines AS RESTRICTIVE FOR ALL
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR EXISTS (
    SELECT 1 FROM dismissal_groups dg JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id
    WHERE dg.id = dismissal_group_car_lines.dismissal_group_id AND get_user_school_id(auth.uid()) = dp.school_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'system_admin'::app_role) OR EXISTS (
    SELECT 1 FROM dismissal_groups dg JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id
    WHERE dg.id = dismissal_group_car_lines.dismissal_group_id AND get_user_school_id(auth.uid()) = dp.school_id
  )
);

DROP POLICY IF EXISTS "School admins can manage dismissal group classes" ON public.dismissal_group_classes;
CREATE POLICY "School admins and system admins can manage dismissal group classes"
ON public.dismissal_group_classes AS RESTRICTIVE FOR ALL
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR EXISTS (
    SELECT 1 FROM dismissal_groups dg JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id
    WHERE dg.id = dismissal_group_classes.dismissal_group_id AND get_user_school_id(auth.uid()) = dp.school_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'system_admin'::app_role) OR EXISTS (
    SELECT 1 FROM dismissal_groups dg JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id
    WHERE dg.id = dismissal_group_classes.dismissal_group_id AND get_user_school_id(auth.uid()) = dp.school_id
  )
);

DROP POLICY IF EXISTS "School admins can manage dismissal group students" ON public.dismissal_group_students;
CREATE POLICY "School admins and system admins can manage dismissal group students"
ON public.dismissal_group_students AS RESTRICTIVE FOR ALL
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR EXISTS (
    SELECT 1 FROM dismissal_groups dg JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id
    WHERE dg.id = dismissal_group_students.dismissal_group_id AND get_user_school_id(auth.uid()) = dp.school_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'system_admin'::app_role) OR EXISTS (
    SELECT 1 FROM dismissal_groups dg JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id
    WHERE dg.id = dismissal_group_students.dismissal_group_id AND get_user_school_id(auth.uid()) = dp.school_id
  )
);

-- 5) Teachers
DROP POLICY IF EXISTS "School admins can manage teachers" ON public.teachers;
CREATE POLICY "School admins and system admins can manage teachers"
ON public.teachers AS RESTRICTIVE FOR ALL
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR EXISTS (
    SELECT 1 FROM profiles p JOIN user_roles ur ON p.id = ur.user_id
    WHERE p.id = auth.uid() AND p.school_id = teachers.school_id AND ur.role = 'school_admin'::app_role
  )
)
WITH CHECK (
  has_role(auth.uid(), 'system_admin'::app_role) OR EXISTS (
    SELECT 1 FROM profiles p JOIN user_roles ur ON p.id = ur.user_id
    WHERE p.id = auth.uid() AND p.school_id = teachers.school_id AND ur.role = 'school_admin'::app_role
  )
);
