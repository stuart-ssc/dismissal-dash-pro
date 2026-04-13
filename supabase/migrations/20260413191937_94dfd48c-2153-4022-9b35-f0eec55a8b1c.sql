
CREATE OR REPLACE FUNCTION public.convert_classes_to_groups(p_school_id bigint, p_session_id uuid, p_conversions jsonb, p_reviewed_class_ids uuid[] DEFAULT '{}'::uuid[])
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
  v_classes_reviewed integer := 0;
BEGIN
  IF NOT can_manage_school_data(p_school_id) THEN
    RAISE EXCEPTION 'Access denied: cannot manage school data';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_conversions)
  LOOP
    v_class_id := (v_item->>'class_id')::uuid;
    v_display_name := v_item->>'display_name';
    v_group_type := v_item->>'group_type';
    v_action := COALESCE(v_item->>'action', 'convert');

    IF NOT EXISTS (
      SELECT 1 FROM classes 
      WHERE id = v_class_id 
        AND school_id = p_school_id 
        AND academic_session_id = p_session_id
    ) THEN
      RAISE EXCEPTION 'Class % not found in school % session %', v_class_id, p_school_id, p_session_id;
    END IF;

    IF v_action = 'convert' THEN
      INSERT INTO special_use_groups (
        name, group_type, school_id, created_by, academic_session_id, is_active
      ) VALUES (
        v_display_name, v_group_type, p_school_id, auth.uid(), p_session_id, true
      ) RETURNING id INTO v_new_group_id;

      INSERT INTO special_use_group_students (group_id, student_id, added_by)
      SELECT v_new_group_id, cr.student_id, auth.uid()
      FROM class_rosters cr
      WHERE cr.class_id = v_class_id
      ON CONFLICT DO NOTHING;

      GET DIAGNOSTICS v_student_count = ROW_COUNT;
      v_total_students := v_total_students + v_student_count;
      v_groups_created := v_groups_created + 1;
    END IF;

    UPDATE classes SET is_hidden = true WHERE id = v_class_id;
    v_classes_hidden := v_classes_hidden + 1;
  END LOOP;

  -- Mark unselected classes as reviewed
  IF array_length(p_reviewed_class_ids, 1) > 0 THEN
    UPDATE classes
    SET is_reviewed = true
    WHERE id = ANY(p_reviewed_class_ids)
      AND school_id = p_school_id
      AND academic_session_id = p_session_id;

    GET DIAGNOSTICS v_classes_reviewed = ROW_COUNT;
  END IF;

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
      'total_students_migrated', v_total_students,
      'classes_reviewed', v_classes_reviewed
    )
  );

  RETURN jsonb_build_object(
    'groups_created', v_groups_created,
    'classes_hidden', v_classes_hidden,
    'total_students_migrated', v_total_students,
    'classes_reviewed', v_classes_reviewed
  );
END;
$function$;
