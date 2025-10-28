-- Add RLS policy for teachers to view students assigned to transportation methods
-- This allows teachers in Walker Mode, Bus Mode, and Car Line Mode to see all students
-- assigned to those transportation methods, not just students in their classes

CREATE POLICY "students_teacher_view_transportation"
ON public.students
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND (
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