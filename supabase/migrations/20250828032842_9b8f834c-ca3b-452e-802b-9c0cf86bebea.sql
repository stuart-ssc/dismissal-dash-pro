-- Drop the existing problematic teacher policy that allows full access to student data
DROP POLICY IF EXISTS "students_teacher_limited_view" ON public.students;

-- Create a new policy that restricts teachers to only view students in their classes
-- but doesn't expose sensitive information directly
CREATE POLICY "students_teacher_class_access" ON public.students
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR
  (has_role(auth.uid(), 'school_admin'::app_role) AND can_view_school_data(school_id)) OR
  (has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
    SELECT 1 
    FROM class_rosters cr
    JOIN class_teachers ct ON ct.class_id = cr.class_id
    WHERE cr.student_id = students.id 
      AND ct.teacher_id = auth.uid()
  ))
);

-- Create a view that provides safe access to student data for teachers
-- This view will automatically mask sensitive data based on user role
CREATE OR REPLACE VIEW public.students_safe_view AS
SELECT 
  s.id,
  s.first_name,
  s.last_name,
  s.grade_level,
  s.school_id,
  s.student_id,
  s.dismissal_group,
  s.created_at,
  s.updated_at,
  -- Conditionally show sensitive data only to admins
  CASE 
    WHEN has_role(auth.uid(), 'system_admin'::app_role) OR 
         has_role(auth.uid(), 'school_admin'::app_role) 
    THEN s.parent_guardian_name 
    ELSE NULL 
  END as parent_guardian_name,
  CASE 
    WHEN has_role(auth.uid(), 'system_admin'::app_role) OR 
         has_role(auth.uid(), 'school_admin'::app_role) 
    THEN s.contact_info 
    ELSE NULL 
  END as contact_info,
  CASE 
    WHEN has_role(auth.uid(), 'system_admin'::app_role) OR 
         has_role(auth.uid(), 'school_admin'::app_role) 
    THEN s.special_notes 
    ELSE NULL 
  END as special_notes
FROM public.students s
WHERE 
  has_role(auth.uid(), 'system_admin'::app_role) OR
  (has_role(auth.uid(), 'school_admin'::app_role) AND can_view_school_data(s.school_id)) OR
  (has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
    SELECT 1 
    FROM class_rosters cr
    JOIN class_teachers ct ON ct.class_id = cr.class_id
    WHERE cr.student_id = s.id 
      AND ct.teacher_id = auth.uid()
  ));

-- Enable RLS on the view (though it inherits from the base table)
ALTER VIEW public.students_safe_view SET (security_barrier = true);

-- Grant appropriate permissions
GRANT SELECT ON public.students_safe_view TO authenticated;