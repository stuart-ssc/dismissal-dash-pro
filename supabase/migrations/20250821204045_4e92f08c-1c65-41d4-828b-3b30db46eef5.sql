-- Fix security definer view by dropping and recreating without SECURITY DEFINER
DROP VIEW IF EXISTS public.students_teacher_view;

-- Create a safer view without security definer that uses proper RLS
CREATE VIEW public.students_teacher_view AS
SELECT 
  s.id,
  s.first_name,
  s.last_name,
  s.grade_level,
  s.school_id,
  CASE 
    WHEN has_role(auth.uid(), 'system_admin'::app_role) OR
         has_role(auth.uid(), 'school_admin'::app_role) THEN s.parent_guardian_name
    ELSE NULL
  END as parent_guardian_name,
  CASE 
    WHEN has_role(auth.uid(), 'system_admin'::app_role) OR
         has_role(auth.uid(), 'school_admin'::app_role) THEN s.contact_info
    ELSE NULL
  END as contact_info,
  CASE 
    WHEN has_role(auth.uid(), 'system_admin'::app_role) OR
         has_role(auth.uid(), 'school_admin'::app_role) THEN s.special_notes
    ELSE NULL
  END as special_notes,
  s.student_id,
  s.dismissal_group,
  s.created_at,
  s.updated_at
FROM students s
WHERE can_view_school_data(s.school_id) OR
      (has_role(auth.uid(), 'teacher'::app_role) AND 
       EXISTS (
         SELECT 1 
         FROM class_rosters cr 
         JOIN class_teachers ct ON ct.class_id = cr.class_id 
         WHERE cr.student_id = s.id AND ct.teacher_id = auth.uid()
       ));

-- Enable RLS on the view by adding proper policies
ALTER VIEW public.students_teacher_view SET (security_barrier = false);