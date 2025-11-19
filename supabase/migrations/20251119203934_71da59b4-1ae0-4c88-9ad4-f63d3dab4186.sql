-- Update can_view_school_data to support district admins viewing schools in their district
CREATE OR REPLACE FUNCTION public.can_view_school_data(target_school_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    -- System admins can view any school (with impersonation logic)
    (has_role(auth.uid(), 'system_admin'::app_role) AND (
      get_impersonated_school_id() = target_school_id OR
      get_impersonated_school_id() IS NULL
    ))
    OR
    -- District admins can view all schools in their assigned district
    (has_district_admin_role(auth.uid()) AND EXISTS (
      SELECT 1 
      FROM schools s
      JOIN user_districts ud ON ud.district_id = s.district_id
      WHERE s.id = target_school_id 
        AND ud.user_id = auth.uid()
    ))
    OR
    -- School admins and teachers can view their assigned schools
    EXISTS (
      SELECT 1 FROM user_schools 
      WHERE user_id = auth.uid() AND school_id = target_school_id
    );
$$;

COMMENT ON FUNCTION public.can_view_school_data IS 'Checks if the current user can view data for the specified school. Returns true for system admins (with impersonation), district admins viewing schools in their district, or users assigned to that specific school.';