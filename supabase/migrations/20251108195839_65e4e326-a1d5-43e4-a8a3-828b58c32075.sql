-- Drop problematic policies that cause circular dependencies
DROP POLICY IF EXISTS "Group managers can view their groups" ON public.special_use_groups;
DROP POLICY IF EXISTS "School admins can manage their school group managers" ON public.special_use_group_managers;
DROP POLICY IF EXISTS "Group managers can view group students" ON public.special_use_group_students;
DROP POLICY IF EXISTS "Group managers can view runs for their groups" ON public.special_use_runs;

-- Create security definer function to check if user is a group manager (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_group_manager(p_group_id UUID, p_user_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.special_use_group_managers
    WHERE group_id = p_group_id AND manager_id = p_user_id
  )
$$;

-- Recreate group managers policy without recursion
CREATE POLICY "School admins can manage their school group managers"
  ON public.special_use_group_managers FOR ALL
  USING (
    has_role(auth.uid(), 'system_admin'::app_role) OR
    (has_role(auth.uid(), 'school_admin'::app_role) AND EXISTS (
      SELECT 1 FROM public.special_use_groups g
      WHERE g.id = special_use_group_managers.group_id 
        AND can_manage_school_data(g.school_id)
    )) OR
    manager_id = auth.uid()
  );

-- Recreate groups policy using the new security definer function
CREATE POLICY "Group managers can view their groups"
  ON public.special_use_groups FOR SELECT
  USING (public.is_group_manager(id, auth.uid()));

-- Recreate group students policy using the security definer function
CREATE POLICY "Group managers can view group students"
  ON public.special_use_group_students FOR SELECT
  USING (public.is_group_manager(group_id, auth.uid()));

-- Recreate runs policy using the security definer function
CREATE POLICY "Group managers can view runs for their groups"
  ON public.special_use_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.special_use_groups g
      WHERE g.id = special_use_runs.group_id
        AND public.is_group_manager(g.id, auth.uid())
    )
  );