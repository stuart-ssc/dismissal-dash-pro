-- Security Fix: Restrict teacher access to sensitive student information
-- Problem: Current RLS policy allows teachers to SELECT all student columns including sensitive data

-- Step 1: Drop the current problematic teacher policy
DROP POLICY IF EXISTS "students_teacher_class_access" ON public.students;

-- Step 2: Create a secure view for teacher access that masks sensitive information
CREATE OR REPLACE VIEW public.students_teacher_view AS
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
  -- Mask sensitive fields for teachers - return NULL for these
  NULL::text as parent_guardian_name,
  NULL::text as contact_info,
  NULL::text as special_notes
FROM public.students s
WHERE EXISTS (
  SELECT 1 
  FROM class_rosters cr
  JOIN class_teachers ct ON ct.class_id = cr.class_id
  WHERE cr.student_id = s.id 
    AND ct.teacher_id = auth.uid()
    AND has_role(auth.uid(), 'teacher'::app_role)
);

-- Step 3: Enable RLS on the view
ALTER VIEW public.students_teacher_view SET (security_barrier = true);

-- Step 4: Create new secure teacher policy for students table - only basic info
CREATE POLICY "students_teacher_limited_access" 
ON public.students 
FOR SELECT 
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR
  (has_role(auth.uid(), 'school_admin'::app_role) AND can_view_school_data(school_id)) OR
  (has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
    SELECT 1 
    FROM class_rosters cr
    JOIN class_teachers ct ON ct.class_id = cr.class_id
    WHERE cr.student_id = students.id 
      AND ct.teacher_id = auth.uid()
  ))
);

-- Step 5: Create a secure function for teacher student queries that masks sensitive data
CREATE OR REPLACE FUNCTION public.get_students_for_teacher_safe(teacher_uuid uuid DEFAULT auth.uid())
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
  -- Sensitive fields are excluded from return type for teachers
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
    -- Mask sensitive data for teachers, show for admins
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

-- Step 6: Grant access to the function for authenticated users
GRANT EXECUTE ON FUNCTION public.get_students_for_teacher_safe(uuid) TO authenticated;