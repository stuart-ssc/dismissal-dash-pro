-- Fix get_people_paginated to include pending teacher invitations
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
BEGIN
  -- Check if user can view this school's data
  IF NOT can_view_school_data(p_school_id) THEN
    RAISE EXCEPTION 'Access denied: cannot view school data';
  END IF;

  -- Calculate total count first
  WITH combined_people AS (
    -- Staff (including pending teacher invitations)
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
    -- Staff with all details (including pending teacher invitations)
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