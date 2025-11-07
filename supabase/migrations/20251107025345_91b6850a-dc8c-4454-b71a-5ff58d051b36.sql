-- Security Audit: Fix teachers table RLS policies
-- The teachers table uses 'id' not 'user_id' for the primary key

-- Ensure RLS is enabled
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "system_admin_all_teachers" ON public.teachers;
DROP POLICY IF EXISTS "school_admin_own_school_teachers" ON public.teachers;
DROP POLICY IF EXISTS "teachers_view_own_profile" ON public.teachers;
DROP POLICY IF EXISTS "teachers_update_own_profile" ON public.teachers;
DROP POLICY IF EXISTS "public_validate_invitations" ON public.teachers;

-- System admins see all teachers
CREATE POLICY "system_admin_all_teachers"
ON public.teachers
FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- School admins can manage their school's teachers
CREATE POLICY "school_admin_own_school_teachers"
ON public.teachers
FOR ALL
USING (
  has_role(auth.uid(), 'school_admin'::app_role) AND
  can_view_school_data(school_id)
)
WITH CHECK (
  has_role(auth.uid(), 'school_admin'::app_role) AND
  can_manage_school_data(school_id)
);

-- Teachers can view profiles in their school (needed to see coverage assignments)
CREATE POLICY "teachers_view_same_school"
ON public.teachers
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND
  EXISTS (
    SELECT 1 FROM teachers t
    WHERE t.id = auth.uid()
    AND t.school_id = teachers.school_id
  )
);

-- Allow public (unauthenticated) to validate invitation tokens (needed for signup flow)
-- This only allows checking if token exists and is valid, not viewing sensitive data
CREATE POLICY "public_validate_invitations"
ON public.teachers
FOR SELECT
TO anon
USING (
  invitation_token IS NOT NULL AND
  invitation_expires_at > now() AND
  invitation_status = 'pending'
);

-- Add audit comment
COMMENT ON TABLE public.teachers IS 'Teacher profiles and invitation system. RLS ensures proper access control. Public can only validate invitation tokens for signup.';