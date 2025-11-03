-- Add RPC functions to get all school classes and student class mappings
-- These functions bypass RLS restrictions to allow teachers to see all classes in their school

-- Function to get all classes for a school
CREATE OR REPLACE FUNCTION public.get_school_classes(p_school_id bigint)
RETURNS TABLE (id uuid, class_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.class_name
  FROM classes c
  WHERE c.school_id = p_school_id
    AND can_view_school_data(c.school_id)
  ORDER BY c.class_name ASC;
$$;

-- Function to get student-to-class mappings for a list of students
CREATE OR REPLACE FUNCTION public.get_student_class_map(p_student_ids uuid[])
RETURNS TABLE (student_id uuid, class_id uuid, class_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cr.student_id, cr.class_id, c.class_name
  FROM class_rosters cr
  JOIN classes c ON c.id = cr.class_id
  WHERE cr.student_id = ANY(p_student_ids)
    AND can_view_school_data(c.school_id);
$$;