-- Add RLS policy to allow users to insert their own roles during signup
CREATE POLICY "Users can insert their own roles" 
ON public.user_roles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);