-- Fix teachers table RLS - Secure invitation validation

-- Create a secure function to validate invitation tokens without exposing PII
CREATE OR REPLACE FUNCTION public.validate_teacher_invitation_token(token_input text)
RETURNS TABLE(
  valid boolean,
  first_name text,
  school_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return minimal data needed for validation UI
  RETURN QUERY
  SELECT 
    true as valid,
    t.first_name,
    s.school_name
  FROM public.teachers t
  JOIN public.schools s ON s.id = t.school_id
  WHERE t.invitation_token = token_input
    AND t.invitation_expires_at > now()
    AND t.invitation_status = 'pending'
  LIMIT 1;
  
  -- If no valid invitation found, return false
  IF NOT FOUND THEN
    RETURN QUERY SELECT false as valid, NULL::text as first_name, NULL::text as school_name;
  END IF;
END;
$$;

-- Drop the overly permissive public validation policy
DROP POLICY IF EXISTS "public_validate_invitations" ON public.teachers;

-- Create a restrictive policy that only allows validation via the secure function
-- This policy doesn't actually grant access - validation happens via edge function
CREATE POLICY "No public access to teachers"
ON public.teachers
FOR SELECT
TO anon, authenticated
USING (false);