-- Phase 4: Update RPC functions for academic sessions and period data

-- 1. Update get_teacher_accessible_classes to include period information
DROP FUNCTION IF EXISTS public.get_teacher_accessible_classes(uuid, date);
CREATE OR REPLACE FUNCTION public.get_teacher_accessible_classes(
  teacher_uuid uuid, 
  target_date date DEFAULT CURRENT_DATE,
  session_id uuid DEFAULT NULL
)
RETURNS TABLE(
  class_id uuid, 
  class_name text, 
  grade_level text, 
  is_permanent boolean, 
  coverage_notes text,
  period_number integer,
  period_start_time time,
  period_end_time time,
  period_name text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- Permanent class assignments
  SELECT 
    c.id as class_id,
    c.class_name,
    c.grade_level,
    true as is_permanent,
    NULL::text as coverage_notes,
    c.period_number,
    c.period_start_time,
    c.period_end_time,
    c.period_name
  FROM classes c
  JOIN class_teachers ct ON ct.class_id = c.id
  WHERE ct.teacher_id = teacher_uuid
    AND (session_id IS NULL OR c.academic_session_id = session_id)

  UNION ALL

  -- Temporary coverage assignments for target date
  SELECT 
    c.id as class_id,
    c.class_name,
    c.grade_level,
    false as is_permanent,
    cc.notes as coverage_notes,
    c.period_number,
    c.period_start_time,
    c.period_end_time,
    c.period_name
  FROM classes c
  JOIN class_coverage cc ON cc.class_id = c.id
  WHERE cc.covering_teacher_id = teacher_uuid
    AND cc.coverage_date = target_date
    AND (session_id IS NULL OR c.academic_session_id = session_id);
$function$;

-- 2. Update get_people_paginated to filter by academic session
DROP FUNCTION IF EXISTS public.get_people_paginated(bigint, text, text, text, text, text, integer, integer);
CREATE OR REPLACE FUNCTION public.get_people_paginated(
  p_school_id bigint, 
  p_role_filter text DEFAULT 'all'::text, 
  p_grade_filter text DEFAULT 'all'::text, 
  p_search_query text DEFAULT ''::text, 
  p_sort_by text DEFAULT 'name'::text, 
  p_sort_order text DEFAULT 'asc'::text, 
  p_limit integer DEFAULT 25, 
  p_offset integer DEFAULT 0,
  p_session_id uuid DEFAULT NULL
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
SET search_path TO 'public'
AS $function$
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
        v_is_admin OR
        (v_is_teacher AND (
          COALESCE(p.id, t.id) = auth.uid() OR
          EXISTS (
            SELECT 1
            FROM class_teachers ct1
            JOIN class_teachers ct2 ON ct2.class_id = ct1.class_id
            JOIN classes c ON c.id = ct1.class_id
            WHERE ct1.teacher_id = auth.uid()
              AND ct2.teacher_id = COALESCE(p.id, t.id)
              AND ct2.teacher_id != auth.uid()
              AND (p_session_id IS NULL OR c.academic_session_id = p_session_id)
          ) OR
          EXISTS (
            SELECT 1
            FROM class_teachers ct
            JOIN class_coverage cc ON cc.class_id = ct.class_id
            JOIN classes c ON c.id = ct.class_id
            WHERE ct.teacher_id = auth.uid()
              AND cc.covering_teacher_id = COALESCE(p.id, t.id)
              AND cc.coverage_date = CURRENT_DATE
              AND (p_session_id IS NULL OR c.academic_session_id = p_session_id)
          ) OR
          EXISTS (
            SELECT 1
            FROM class_coverage cc
            JOIN class_teachers ct ON ct.class_id = cc.class_id
            JOIN classes c ON c.id = cc.class_id
            WHERE cc.covering_teacher_id = auth.uid()
              AND ct.teacher_id = COALESCE(p.id, t.id)
              AND cc.coverage_date = CURRENT_DATE
              AND (p_session_id IS NULL OR c.academic_session_id = p_session_id)
          )
        ))
      )

    UNION ALL

    -- Students (filtered for teachers and by session)
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
      AND (p_session_id IS NULL OR s.academic_session_id = p_session_id)
      AND (
        v_is_admin OR
        (v_is_teacher AND EXISTS (
          SELECT 1 
          FROM class_rosters cr
          JOIN class_teachers ct ON ct.class_id = cr.class_id
          JOIN classes c ON c.id = cr.class_id
          WHERE cr.student_id = s.id 
            AND ct.teacher_id = auth.uid()
            AND (p_session_id IS NULL OR c.academic_session_id = p_session_id)
          
          UNION
          
          SELECT 1
          FROM class_rosters cr
          JOIN class_coverage cc ON cc.class_id = cr.class_id
          JOIN classes c ON c.id = cr.class_id
          WHERE cr.student_id = s.id
            AND cc.covering_teacher_id = auth.uid()
            AND cc.coverage_date = CURRENT_DATE
            AND (p_session_id IS NULL OR c.academic_session_id = p_session_id)
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
    -- Staff with all details
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
        v_is_admin OR
        (v_is_teacher AND (
          COALESCE(p.id, t.id) = auth.uid() OR
          EXISTS (
            SELECT 1
            FROM class_teachers ct1
            JOIN class_teachers ct2 ON ct2.class_id = ct1.class_id
            JOIN classes c ON c.id = ct1.class_id
            WHERE ct1.teacher_id = auth.uid()
              AND ct2.teacher_id = COALESCE(p.id, t.id)
              AND ct2.teacher_id != auth.uid()
              AND (p_session_id IS NULL OR c.academic_session_id = p_session_id)
          ) OR
          EXISTS (
            SELECT 1
            FROM class_teachers ct
            JOIN class_coverage cc ON cc.class_id = ct.class_id
            JOIN classes c ON c.id = ct.class_id
            WHERE ct.teacher_id = auth.uid()
              AND cc.covering_teacher_id = COALESCE(p.id, t.id)
              AND cc.coverage_date = CURRENT_DATE
              AND (p_session_id IS NULL OR c.academic_session_id = p_session_id)
          ) OR
          EXISTS (
            SELECT 1
            FROM class_coverage cc
            JOIN class_teachers ct ON ct.class_id = cc.class_id
            JOIN classes c ON c.id = cc.class_id
            WHERE cc.covering_teacher_id = auth.uid()
              AND ct.teacher_id = COALESCE(p.id, t.id)
              AND cc.coverage_date = CURRENT_DATE
              AND (p_session_id IS NULL OR c.academic_session_id = p_session_id)
          )
        ))
      )

    UNION ALL

    -- Students (filtered by session)
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
      AND (p_session_id IS NULL OR s.academic_session_id = p_session_id)
      AND (
        v_is_admin OR
        (v_is_teacher AND EXISTS (
          SELECT 1 
          FROM class_rosters cr
          JOIN class_teachers ct ON ct.class_id = cr.class_id
          JOIN classes c ON c.id = cr.class_id
          WHERE cr.student_id = s.id 
            AND ct.teacher_id = auth.uid()
            AND (p_session_id IS NULL OR c.academic_session_id = p_session_id)
          
          UNION
          
          SELECT 1
          FROM class_rosters cr
          JOIN class_coverage cc ON cc.class_id = cr.class_id
          JOIN classes c ON c.id = cr.class_id
          WHERE cr.student_id = s.id
            AND cc.covering_teacher_id = auth.uid()
            AND cc.coverage_date = CURRENT_DATE
            AND (p_session_id IS NULL OR c.academic_session_id = p_session_id)
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
$function$;

-- 3. Update get_students_for_teacher to filter by academic session
DROP FUNCTION IF EXISTS public.get_students_for_teacher(uuid);
DROP FUNCTION IF EXISTS public.get_students_for_teacher_safe(uuid);

CREATE OR REPLACE FUNCTION public.get_students_for_teacher(
  teacher_uuid uuid DEFAULT auth.uid(),
  session_id uuid DEFAULT NULL
)
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
  parent_guardian_name text, 
  contact_info text, 
  special_notes text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF teacher_uuid != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: can only query your own students';
  END IF;

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
    (session_id IS NULL OR s.academic_session_id = session_id)
    AND (
      has_role(auth.uid(), 'system_admin'::app_role) OR
      (has_role(auth.uid(), 'school_admin'::app_role) AND can_view_school_data(s.school_id)) OR
      (has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
        SELECT 1 
        FROM class_rosters cr
        JOIN class_teachers ct ON ct.class_id = cr.class_id
        JOIN classes c ON c.id = cr.class_id
        WHERE cr.student_id = s.id 
          AND ct.teacher_id = auth.uid()
          AND (session_id IS NULL OR c.academic_session_id = session_id)
      ))
    );
END;
$function$;

-- 4. Add helper function to get current academic session for a school
CREATE OR REPLACE FUNCTION public.get_current_academic_session(p_school_id bigint)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT id 
  FROM academic_sessions
  WHERE school_id = p_school_id
    AND start_date <= CURRENT_DATE
    AND end_date >= CURRENT_DATE
  ORDER BY start_date DESC
  LIMIT 1;
$function$;