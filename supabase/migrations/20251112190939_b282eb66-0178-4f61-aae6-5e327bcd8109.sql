-- Drop existing function first
DROP FUNCTION IF EXISTS public.get_special_use_run_students(uuid, uuid);

-- Create function to get students for a special use run with session filtering
CREATE OR REPLACE FUNCTION public.get_special_use_run_students(
  p_run_id uuid,
  p_bus_id uuid
)
RETURNS TABLE(
  student_id uuid,
  first_name text,
  last_name text,
  grade_level text,
  student_number text,
  outbound_checked boolean,
  return_checked boolean,
  left_with_parent boolean,
  parent_name text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as student_id,
    s.first_name,
    s.last_name,
    s.grade_level,
    s.student_id as student_number,
    COALESCE(sra.outbound_checked, false) as outbound_checked,
    COALESCE(sra.return_checked, false) as return_checked,
    COALESCE(sra.left_with_parent, false) as left_with_parent,
    sra.parent_name
  FROM students s
  JOIN special_use_group_students sugs ON sugs.student_id = s.id
  JOIN special_use_runs sur ON sur.group_id = sugs.group_id
  JOIN special_use_groups sug ON sug.id = sur.group_id
  LEFT JOIN special_use_run_attendance sra ON sra.run_id = p_run_id 
    AND sra.student_id = s.id 
    AND sra.bus_id = p_bus_id
  WHERE sur.id = p_run_id
    -- Ensure students are from the same academic session as the group
    AND s.academic_session_id = sug.academic_session_id
    -- Ensure the run is also from the same academic session
    AND sur.academic_session_id = sug.academic_session_id
  ORDER BY s.last_name, s.first_name;
END;
$function$;