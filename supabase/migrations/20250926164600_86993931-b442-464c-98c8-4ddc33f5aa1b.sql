-- Create RPC function to get school setup status without RLS restrictions
CREATE OR REPLACE FUNCTION public.get_school_setup_status(target_school_id bigint DEFAULT get_current_user_school_id())
RETURNS TABLE(
  transportation_ready boolean,
  has_teacher boolean,
  has_student boolean,
  has_class boolean,
  school_updated boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bus_count integer;
  car_line_count integer;
  walker_count integer;
  teacher_count integer;
  student_count integer;
  class_count integer;
  school_data record;
BEGIN
  -- Return all false if no school_id
  IF target_school_id IS NULL THEN
    RETURN QUERY SELECT false, false, false, false, false;
    RETURN;
  END IF;
  
  -- Check authorization - user must be able to view this school's data
  IF NOT can_view_school_data(target_school_id) THEN
    RAISE EXCEPTION 'Access denied: cannot view school data for school %', target_school_id;
  END IF;
  
  -- Count transportation options (buses, car lines, walker locations)
  SELECT COUNT(*) INTO bus_count FROM buses WHERE school_id = target_school_id;
  SELECT COUNT(*) INTO car_line_count FROM car_lines WHERE school_id = target_school_id;
  SELECT COUNT(*) INTO walker_count FROM walker_locations WHERE school_id = target_school_id;
  
  -- Count teachers, students, classes
  SELECT COUNT(*) INTO teacher_count FROM teachers WHERE school_id = target_school_id;
  SELECT COUNT(*) INTO student_count FROM students WHERE school_id = target_school_id;
  SELECT COUNT(*) INTO class_count FROM classes WHERE school_id = target_school_id;
  
  -- Get school metadata
  SELECT created_at, updated_at, school_name, dismissal_time 
  INTO school_data 
  FROM schools 
  WHERE id = target_school_id;
  
  -- Return computed status
  RETURN QUERY SELECT 
    (bus_count > 0 OR car_line_count > 0 OR walker_count > 0) as transportation_ready,
    (teacher_count > 0) as has_teacher,
    (student_count > 0) as has_student,
    (class_count > 0) as has_class,
    (school_data IS NOT NULL AND (
      school_data.updated_at > school_data.created_at OR
      (school_data.school_name IS NOT NULL AND LENGTH(TRIM(school_data.school_name)) > 0)
    )) as school_updated;
END;
$$;