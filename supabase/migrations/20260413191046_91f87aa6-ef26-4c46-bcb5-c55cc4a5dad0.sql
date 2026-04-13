
DROP FUNCTION IF EXISTS public.get_classes_paginated(bigint, uuid, text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_classes_paginated(p_school_id bigint, p_session_id uuid, p_search_query text DEFAULT ''::text, p_filter text DEFAULT 'all'::text, p_limit integer DEFAULT 25, p_offset integer DEFAULT 0)
 RETURNS TABLE(class_id uuid, class_name text, grade_level text, room_number text, period_number integer, period_name text, period_start_time time without time zone, period_end_time time without time zone, teacher_names text, student_count bigint, has_teachers boolean, has_students boolean, created_at timestamp with time zone, updated_at timestamp with time zone, total_count bigint, is_reviewed boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total bigint;
  v_show_hidden boolean;
BEGIN
  IF NOT can_view_school_data(p_school_id) THEN
    RAISE EXCEPTION 'Access denied: cannot view school data';
  END IF;

  v_show_hidden := (p_filter = 'hidden');

  SELECT COUNT(*) INTO v_total
  FROM classes c
  LEFT JOIN (
    SELECT ct.class_id, true as assigned
    FROM class_teachers ct GROUP BY ct.class_id
  ) ct_agg ON ct_agg.class_id = c.id
  LEFT JOIN (
    SELECT cr.class_id, true as enrolled
    FROM class_rosters cr GROUP BY cr.class_id
  ) cr_agg ON cr_agg.class_id = c.id
  WHERE c.school_id = p_school_id
    AND c.academic_session_id = p_session_id
    AND (v_show_hidden OR c.is_hidden = false)
    AND (v_show_hidden = false OR c.is_hidden = true)
    AND (p_search_query = '' OR c.class_name ILIKE '%' || p_search_query || '%')
    AND (
      p_filter = 'all' OR p_filter = 'hidden'
      OR (p_filter = 'assigned' AND (ct_agg.assigned IS TRUE OR cr_agg.enrolled IS TRUE))
      OR (p_filter = 'unassigned' AND ct_agg.assigned IS NULL AND cr_agg.enrolled IS NULL)
      OR (p_filter = 'with_students' AND cr_agg.enrolled IS TRUE)
      OR (p_filter = 'with_teachers' AND ct_agg.assigned IS TRUE)
    );

  RETURN QUERY
  SELECT
    c.id AS class_id,
    c.class_name,
    c.grade_level,
    c.room_number,
    c.period_number,
    c.period_name,
    c.period_start_time,
    c.period_end_time,
    COALESCE(t_agg.names, '') AS teacher_names,
    COALESCE(s_agg.cnt, 0) AS student_count,
    (t_agg.names IS NOT NULL) AS has_teachers,
    (COALESCE(s_agg.cnt, 0) > 0) AS has_students,
    c.created_at,
    c.updated_at,
    v_total AS total_count,
    c.is_reviewed
  FROM classes c
  LEFT JOIN (
    SELECT ct.class_id,
           string_agg(DISTINCT (t.first_name || ' ' || t.last_name), ', ' ORDER BY (t.first_name || ' ' || t.last_name)) AS names
    FROM class_teachers ct
    JOIN teachers t ON t.id = ct.teacher_id
    GROUP BY ct.class_id
  ) t_agg ON t_agg.class_id = c.id
  LEFT JOIN (
    SELECT cr.class_id, COUNT(*) AS cnt
    FROM class_rosters cr GROUP BY cr.class_id
  ) s_agg ON s_agg.class_id = c.id
  WHERE c.school_id = p_school_id
    AND c.academic_session_id = p_session_id
    AND (v_show_hidden OR c.is_hidden = false)
    AND (v_show_hidden = false OR c.is_hidden = true)
    AND (p_search_query = '' OR c.class_name ILIKE '%' || p_search_query || '%')
    AND (
      p_filter = 'all' OR p_filter = 'hidden'
      OR (p_filter = 'assigned' AND (t_agg.names IS NOT NULL OR COALESCE(s_agg.cnt, 0) > 0))
      OR (p_filter = 'unassigned' AND t_agg.names IS NULL AND COALESCE(s_agg.cnt, 0) = 0)
      OR (p_filter = 'with_students' AND COALESCE(s_agg.cnt, 0) > 0)
      OR (p_filter = 'with_teachers' AND t_agg.names IS NOT NULL)
    )
  ORDER BY
    CASE WHEN t_agg.names IS NOT NULL OR COALESCE(s_agg.cnt, 0) > 0 THEN 0 ELSE 1 END,
    COALESCE(s_agg.cnt, 0) DESC,
    c.class_name ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;
