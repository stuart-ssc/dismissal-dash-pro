-- Create unified function to check any impersonation (system or district admin)
CREATE OR REPLACE FUNCTION public.get_any_impersonated_school_id()
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  school_id bigint;
BEGIN
  -- Check system admin impersonation first
  SELECT impersonated_school_id INTO school_id
  FROM public.admin_impersonation_sessions
  WHERE admin_user_id = auth.uid()
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF school_id IS NOT NULL THEN
    RETURN school_id;
  END IF;
  
  -- Then check district admin impersonation
  SELECT impersonated_school_id INTO school_id
  FROM public.district_impersonation_sessions
  WHERE district_admin_user_id = auth.uid()
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN school_id;
END;
$$;

-- Update can_view_school_data to recognize both types of impersonation
CREATE OR REPLACE FUNCTION public.can_view_school_data(target_school_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT 
    -- System admins can view any school (with impersonation logic)
    (has_role(auth.uid(), 'system_admin'::app_role) AND (
      get_any_impersonated_school_id() = target_school_id OR
      get_any_impersonated_school_id() IS NULL
    ))
    OR
    -- District admins can view schools in their district OR when impersonating
    (has_district_admin_role(auth.uid()) AND (
      get_any_impersonated_school_id() = target_school_id OR
      EXISTS (
        SELECT 1 
        FROM schools s
        JOIN user_districts ud ON ud.district_id = s.district_id
        WHERE s.id = target_school_id 
          AND ud.user_id = auth.uid()
      )
    ))
    OR
    -- School admins and teachers can view their assigned schools
    EXISTS (
      SELECT 1 FROM user_schools 
      WHERE user_id = auth.uid() AND school_id = target_school_id
    );
$function$;

-- Update can_manage_school_data to recognize impersonation
CREATE OR REPLACE FUNCTION public.can_manage_school_data(target_school_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT 
    -- System admins can manage ANY school
    has_role(auth.uid(), 'system_admin'::app_role)
    OR
    -- District admins can manage schools when impersonating OR in their district
    (has_district_admin_role(auth.uid()) AND (
      get_any_impersonated_school_id() = target_school_id OR
      EXISTS (
        SELECT 1 
        FROM schools s
        JOIN user_districts ud ON ud.district_id = s.district_id
        WHERE s.id = target_school_id 
          AND ud.user_id = auth.uid()
      )
    ))
    OR
    -- School admins can only manage their own school
    (has_role(auth.uid(), 'school_admin'::app_role) 
     AND get_user_school_id(auth.uid()) = target_school_id)
$function$;