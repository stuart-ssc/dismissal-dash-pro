-- Update can_manage_school_data to include district admin logic
CREATE OR REPLACE FUNCTION public.can_manage_school_data(target_school_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    -- System admins can manage ANY school
    has_role(auth.uid(), 'system_admin'::app_role)
    OR
    -- District admins can manage schools in their assigned district
    (has_district_admin_role(auth.uid()) AND EXISTS (
      SELECT 1 
      FROM schools s
      JOIN user_districts ud ON ud.district_id = s.district_id
      WHERE s.id = target_school_id 
        AND ud.user_id = auth.uid()
    ))
    OR
    -- School admins can only manage their own school
    (has_role(auth.uid(), 'school_admin'::app_role) 
     AND get_user_school_id(auth.uid()) = target_school_id)
$$;

COMMENT ON FUNCTION public.can_manage_school_data IS 'Checks if the current user can manage (insert/update/delete) data for the specified school. Returns true for system admins (any school), district admins (schools in their district), or school admins (their own school).';