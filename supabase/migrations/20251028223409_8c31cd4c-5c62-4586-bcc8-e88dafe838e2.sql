-- Drop and recreate get_people_paginated with unified query logic
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
BEGIN
  -- Check if user can view this school's data
  IF NOT can_view_school_data(p_school_id) THEN
    RAISE EXCEPTION 'Access denied: cannot view school data';
  END IF;

  RETURN QUERY
  WITH combined_people AS (
    -- Staff (profiles with roles)
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
  filtered_people AS (
    SELECT * FROM combined_people
    WHERE 
      -- Role filter
      (p_role_filter = 'all' OR role = p_role_filter)
      -- Grade filter (only applies to students)
      AND (p_grade_filter = 'all' OR grade_level = p_grade_filter)
      -- Search filter
      AND (
        p_search_query = '' OR 
        first_name ILIKE '%' || p_search_query || '%' OR 
        last_name ILIKE '%' || p_search_query || '%' OR
        email ILIKE '%' || p_search_query || '%' OR
        student_id ILIKE '%' || p_search_query || '%'
      )
  ),
  total_count_calc AS (
    SELECT COUNT(*) as cnt FROM filtered_people
  ),
  sorted_paginated AS (
    SELECT fp.*
    FROM filtered_people fp
    ORDER BY 
      CASE 
        WHEN p_sort_by = 'name' AND p_sort_order = 'asc' THEN fp.first_name
      END ASC,
      CASE 
        WHEN p_sort_by = 'name' AND p_sort_order = 'desc' THEN fp.first_name
      END DESC,
      CASE 
        WHEN p_sort_by = 'role' AND p_sort_order = 'asc' THEN fp.role
      END ASC,
      CASE 
        WHEN p_sort_by = 'role' AND p_sort_order = 'desc' THEN fp.role
      END DESC,
      CASE 
        WHEN p_sort_by = 'grade' AND p_sort_order = 'asc' THEN fp.grade_level
      END ASC,
      CASE 
        WHEN p_sort_by = 'grade' AND p_sort_order = 'desc' THEN fp.grade_level
      END DESC,
      fp.last_name ASC
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT 
    sp.id,
    sp.first_name,
    sp.last_name,
    sp.email,
    sp.role,
    sp.grade_level,
    sp.student_id,
    sp.invitation_status,
    sp.invitation_sent_at,
    sp.invitation_expires_at,
    sp.account_completed_at,
    sp.auth_provider,
    sp.person_type,
    tc.cnt as total_count
  FROM sorted_paginated sp
  CROSS JOIN total_count_calc tc;
END;
$$;