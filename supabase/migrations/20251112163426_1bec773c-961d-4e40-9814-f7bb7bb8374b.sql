-- Update get_school_classes to filter by academic session

DROP FUNCTION IF EXISTS public.get_school_classes(bigint);

CREATE OR REPLACE FUNCTION public.get_school_classes(
  p_school_id bigint,
  p_session_id uuid DEFAULT NULL
)
RETURNS TABLE(id uuid, class_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT c.id, c.class_name
  FROM classes c
  WHERE c.school_id = p_school_id
    AND can_view_school_data(c.school_id)
    AND (p_session_id IS NULL OR c.academic_session_id = p_session_id)
  ORDER BY c.class_name ASC;
$function$;

-- Update get_student_class_map to filter by academic session

DROP FUNCTION IF EXISTS public.get_student_class_map(uuid[]);

CREATE OR REPLACE FUNCTION public.get_student_class_map(
  p_student_ids uuid[],
  p_session_id uuid DEFAULT NULL
)
RETURNS TABLE(student_id uuid, class_id uuid, class_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT cr.student_id, cr.class_id, c.class_name
  FROM class_rosters cr
  JOIN classes c ON c.id = cr.class_id
  JOIN students s ON s.id = cr.student_id
  WHERE cr.student_id = ANY(p_student_ids)
    AND can_view_school_data(c.school_id)
    AND (p_session_id IS NULL OR (c.academic_session_id = p_session_id AND s.academic_session_id = p_session_id));
$function$;