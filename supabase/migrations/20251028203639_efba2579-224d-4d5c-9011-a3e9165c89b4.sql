-- Fix RLS policies for student transportation assignments to allow teachers to view all students in their school

-- 1) Student Walker Assignments
DROP POLICY IF EXISTS "student_walker_assignments_manage" ON public.student_walker_assignments;

-- Allow teachers and school admins to SELECT assignments for their school
CREATE POLICY "student_walker_assignments_school_select"
ON public.student_walker_assignments
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR EXISTS (
    SELECT 1 FROM students s 
    WHERE s.id = student_walker_assignments.student_id 
      AND s.school_id = get_user_school_id(auth.uid())
  )
);

-- Restrict write operations to admins only
CREATE POLICY "student_walker_assignments_admin_write"
ON public.student_walker_assignments
FOR ALL
TO authenticated
USING (can_manage_student(student_id))
WITH CHECK (can_manage_student(student_id));

-- 2) Student Car Assignments
DROP POLICY IF EXISTS "student_car_assignments_manage" ON public.student_car_assignments;

CREATE POLICY "student_car_assignments_school_select"
ON public.student_car_assignments
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR EXISTS (
    SELECT 1 FROM students s 
    WHERE s.id = student_car_assignments.student_id 
      AND s.school_id = get_user_school_id(auth.uid())
  )
);

CREATE POLICY "student_car_assignments_admin_write"
ON public.student_car_assignments
FOR ALL
TO authenticated
USING (can_manage_student(student_id))
WITH CHECK (can_manage_student(student_id));

-- 3) Student Bus Assignments
DROP POLICY IF EXISTS "student_bus_assignments_manage" ON public.student_bus_assignments;

CREATE POLICY "student_bus_assignments_school_select"
ON public.student_bus_assignments
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR EXISTS (
    SELECT 1 FROM students s 
    WHERE s.id = student_bus_assignments.student_id 
      AND s.school_id = get_user_school_id(auth.uid())
  )
);

CREATE POLICY "student_bus_assignments_admin_write"
ON public.student_bus_assignments
FOR ALL
TO authenticated
USING (can_manage_student(student_id))
WITH CHECK (can_manage_student(student_id));