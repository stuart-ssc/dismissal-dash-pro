CREATE OR REPLACE FUNCTION public.calculate_ic_data_quality(p_school_id bigint)
RETURNS TABLE(
  total_students INTEGER,
  students_missing_contact_info INTEGER,
  students_missing_parent_name INTEGER,
  students_missing_ic_id INTEGER,
  students_without_classes INTEGER,
  total_teachers INTEGER,
  teachers_missing_email INTEGER,
  teachers_missing_ic_id INTEGER,
  teachers_without_classes INTEGER,
  teachers_without_accounts INTEGER,
  total_classes INTEGER,
  classes_without_teachers INTEGER,
  classes_without_students INTEGER,
  overall_completeness_score NUMERIC,
  data_quality_grade TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student_metrics RECORD;
  v_teacher_metrics RECORD;
  v_class_metrics RECORD;
  v_completeness NUMERIC;
  v_grade TEXT;
BEGIN
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE contact_info IS NULL OR contact_info = '') as missing_contact,
    COUNT(*) FILTER (WHERE parent_guardian_name IS NULL OR parent_guardian_name = '') as missing_parent,
    COUNT(*) FILTER (WHERE ic_external_id IS NULL) as missing_ic_id,
    COUNT(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM class_rosters cr WHERE cr.student_id = students.id
    )) as without_classes
  INTO v_student_metrics
  FROM students
  WHERE school_id = p_school_id AND archived = false;
  
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE email IS NULL OR email = '') as missing_email,
    COUNT(*) FILTER (WHERE ic_external_id IS NULL) as missing_ic_id,
    COUNT(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM class_teachers ct WHERE ct.teacher_id = teachers.id
    )) as without_classes,
    COUNT(*) FILTER (WHERE account_completed_at IS NULL) as without_accounts
  INTO v_teacher_metrics
  FROM teachers
  WHERE school_id = p_school_id AND archived = false;
  
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM class_teachers ct WHERE ct.class_id = classes.id
    )) as without_teachers,
    COUNT(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM class_rosters cr WHERE cr.class_id = classes.id
    )) as without_students
  INTO v_class_metrics
  FROM classes
  WHERE school_id = p_school_id AND is_hidden = false;
  
  v_completeness := (
    CASE WHEN v_student_metrics.total > 0 THEN
      (1 - (v_student_metrics.missing_ic_id::NUMERIC / v_student_metrics.total * 0.50)
         - (v_student_metrics.without_classes::NUMERIC / v_student_metrics.total * 0.50)
      ) * 50
    ELSE 0 END
  ) + (
    CASE WHEN v_teacher_metrics.total > 0 THEN
      (1 - (v_teacher_metrics.missing_email::NUMERIC / v_teacher_metrics.total * 0.30)
         - (v_teacher_metrics.missing_ic_id::NUMERIC / v_teacher_metrics.total * 0.30)
         - (v_teacher_metrics.without_classes::NUMERIC / v_teacher_metrics.total * 0.30)
         - (v_teacher_metrics.without_accounts::NUMERIC / v_teacher_metrics.total * 0.10)
      ) * 30
    ELSE 0 END
  ) + (
    CASE WHEN v_class_metrics.total > 0 THEN
      (1 - (v_class_metrics.without_teachers::NUMERIC / v_class_metrics.total * 0.20)
         - (v_class_metrics.without_students::NUMERIC / v_class_metrics.total * 0.80)
      ) * 20
    ELSE 0 END
  );
  
  v_grade := CASE
    WHEN v_completeness >= 90 THEN 'A'
    WHEN v_completeness >= 80 THEN 'B'
    WHEN v_completeness >= 70 THEN 'C'
    WHEN v_completeness >= 60 THEN 'D'
    ELSE 'F'
  END;
  
  RETURN QUERY SELECT
    v_student_metrics.total::INTEGER,
    v_student_metrics.missing_contact::INTEGER,
    v_student_metrics.missing_parent::INTEGER,
    v_student_metrics.missing_ic_id::INTEGER,
    v_student_metrics.without_classes::INTEGER,
    v_teacher_metrics.total::INTEGER,
    v_teacher_metrics.missing_email::INTEGER,
    v_teacher_metrics.missing_ic_id::INTEGER,
    v_teacher_metrics.without_classes::INTEGER,
    v_teacher_metrics.without_accounts::INTEGER,
    v_class_metrics.total::INTEGER,
    v_class_metrics.without_teachers::INTEGER,
    v_class_metrics.without_students::INTEGER,
    ROUND(v_completeness, 2),
    v_grade;
END;
$$;