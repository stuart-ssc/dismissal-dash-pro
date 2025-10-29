-- Drop existing function
DROP FUNCTION IF EXISTS public.get_people_paginated(bigint, text, text, text, text, text, integer, integer);

-- Recreate with teacher filtering logic
CREATE OR REPLACE FUNCTION public.get_people_paginated(
  p_school_id bigint,
  p_role_filter text DEFAULT 'all',
  p_grade_filter text DEFAULT 'all',
  p_search_query text DEFAULT '',
  p_sort_by text DEFAULT 'name',
  p_sort_order text DEFAULT 'asc',
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  first_name text,
  last_name text,
  email text,
  role text,
  grade_level text,
  student_id text,
  invitation_status text,
  invitation_sent_at timestamp with time zone,
  invitation_expires_at timestamp with time zone,
  account_completed_at timestamp with time zone,
  auth_provider text,
  person_type text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_count bigint;
  v_is_teacher boolean;
  v_is_admin boolean;
BEGIN
  -- Check if user can view this school's data
  IF NOT can_view_school_data(p_school_id) THEN
    RAISE EXCEPTION 'Access denied: cannot view school data';
  END IF;

  -- Detect user role
  v_is_teacher := has_role(auth.uid(), 'teacher'::app_role) AND 
                  NOT has_role(auth.uid(), 'school_admin'::app_role) AND 
                  NOT has_role(auth.uid(), 'system_admin'::app_role);
  v_is_admin := has_role(auth.uid(), 'school_admin'::app_role) OR 
                has_role(auth.uid(), 'system_admin'::app_role);

  -- Calculate total count first
  WITH combined_people AS (
    -- Staff (filtered for teachers to show only co-teachers)
    SELECT 
      COALESCE(p.id, t.id) as id,
      COALESCE(p.first_name, t.first_name) as first_name,
      COALESCE(p.last_name, t.last_name) as last_name,
      COALESCE(p.email, t.email) as email,
      COALESCE(
        (SELECT r.role::text FROM user_roles r WHERE r.user_id = COALESCE(p.id, t.id) ORDER BY 
          CASE r.role::text
            WHEN 'system_admin' THEN 1
            WHEN 'school_admin' THEN 2
            WHEN 'teacher' THEN 3
          END
          LIMIT 1
        ), 
        'teacher'
      ) as role,
      NULL::text as grade_level,
      NULL::text as student_id,
      'staff'::text as person_type
    FROM teachers t
    FULL OUTER JOIN profiles p ON p.id = t.id
    WHERE (t.school_id = p_school_id OR p.school_id = p_school_id)
      AND (
        v_is_admin OR -- Admins see all staff
        (v_is_teacher AND (
          COALESCE(p.id, t.id) = auth.uid() OR -- Teachers see themselves
          EXISTS ( -- Teachers see co-teachers in permanently shared classes
            SELECT 1
            FROM class_teachers ct1
            JOIN class_teachers ct2 ON ct2.class_id = ct1.class_id
            WHERE ct1.teacher_id = auth.uid()
              AND ct2.teacher_id = COALESCE(p.id, t.id)
              AND ct2.teacher_id != auth.uid()
          ) OR
          EXISTS ( -- Teachers see coverage teachers in their permanent classes
            SELECT 1
            FROM class_teachers ct
            JOIN class_coverage cc ON cc.class_id = ct.class_id
            WHERE ct.teacher_id = auth.uid()
              AND cc.covering_teacher_id = COALESCE(p.id, t.id)
              AND cc.coverage_date = CURRENT_DATE
          ) OR
          EXISTS ( -- Teachers see permanent teachers when they're covering
            SELECT 1
            FROM class_coverage cc
            JOIN class_teachers ct ON ct.class_id = cc.class_id
            WHERE cc.covering_teacher_id = auth.uid()
              AND ct.teacher_id = COALESCE(p.id, t.id)
              AND cc.coverage_date = CURRENT_DATE
          )
        ))
      )

    UNION ALL

    -- Students (filtered for teachers)
    SELECT 
      s.id,
      s.first_name,
      s.last_name,
      NULL::text as email,
      'student'::text as role,
      s.grade_level,
      s.student_id,
      'student'::text as person_type
    FROM students s
    WHERE s.school_id = p_school_id
      AND (
        v_is_admin OR -- Admins see all students
        (v_is_teacher AND EXISTS ( -- Teachers see students in their classes
          SELECT 1 
          FROM class_rosters cr
          JOIN class_teachers ct ON ct.class_id = cr.class_id
          WHERE cr.student_id = s.id 
            AND ct.teacher_id = auth.uid()
          
          UNION
          
          SELECT 1
          FROM class_rosters cr
          JOIN class_coverage cc ON cc.class_id = cr.class_id
          WHERE cr.student_id = s.id
            AND cc.covering_teacher_id = auth.uid()
            AND cc.coverage_date = CURRENT_DATE
        ))
      )
  )
  SELECT COUNT(*) INTO v_total_count
  FROM combined_people cp
  WHERE 
    (p_role_filter = 'all' OR cp.role = p_role_filter)
    AND (p_grade_filter = 'all' OR cp.grade_level = p_grade_filter)
    AND (
      p_search_query = '' OR 
      cp.first_name ILIKE '%' || p_search_query || '%' OR 
      cp.last_name ILIKE '%' || p_search_query || '%' OR
      cp.email ILIKE '%' || p_search_query || '%' OR
      cp.student_id ILIKE '%' || p_search_query || '%'
    );

  -- Return paginated results with total count
  RETURN QUERY
  WITH combined_people AS (
    -- Staff with all details (filtered for teachers to show only co-teachers)
    SELECT 
      COALESCE(p.id, t.id) as id,
      COALESCE(p.first_name, t.first_name) as first_name,
      COALESCE(p.last_name, t.last_name) as last_name,
      COALESCE(p.email, t.email) as email,
      COALESCE(
        (SELECT r.role::text FROM user_roles r WHERE r.user_id = COALESCE(p.id, t.id) ORDER BY 
          CASE r.role::text
            WHEN 'system_admin' THEN 1
            WHEN 'school_admin' THEN 2
            WHEN 'teacher' THEN 3
          END
          LIMIT 1
        ), 
        'teacher'
      ) as role,
      NULL::text as grade_level,
      NULL::text as student_id,
      t.invitation_status,
      t.invitation_sent_at,
      t.invitation_expires_at,
      t.account_completed_at,
      COALESCE(p.auth_provider, t.auth_provider, 'email') as auth_provider,
      'staff'::text as person_type
    FROM teachers t
    FULL OUTER JOIN profiles p ON p.id = t.id
    WHERE (t.school_id = p_school_id OR p.school_id = p_school_id)
      AND (
        v_is_admin OR -- Admins see all staff
        (v_is_teacher AND (
          COALESCE(p.id, t.id) = auth.uid() OR -- Teachers see themselves
          EXISTS ( -- Teachers see co-teachers in permanently shared classes
            SELECT 1
            FROM class_teachers ct1
            JOIN class_teachers ct2 ON ct2.class_id = ct1.class_id
            WHERE ct1.teacher_id = auth.uid()
              AND ct2.teacher_id = COALESCE(p.id, t.id)
              AND ct2.teacher_id != auth.uid()
          ) OR
          EXISTS ( -- Teachers see coverage teachers in their permanent classes
            SELECT 1
            FROM class_teachers ct
            JOIN class_coverage cc ON cc.class_id = ct.class_id
            WHERE ct.teacher_id = auth.uid()
              AND cc.covering_teacher_id = COALESCE(p.id, t.id)
              AND cc.coverage_date = CURRENT_DATE
          ) OR
          EXISTS ( -- Teachers see permanent teachers when they're covering
            SELECT 1
            FROM class_coverage cc
            JOIN class_teachers ct ON ct.class_id = cc.class_id
            WHERE cc.covering_teacher_id = auth.uid()
              AND ct.teacher_id = COALESCE(p.id, t.id)
              AND cc.coverage_date = CURRENT_DATE
          )
        ))
      )

    UNION ALL

    -- Students (filtered for teachers)
    SELECT 
      s.id,
      s.first_name,
      s.last_name,
      NULL::text as email,
      'student'::text as role,
      s.grade_level,
      s.student_id,
      NULL::text as invitation_status,
      NULL::timestamptz as invitation_sent_at,
      NULL::timestamptz as invitation_expires_at,
      NULL::timestamptz as account_completed_at,
      'student'::text as auth_provider,
      'student'::text as person_type
    FROM students s
    WHERE s.school_id = p_school_id
      AND (
        v_is_admin OR -- Admins see all students
        (v_is_teacher AND EXISTS ( -- Teachers see students in their classes
          SELECT 1 
          FROM class_rosters cr
          JOIN class_teachers ct ON ct.class_id = cr.class_id
          WHERE cr.student_id = s.id 
            AND ct.teacher_id = auth.uid()
          
          UNION
          
          SELECT 1
          FROM class_rosters cr
          JOIN class_coverage cc ON cc.class_id = cr.class_id
          WHERE cr.student_id = s.id
            AND cc.covering_teacher_id = auth.uid()
            AND cc.coverage_date = CURRENT_DATE
        ))
      )
  ),
  filtered AS (
    SELECT * FROM combined_people
    WHERE 
      (p_role_filter = 'all' OR combined_people.role = p_role_filter)
      AND (p_grade_filter = 'all' OR combined_people.grade_level = p_grade_filter)
      AND (
        p_search_query = '' OR 
        combined_people.first_name ILIKE '%' || p_search_query || '%' OR 
        combined_people.last_name ILIKE '%' || p_search_query || '%' OR
        combined_people.email ILIKE '%' || p_search_query || '%' OR
        combined_people.student_id ILIKE '%' || p_search_query || '%'
      )
  )
  SELECT 
    filtered.id,
    filtered.first_name,
    filtered.last_name,
    filtered.email,
    filtered.role,
    filtered.grade_level,
    filtered.student_id,
    filtered.invitation_status,
    filtered.invitation_sent_at,
    filtered.invitation_expires_at,
    filtered.account_completed_at,
    filtered.auth_provider,
    filtered.person_type,
    v_total_count
  FROM filtered
  ORDER BY 
    CASE WHEN p_sort_by = 'name' THEN filtered.first_name END,
    CASE WHEN p_sort_by = 'role' THEN filtered.role END,
    CASE WHEN p_sort_by = 'grade' THEN filtered.grade_level END,
    filtered.last_name
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;