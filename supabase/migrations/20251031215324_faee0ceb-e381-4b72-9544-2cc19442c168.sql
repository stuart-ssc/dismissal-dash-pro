-- Update can_manage_school_data to allow system admins to manage ANY school
CREATE OR REPLACE FUNCTION public.can_manage_school_data(target_school_id bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    -- System admins can manage ANY school
    has_role(auth.uid(), 'system_admin'::app_role)
    OR
    -- School admins can only manage their own school
    (has_role(auth.uid(), 'school_admin'::app_role) AND get_user_school_id(auth.uid()) = target_school_id)
$function$;