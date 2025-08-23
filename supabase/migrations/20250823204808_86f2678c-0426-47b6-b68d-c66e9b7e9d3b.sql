-- Enable Row Level Security on students_teacher_view
ALTER TABLE public.students_teacher_view ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for system admins (full access)
CREATE POLICY "students_teacher_view_system_admin_access"
ON public.students_teacher_view
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Add RLS policy for school admins (access to their school's students only)
CREATE POLICY "students_teacher_view_school_admin_access"
ON public.students_teacher_view
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'school_admin'::app_role) 
  AND can_view_school_data(school_id)
)
WITH CHECK (
  has_role(auth.uid(), 'school_admin'::app_role) 
  AND can_manage_school_data(school_id)
);

-- Add RLS policy for teachers (limited view of students in their classes only)
CREATE POLICY "students_teacher_view_teacher_limited_access"
ON public.students_teacher_view
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND EXISTS (
    SELECT 1
    FROM class_rosters cr
    JOIN class_teachers ct ON ct.class_id = cr.class_id
    WHERE cr.student_id = students_teacher_view.id 
    AND ct.teacher_id = auth.uid()
  )
);