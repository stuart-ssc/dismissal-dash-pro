-- Fix infinite recursion in RLS policies for special_use_group_managers (corrected)

-- Helper function: get a group's school_id without relying on RLS in policies
CREATE OR REPLACE FUNCTION public.get_group_school_id(p_group_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.school_id
  FROM public.special_use_groups g
  WHERE g.id = p_group_id
$$;

-- Helper function: check if a user manages a group
-- NOTE: Do NOT use this function inside policies on special_use_group_managers itself to avoid recursion
CREATE OR REPLACE FUNCTION public.is_group_manager(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.special_use_group_managers mug
    WHERE mug.group_id = p_group_id
      AND mug.manager_id = p_user_id
  )
$$;

-- Drop ALL existing policies on special_use_group_managers to remove recursive ones
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'special_use_group_managers'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.special_use_group_managers', pol.policyname);
  END LOOP;
END $$;

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.special_use_group_managers ENABLE ROW LEVEL SECURITY;

-- New non-recursive policies for special_use_group_managers
-- View: only admins (system_admin or school_admin for that school)
CREATE POLICY "Admins can view group managers"
ON public.special_use_group_managers
FOR SELECT
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR
  (has_role(auth.uid(), 'school_admin'::app_role) AND can_view_school_data(public.get_group_school_id(group_id)))
);

-- Insert: only admins for that school
CREATE POLICY "Admins can insert group managers"
ON public.special_use_group_managers
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'system_admin'::app_role) OR
  (has_role(auth.uid(), 'school_admin'::app_role) AND can_manage_school_data(public.get_group_school_id(group_id)))
);

-- Update: only admins for that school
CREATE POLICY "Admins can update group managers"
ON public.special_use_group_managers
FOR UPDATE
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR
  (has_role(auth.uid(), 'school_admin'::app_role) AND can_manage_school_data(public.get_group_school_id(group_id)))
)
WITH CHECK (
  has_role(auth.uid(), 'system_admin'::app_role) OR
  (has_role(auth.uid(), 'school_admin'::app_role) AND can_manage_school_data(public.get_group_school_id(group_id)))
);

-- Delete: only admins for that school
CREATE POLICY "Admins can delete group managers"
ON public.special_use_group_managers
FOR DELETE
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR
  (has_role(auth.uid(), 'school_admin'::app_role) AND can_manage_school_data(public.get_group_school_id(group_id)))
);
