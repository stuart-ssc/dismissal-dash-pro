DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'buses' 
      AND policyname = 'School admins can insert buses in their school'
  ) THEN
    CREATE POLICY "School admins can insert buses in their school"
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
  END IF;
END $$;