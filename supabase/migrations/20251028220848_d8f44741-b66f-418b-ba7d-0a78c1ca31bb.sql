-- Create paginated people fetching function with proper RLS handling
CREATE OR REPLACE FUNCTION get_people_paginated(
  p_school_id bigint,
  p_role_filter text DEFAULT 'all',
  p_grade_filter text DEFAULT 'all',
  p_search_query text DEFAULT '',
  p_sort_by text DEFAULT 'name',
  p_sort_order text DEFAULT 'asc',
  p_limit int DEFAULT 25,
  p_offset int DEFAULT 0
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
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_sort_column text;
  v_total_count bigint := 0;
BEGIN
  -- Map sort field names
  v_sort_column := CASE 
    WHEN p_sort_by = 'name' THEN 'first_name'
    WHEN p_sort_by = 'role' THEN 'role'
    WHEN p_sort_by = 'grade' THEN 'grade_level'
    ELSE 'first_name'
  END;

  -- Check if user can view this school's data
  IF NOT can_view_school_data(p_school_id) THEN
    RAISE EXCEPTION 'Access denied: cannot view school data';
  END IF;

  -- Return staff (profiles with roles)
  IF p_role_filter = 'all' OR p_role_filter IN ('school_admin', 'teacher') THEN
    RETURN QUERY
    WITH staff_data AS (
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
        'staff'::text as person_type,
        COUNT(*) OVER() as total_count
      FROM profiles p
      LEFT JOIN teachers t ON t.id = p.id
      WHERE p.school_id = p_school_id
        AND (p_search_query = '' OR 
             p.first_name ILIKE '%' || p_search_query || '%' OR 
             p.last_name ILIKE '%' || p_search_query || '%' OR
             p.email ILIKE '%' || p_search_query || '%')
    )
    SELECT 
      s.id, s.first_name, s.last_name, s.email, s.role, s.grade_level, 
      s.student_id, s.invitation_status, s.invitation_sent_at, 
      s.invitation_expires_at, s.account_completed_at, s.auth_provider,
      s.person_type, s.total_count
    FROM staff_data s
    WHERE (p_role_filter = 'all' OR s.role = p_role_filter)
    ORDER BY 
      CASE WHEN p_sort_order = 'asc' THEN
        CASE v_sort_column
          WHEN 'first_name' THEN s.first_name
          WHEN 'role' THEN s.role
        END
      END ASC,
      CASE WHEN p_sort_order = 'desc' THEN
        CASE v_sort_column
          WHEN 'first_name' THEN s.first_name
          WHEN 'role' THEN s.role
        END
      END DESC
    LIMIT p_limit
    OFFSET p_offset;
  END IF;

  -- Return students
  IF p_role_filter = 'all' OR p_role_filter = 'student' THEN
    RETURN QUERY
    WITH student_data AS (
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
        'student'::text as person_type,
        COUNT(*) OVER() as total_count
      FROM students s
      WHERE s.school_id = p_school_id
        AND (p_grade_filter = 'all' OR s.grade_level = p_grade_filter)
        AND (p_search_query = '' OR 
             s.first_name ILIKE '%' || p_search_query || '%' OR 
             s.last_name ILIKE '%' || p_search_query || '%' OR
             s.student_id ILIKE '%' || p_search_query || '%')
    )
    SELECT 
      st.id, st.first_name, st.last_name, st.email, st.role, st.grade_level,
      st.student_id, st.invitation_status, st.invitation_sent_at,
      st.invitation_expires_at, st.account_completed_at, st.auth_provider,
      st.person_type, st.total_count
    FROM student_data st
    ORDER BY 
      CASE WHEN p_sort_order = 'asc' THEN
        CASE v_sort_column
          WHEN 'first_name' THEN st.first_name
          WHEN 'grade_level' THEN st.grade_level
        END
      END ASC,
      CASE WHEN p_sort_order = 'desc' THEN
        CASE v_sort_column
          WHEN 'first_name' THEN st.first_name
          WHEN 'grade_level' THEN st.grade_level
        END
      END DESC
    LIMIT p_limit
    OFFSET p_offset;
  END IF;

  RETURN;
END;
$$;