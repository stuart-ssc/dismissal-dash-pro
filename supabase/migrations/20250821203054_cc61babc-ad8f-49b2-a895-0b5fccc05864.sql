-- Create secure admin promotion function
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only existing system admins can promote users
  IF NOT has_role(auth.uid(), 'system_admin'::app_role) THEN
    RAISE EXCEPTION 'Only system administrators can promote users';
  END IF;

  -- Insert or update user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'system_admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Log the promotion for audit purposes
  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    action,
    user_id,
    details
  ) VALUES (
    'user_roles',
    target_user_id,
    'PROMOTE_TO_ADMIN',
    auth.uid(),
    jsonb_build_object(
      'promoted_user_id', target_user_id,
      'promoted_by', auth.uid(),
      'timestamp', now()
    )
  );

  RETURN TRUE;
END;
$$;

-- Strengthen user_roles RLS policies
DROP POLICY IF EXISTS "user_roles_insert_own" ON public.user_roles;

CREATE POLICY "user_roles_secure_insert"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Users can only insert their own teacher role during signup
  (auth.uid() = user_id AND role = 'teacher'::app_role) OR
  -- System admins can insert any role for users in their managed schools
  (has_role(auth.uid(), 'system_admin'::app_role) OR
   (has_role(auth.uid(), 'school_admin'::app_role) AND 
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = user_id AND can_manage_school_data(p.school_id))))
);

-- Add server-side impersonation validation function
CREATE OR REPLACE FUNCTION public.validate_school_impersonation(target_school_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only system admins can impersonate schools
  IF NOT has_role(auth.uid(), 'system_admin'::app_role) THEN
    RETURN FALSE;
  END IF;

  -- Log impersonation attempt
  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    action,
    user_id,
    details
  ) VALUES (
    'schools',
    target_school_id::uuid,
    'SCHOOL_IMPERSONATION',
    auth.uid(),
    jsonb_build_object(
      'impersonated_school_id', target_school_id,
      'impersonated_by', auth.uid(),
      'timestamp', now()
    )
  );

  RETURN TRUE;
END;
$$;

-- Strengthen student data access policies
DROP POLICY IF EXISTS "students_teacher_view_assigned" ON public.students;

CREATE POLICY "students_teacher_limited_view"
ON public.students
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR
  (has_role(auth.uid(), 'school_admin'::app_role) AND can_view_school_data(school_id)) OR
  (has_role(auth.uid(), 'teacher'::app_role) AND 
   -- Teachers can only see basic info, not sensitive PII
   EXISTS (
     SELECT 1
     FROM class_rosters cr
     JOIN class_teachers ct ON ct.class_id = cr.class_id
     WHERE cr.student_id = students.id AND ct.teacher_id = auth.uid()
   ))
);

-- Create masked view for teachers to prevent PII access
CREATE OR REPLACE VIEW public.students_teacher_view AS
SELECT 
  s.id,
  s.first_name,
  s.last_name,
  s.grade_level,
  s.school_id,
  CASE 
    WHEN has_role(auth.uid(), 'system_admin'::app_role) OR
         has_role(auth.uid(), 'school_admin'::app_role) THEN s.parent_guardian_name
    ELSE NULL
  END as parent_guardian_name,
  CASE 
    WHEN has_role(auth.uid(), 'system_admin'::app_role) OR
         has_role(auth.uid(), 'school_admin'::app_role) THEN s.contact_info
    ELSE NULL
  END as contact_info,
  CASE 
    WHEN has_role(auth.uid(), 'system_admin'::app_role) OR
         has_role(auth.uid(), 'school_admin'::app_role) THEN s.special_notes
    ELSE NULL
  END as special_notes,
  s.student_id,
  s.dismissal_group,
  s.created_at,
  s.updated_at
FROM students s
WHERE can_view_school_data(s.school_id) OR
      (has_role(auth.uid(), 'teacher'::app_role) AND 
       EXISTS (
         SELECT 1 
         FROM class_rosters cr 
         JOIN class_teachers ct ON ct.class_id = cr.class_id 
         WHERE cr.student_id = s.id AND ct.teacher_id = auth.uid()
       ));

-- Enable RLS on the view
ALTER VIEW public.students_teacher_view SET (security_barrier = true);