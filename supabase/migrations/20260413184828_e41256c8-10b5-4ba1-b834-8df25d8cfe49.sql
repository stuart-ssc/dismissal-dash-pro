
-- Add is_hidden column to classes
ALTER TABLE public.classes ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;

-- Create index for efficient filtering
CREATE INDEX idx_classes_is_hidden ON public.classes (school_id, is_hidden);

-- Replace get_classes_paginated to exclude hidden classes by default
CREATE OR REPLACE FUNCTION public.get_classes_paginated(
  p_school_id bigint,
  p_session_id uuid,
  p_search_query text DEFAULT ''::text,
  p_filter text DEFAULT 'all'::text,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  class_id uuid,
  class_name text,
  grade_level text,
  room_number text,
  period_number integer,
  period_name text,
  period_start_time time without time zone,
  period_end_time time without time zone,
  teacher_names text,
  student_count bigint,
  has_teachers boolean,
  has_students boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total bigint;
  v_show_hidden boolean;
BEGIN
  IF NOT can_view_school_data(p_school_id) THEN
    RAISE EXCEPTION 'Access denied: cannot view school data';
  END IF;

  -- Determine if we should show hidden classes
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
    v_total AS total_count
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

-- Create the convert_classes_to_groups RPC function
CREATE OR REPLACE FUNCTION public.convert_classes_to_groups(
  p_school_id bigint,
  p_session_id uuid,
  p_conversions jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_item jsonb;
  v_class_id uuid;
  v_display_name text;
  v_group_type text;
  v_action text;
  v_new_group_id uuid;
  v_student_count integer;
  v_groups_created integer := 0;
  v_classes_hidden integer := 0;
  v_total_students integer := 0;
BEGIN
  -- Verify the caller has admin access to this school
  IF NOT can_manage_school_data(p_school_id) THEN
    RAISE EXCEPTION 'Access denied: cannot manage school data';
  END IF;

  -- Process each conversion item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_conversions)
  LOOP
    v_class_id := (v_item->>'class_id')::uuid;
    v_display_name := v_item->>'display_name';
    v_group_type := v_item->>'group_type';
    v_action := COALESCE(v_item->>'action', 'convert');

    -- Verify class belongs to this school and session
    IF NOT EXISTS (
      SELECT 1 FROM classes 
      WHERE id = v_class_id 
        AND school_id = p_school_id 
        AND academic_session_id = p_session_id
    ) THEN
      RAISE EXCEPTION 'Class % not found in school % session %', v_class_id, p_school_id, p_session_id;
    END IF;

    IF v_action = 'convert' THEN
      -- Create the special use group
      INSERT INTO special_use_groups (
        name, group_type, school_id, created_by, academic_session_id, is_active
      ) VALUES (
        v_display_name, v_group_type, p_school_id, auth.uid(), p_session_id, true
      ) RETURNING id INTO v_new_group_id;

      -- Copy students from class_rosters to special_use_group_students
      INSERT INTO special_use_group_students (group_id, student_id)
      SELECT v_new_group_id, cr.student_id
      FROM class_rosters cr
      WHERE cr.class_id = v_class_id
      ON CONFLICT DO NOTHING;

      GET DIAGNOSTICS v_student_count = ROW_COUNT;
      v_total_students := v_total_students + v_student_count;
      v_groups_created := v_groups_created + 1;
    END IF;

    -- Both convert and hide actions mark the class as hidden
    UPDATE classes SET is_hidden = true WHERE id = v_class_id;
    v_classes_hidden := v_classes_hidden + 1;
  END LOOP;

  -- Log the conversion
  INSERT INTO audit_logs (table_name, action, user_id, details)
  VALUES (
    'classes',
    'CONVERT_CLASSES_TO_GROUPS',
    auth.uid(),
    jsonb_build_object(
      'school_id', p_school_id,
      'session_id', p_session_id,
      'groups_created', v_groups_created,
      'classes_hidden', v_classes_hidden,
      'total_students_migrated', v_total_students
    )
  );

  RETURN jsonb_build_object(
    'groups_created', v_groups_created,
    'classes_hidden', v_classes_hidden,
    'total_students_migrated', v_total_students
  );
END;
$function$;
