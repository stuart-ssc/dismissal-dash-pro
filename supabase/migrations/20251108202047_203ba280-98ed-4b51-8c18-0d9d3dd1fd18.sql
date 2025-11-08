-- Fix infinite recursion in RLS policies for special_use_runs and special_use_run_managers

-- Drop policies on special_use_runs that query special_use_run_managers
DROP POLICY IF EXISTS "Run managers can view their runs" ON public.special_use_runs;
DROP POLICY IF EXISTS "Run managers can update their runs" ON public.special_use_runs;
DROP POLICY IF EXISTS "Group managers can view runs for their groups" ON public.special_use_runs;

-- Drop policies on special_use_run_managers that query special_use_runs
DROP POLICY IF EXISTS "School admins can manage their school run managers" ON public.special_use_run_managers;
DROP POLICY IF EXISTS "Run managers can view other managers" ON public.special_use_run_managers;

-- Create security definer helper functions

-- Get a run's school_id without relying on RLS
CREATE OR REPLACE FUNCTION public.get_run_school_id(p_run_id UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id
  FROM public.special_use_runs
  WHERE id = p_run_id
$$;

-- Check if a user manages a specific run (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_run_manager(p_run_id UUID, p_user_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.special_use_run_managers
    WHERE run_id = p_run_id
      AND manager_id = p_user_id
  )
$$;

-- Recreate special_use_run_managers policies (non-recursive)

-- View: Admins can view run managers
CREATE POLICY "Admins can view run managers"
ON public.special_use_run_managers
FOR SELECT
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR
  (has_role(auth.uid(), 'school_admin'::app_role) AND 
   can_view_school_data(public.get_run_school_id(run_id)))
);

-- Insert: Admins can insert run managers
CREATE POLICY "Admins can insert run managers"
ON public.special_use_run_managers
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'system_admin'::app_role) OR
  (has_role(auth.uid(), 'school_admin'::app_role) AND 
   can_manage_school_data(public.get_run_school_id(run_id)))
);

-- Update: Admins can update run managers
CREATE POLICY "Admins can update run managers"
ON public.special_use_run_managers
FOR UPDATE
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR
  (has_role(auth.uid(), 'school_admin'::app_role) AND 
   can_manage_school_data(public.get_run_school_id(run_id)))
)
WITH CHECK (
  has_role(auth.uid(), 'system_admin'::app_role) OR
  (has_role(auth.uid(), 'school_admin'::app_role) AND 
   can_manage_school_data(public.get_run_school_id(run_id)))
);

-- Delete: Admins can delete run managers
CREATE POLICY "Admins can delete run managers"
ON public.special_use_run_managers
FOR DELETE
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR
  (has_role(auth.uid(), 'school_admin'::app_role) AND 
   can_manage_school_data(public.get_run_school_id(run_id)))
);

-- Run managers can view other managers (using helper function, no self-recursion)
CREATE POLICY "Run managers can view other managers"
ON public.special_use_run_managers
FOR SELECT
USING (public.is_run_manager(run_id, auth.uid()));

-- Recreate special_use_runs policies (using helper functions)

-- Run managers can view their runs (using helper function)
CREATE POLICY "Run managers can view their runs"
ON public.special_use_runs
FOR SELECT
USING (public.is_run_manager(id, auth.uid()));

-- Run managers can update their runs (using helper function)
CREATE POLICY "Run managers can update their runs"
ON public.special_use_runs
FOR UPDATE
USING (public.is_run_manager(id, auth.uid()))
WITH CHECK (public.is_run_manager(id, auth.uid()));

-- Group managers can view runs for their groups (using helper function)
CREATE POLICY "Group managers can view runs for their groups"
ON public.special_use_runs
FOR SELECT
USING (public.is_group_manager(group_id, auth.uid()));