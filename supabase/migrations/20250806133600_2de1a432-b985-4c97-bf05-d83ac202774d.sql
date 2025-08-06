-- Add RLS policy to allow school admins to update their own school
CREATE POLICY "School admins can update their school" 
ON public.schools 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles p
    JOIN public.user_roles ur ON p.id = ur.user_id
    WHERE p.id = auth.uid() 
    AND p.school_id = schools.id 
    AND ur.role = 'school_admin'::app_role
  )
);