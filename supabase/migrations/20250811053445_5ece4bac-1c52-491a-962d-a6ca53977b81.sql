-- Update RLS policies to allow system_admin full access to dismissal plans and groups

-- Dismissal Plans: replace restrictive policy to include system admins
DROP POLICY IF EXISTS "School admins can manage dismissal plans" ON public.dismissal_plans;
CREATE POLICY "School admins and system admins can manage dismissal plans"
ON public.dismissal_plans
AS RESTRICTIVE
FOR ALL
USING (
  has_role(auth.uid(), 'system_admin'::app_role)
  OR get_user_school_id(auth.uid()) = school_id
)
WITH CHECK (
  has_role(auth.uid(), 'system_admin'::app_role)
  OR get_user_school_id(auth.uid()) = school_id
);

-- Dismissal Groups: replace restrictive policy to include system admins
DROP POLICY IF EXISTS "School admins can manage dismissal groups" ON public.dismissal_groups;
CREATE POLICY "School admins and system admins can manage dismissal groups"
ON public.dismissal_groups
AS RESTRICTIVE
FOR ALL
USING (
  has_role(auth.uid(), 'system_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM dismissal_plans dp
    WHERE dp.id = dismissal_groups.dismissal_plan_id
      AND get_user_school_id(auth.uid()) = dp.school_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'system_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM dismissal_plans dp
    WHERE dp.id = dismissal_groups.dismissal_plan_id
      AND get_user_school_id(auth.uid()) = dp.school_id
  )
);
