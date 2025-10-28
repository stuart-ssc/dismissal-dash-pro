-- Fix get_people_paginated with explicit columns and simpler ORDER BY
DROP FUNCTION IF EXISTS public.get_people_paginated(bigint, text, text, text, text, text, integer, integer);

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
  invitation_sent_at timestamptz,
  invitation_expires_at timestamptz,
  account_completed_at timestamptz,
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
BEGIN
  -- Check if user can view this school's data
  IF NOT can_view_school_data(p_school_id) THEN
    RAISE EXCEPTION 'Access denied: cannot view school data';
  END IF;

  -- Calculate total count first
  WITH combined_people AS (
    -- Staff
    SELECT 
      p.id,
      p.first_name,
      p.last_name,
      p.email,
      COALESCE(
        (SELECT r.role::text FROM user_roles r WHERE r.user_id = p.id ORDER BY 
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
    FROM profiles p
    WHERE p.school_id = p_school_id

    UNION ALL

    -- Students
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
    -- Staff with all details
    SELECT 
      p.id,
      p.first_name,
      p.last_name,
      p.email,
      COALESCE(
        (SELECT r.role::text FROM user_roles r WHERE r.user_id = p.id ORDER BY 
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
    FROM profiles p
    LEFT JOIN teachers t ON t.id = p.id
    WHERE p.school_id = p_school_id

    UNION ALL

    -- Students
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