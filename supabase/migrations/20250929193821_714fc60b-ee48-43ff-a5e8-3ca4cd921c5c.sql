-- Drop the existing combined policy that's causing issues
DROP POLICY IF EXISTS "dismissal_plans_school_users" ON public.dismissal_plans;

-- Create separate SELECT policy for viewing (allows teachers via can_view_school_data)
CREATE POLICY "dismissal_plans_school_users_select" 
ON public.dismissal_plans 
FOR SELECT 
USING (can_view_school_data(school_id));

-- Create separate policy for managing (admin only)
CREATE POLICY "dismissal_plans_school_users_manage" 
ON public.dismissal_plans 
FOR ALL 
USING (can_manage_school_data(school_id))
WITH CHECK (can_manage_school_data(school_id));