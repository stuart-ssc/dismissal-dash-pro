-- Allow teachers to view roles of users in their school
CREATE POLICY "teachers_view_same_school_roles" 
  ON public.user_roles 
  FOR SELECT 
  TO authenticated
  USING (
    has_role(auth.uid(), 'teacher'::app_role) 
    AND EXISTS (
      SELECT 1 
      FROM profiles p1, profiles p2
      WHERE p1.id = auth.uid()
        AND p2.id = user_roles.user_id
        AND p1.school_id = p2.school_id
        AND p1.school_id IS NOT NULL
    )
  );