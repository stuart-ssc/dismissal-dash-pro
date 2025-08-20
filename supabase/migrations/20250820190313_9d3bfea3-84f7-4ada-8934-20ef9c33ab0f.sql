-- Remove the dangerous public view policy that exposes all school data
DROP POLICY IF EXISTS "schools_public_view" ON public.schools;

-- Create a secure policy that only allows authenticated users to view their own school data
CREATE POLICY "schools_authenticated_users_own_school" 
ON public.schools 
FOR SELECT 
TO authenticated 
USING (can_view_school_data(id));

-- Ensure the update policy is properly named and secured
DROP POLICY IF EXISTS "schools_admin_update" ON public.schools;
CREATE POLICY "schools_authorized_update" 
ON public.schools 
FOR UPDATE 
TO authenticated 
USING (can_manage_school_data(id));

-- Keep the system admin policy for full access
-- (schools_system_admin policy already exists and is secure)