-- Add RLS policy to allow public access to schools for signup dropdown
CREATE POLICY "schools_public_signup_access" 
ON public.schools 
FOR SELECT 
USING (true);