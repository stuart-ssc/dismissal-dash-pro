-- Remove the overly permissive public access policy
DROP POLICY "schools_public_signup_access" ON public.schools;

-- Create a more restrictive policy for sign-up that only allows access to basic school info
-- This policy will be implemented through a security definer function to control field access
CREATE OR REPLACE FUNCTION public.get_schools_for_signup()
RETURNS TABLE(
  id bigint,
  school_name text,
  city text,
  state text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    s.id,
    s.school_name,
    s.city,
    s.state
  FROM public.schools s
  WHERE s.school_name IS NOT NULL
  ORDER BY s.school_name;
$$;

-- Grant execute permission to anonymous users for sign-up functionality
GRANT EXECUTE ON FUNCTION public.get_schools_for_signup() TO anon;
GRANT EXECUTE ON FUNCTION public.get_schools_for_signup() TO authenticated;