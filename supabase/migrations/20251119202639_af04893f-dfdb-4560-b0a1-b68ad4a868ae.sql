-- Create the missing can_view_district_data function
-- This function determines if a user can VIEW (read) data for a specific district
CREATE OR REPLACE FUNCTION public.can_view_district_data(target_district_id uuid)
RETURNS boolean 
LANGUAGE sql 
STABLE 
SECURITY DEFINER 
SET search_path = public
AS $$ 
  SELECT 
    has_role(auth.uid(), 'system_admin'::app_role) 
    OR EXISTS (
      SELECT 1 
      FROM user_districts 
      WHERE user_id = auth.uid() 
      AND district_id = target_district_id
    );
$$;

COMMENT ON FUNCTION public.can_view_district_data IS 'Checks if the current user can view data for the specified district. Returns true for system admins or district admins assigned to that district.';