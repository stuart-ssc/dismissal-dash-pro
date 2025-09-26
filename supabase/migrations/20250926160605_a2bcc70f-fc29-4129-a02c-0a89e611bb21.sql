-- Create secure RPC to get school admins for current user
CREATE OR REPLACE FUNCTION public.get_school_admins_for_current_user()
RETURNS TABLE(
  id uuid,
  first_name text,
  last_name text,
  email text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_school_id bigint;
BEGIN
  -- Get current user's school_id
  SELECT school_id INTO user_school_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Return empty if user has no school
  IF user_school_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Return school admins for the user's school
  RETURN QUERY
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email
  FROM public.profiles p
  WHERE p.school_id = user_school_id
    AND has_role(p.id, 'school_admin'::app_role);
END;
$$;