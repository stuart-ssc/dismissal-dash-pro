-- Update get_user_school_id to support admin impersonation
-- This function is used throughout RLS policies to determine a user's school

CREATE OR REPLACE FUNCTION public.get_user_school_id(user_uuid uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- First check if the user is impersonating a school (system or district admin)
  -- If yes, return the impersonated school_id
  -- Otherwise, return the user's actual school_id from their profile
  SELECT COALESCE(
    get_any_impersonated_school_id(),
    (SELECT school_id FROM public.profiles WHERE id = user_uuid)
  );
$$;

COMMENT ON FUNCTION public.get_user_school_id IS 
'Returns the effective school_id for a user, checking impersonation sessions first before falling back to profile school_id. Used throughout RLS policies for school-based data filtering.';