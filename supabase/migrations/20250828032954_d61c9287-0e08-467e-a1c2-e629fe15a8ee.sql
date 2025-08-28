-- Drop the problematic view
DROP VIEW IF EXISTS public.students_safe_view;

-- Instead of a view, let's update the existing get_student_safe_view function 
-- to work better with the current architecture and create a more secure approach

-- Create a function that teachers can call to get safe student data
CREATE OR REPLACE FUNCTION public.get_students_for_teacher(teacher_uuid uuid DEFAULT auth.uid())
RETURNS TABLE(
  id uuid,
  first_name text,
  last_name text,
  grade_level text,
  school_id bigint,
  student_id text,
  dismissal_group text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  parent_guardian_name text,
  contact_info text,
  special_notes text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow the function to be called by the authenticated user for themselves
  IF teacher_uuid != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: can only query your own students';
  END IF;

  -- Return students with appropriate data masking based on role
  RETURN QUERY
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
    -- Mask sensitive data for teachers
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
    -- System admins can see all students
    has_role(auth.uid(), 'system_admin'::app_role) OR
    -- School admins can see students in their school
    (has_role(auth.uid(), 'school_admin'::app_role) AND can_view_school_data(s.school_id)) OR
    -- Teachers can only see students in their classes
    (has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
      SELECT 1 
      FROM class_rosters cr
      JOIN class_teachers ct ON ct.class_id = cr.class_id
      WHERE cr.student_id = s.id 
        AND ct.teacher_id = auth.uid()
    ));
END;
$$;