-- Fix conflicting RLS policies by separating write operations from SELECT

-- 1) Student Walker Assignments
DROP POLICY IF EXISTS "student_walker_assignments_admin_write" ON public.student_walker_assignments;

CREATE POLICY "student_walker_assignments_admin_insert"
ON public.student_walker_assignments
FOR INSERT
TO authenticated
WITH CHECK (can_manage_student(student_id));

CREATE POLICY "student_walker_assignments_admin_update"
ON public.student_walker_assignments
FOR UPDATE
TO authenticated
USING (can_manage_student(student_id))
WITH CHECK (can_manage_student(student_id));

CREATE POLICY "student_walker_assignments_admin_delete"
ON public.student_walker_assignments
FOR DELETE
TO authenticated
USING (can_manage_student(student_id));

-- 2) Student Car Assignments
DROP POLICY IF EXISTS "student_car_assignments_admin_write" ON public.student_car_assignments;

CREATE POLICY "student_car_assignments_admin_insert"
ON public.student_car_assignments
FOR INSERT
TO authenticated
WITH CHECK (can_manage_student(student_id));

CREATE POLICY "student_car_assignments_admin_update"
ON public.student_car_assignments
FOR UPDATE
TO authenticated
USING (can_manage_student(student_id))
WITH CHECK (can_manage_student(student_id));

CREATE POLICY "student_car_assignments_admin_delete"
ON public.student_car_assignments
FOR DELETE
TO authenticated
USING (can_manage_student(student_id));

-- 3) Student Bus Assignments
DROP POLICY IF EXISTS "student_bus_assignments_admin_write" ON public.student_bus_assignments;

CREATE POLICY "student_bus_assignments_admin_insert"
ON public.student_bus_assignments
FOR INSERT
TO authenticated
WITH CHECK (can_manage_student(student_id));

CREATE POLICY "student_bus_assignments_admin_update"
ON public.student_bus_assignments
FOR UPDATE
TO authenticated
USING (can_manage_student(student_id))
WITH CHECK (can_manage_student(student_id));

CREATE POLICY "student_bus_assignments_admin_delete"
ON public.student_bus_assignments
FOR DELETE
TO authenticated
USING (can_manage_student(student_id));