-- Policies to allow admin user management
-- PROFILES policies
CREATE POLICY IF NOT EXISTS "System admins can manage all profiles"
ON public.profiles
FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY IF NOT EXISTS "School admins can view school profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'school_admin'::app_role)
  AND profiles.school_id IS NOT NULL
  AND profiles.school_id = get_user_school_id(auth.uid())
);

CREATE POLICY IF NOT EXISTS "School admins can update school profiles"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'school_admin'::app_role)
  AND profiles.school_id IS NOT NULL
  AND profiles.school_id = get_user_school_id(auth.uid())
)
WITH CHECK (
  profiles.school_id IS NOT NULL
  AND profiles.school_id = get_user_school_id(auth.uid())
);

-- USER_ROLES policies for school admins
CREATE POLICY IF NOT EXISTS "School admins can view roles in their school"
ON public.user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'school_admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_roles.user_id
      AND p.school_id = get_user_school_id(auth.uid())
  )
);

CREATE POLICY IF NOT EXISTS "School admins can manage school roles"
ON public.user_roles
FOR ALL
USING (
  has_role(auth.uid(), 'school_admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_roles.user_id
      AND p.school_id = get_user_school_id(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_roles.user_id
      AND p.school_id = get_user_school_id(auth.uid())
  )
  AND user_roles.role IN ('teacher'::app_role, 'school_admin'::app_role)
);
