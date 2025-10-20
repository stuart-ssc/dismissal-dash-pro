-- Drop existing policies on schools table
DROP POLICY IF EXISTS "schools_system_admin_all" ON public.schools;
DROP POLICY IF EXISTS "schools_admin_update" ON public.schools;
DROP POLICY IF EXISTS "schools_view_own_school" ON public.schools;

-- Recreate policies with correct permissive/restrictive settings

-- System admin policy should be PERMISSIVE and grant ALL access
CREATE POLICY "schools_system_admin_all"
ON public.schools
AS PERMISSIVE
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'system_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role));

-- School admin can only UPDATE their own school (RESTRICTIVE)
CREATE POLICY "schools_admin_update"
ON public.schools
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (can_manage_school_data(id))
WITH CHECK (can_manage_school_data(id));

-- Users can view their own school (PERMISSIVE)
CREATE POLICY "schools_view_own_school"
ON public.schools
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (can_view_school_data(id));