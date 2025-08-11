-- Add explicit INSERT policy for buses to allow school admins to create buses in their own school
CREATE POLICY IF NOT EXISTS "School admins can insert buses in their school"
ON public.buses
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'system_admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = auth.uid()
      AND p.school_id = public.buses.school_id
      AND ur.role = 'school_admin'::app_role
  )
);
