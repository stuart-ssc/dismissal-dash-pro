-- Fix teacher transportation RLS policy to restrict to school-level access
-- This prevents teachers from viewing students with transportation assignments from other schools

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "students_teacher_view_transportation" ON public.students;

-- Recreate with school-level filtering using student_in_user_school function
CREATE POLICY "students_teacher_view_transportation"
ON public.students
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND student_in_user_school(students.id)  -- Restricts to teacher's school only
  AND (
    -- Can view students assigned to walker locations
    EXISTS (
      SELECT 1 FROM student_walker_assignments swa
      WHERE swa.student_id = students.id
    )
    OR
    -- Can view students assigned to buses
    EXISTS (
      SELECT 1 FROM student_bus_assignments sba
      WHERE sba.student_id = students.id
    )
    OR
    -- Can view students assigned to car lines
    EXISTS (
      SELECT 1 FROM student_car_assignments sca
      WHERE sca.student_id = students.id
    )
  )
);