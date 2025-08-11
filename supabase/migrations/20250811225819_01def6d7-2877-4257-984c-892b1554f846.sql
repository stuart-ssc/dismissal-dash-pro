-- Fix RLS policies for buses, walker_locations, and car_lines

-- Drop existing bus policies and recreate them properly
DROP POLICY IF EXISTS "School admins and system admins can manage buses" ON public.buses;
DROP POLICY IF EXISTS "School admins can insert buses in their school" ON public.buses;

-- Create a comprehensive bus policy
CREATE POLICY "School users can manage their school buses"
ON public.buses
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR 
  (has_role(auth.uid(), 'school_admin'::app_role) AND get_user_school_id(auth.uid()) = school_id) OR
  (has_role(auth.uid(), 'teacher'::app_role) AND get_user_school_id(auth.uid()) = school_id)
)
WITH CHECK (
  has_role(auth.uid(), 'system_admin'::app_role) OR 
  (has_role(auth.uid(), 'school_admin'::app_role) AND get_user_school_id(auth.uid()) = school_id)
);

-- Drop and recreate walker_locations policies
DROP POLICY IF EXISTS "School admins and system admins can manage walker locations" ON public.walker_locations;

CREATE POLICY "School users can manage their school walker locations"
ON public.walker_locations
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR 
  (has_role(auth.uid(), 'school_admin'::app_role) AND get_user_school_id(auth.uid()) = school_id) OR
  (has_role(auth.uid(), 'teacher'::app_role) AND get_user_school_id(auth.uid()) = school_id)
)
WITH CHECK (
  has_role(auth.uid(), 'system_admin'::app_role) OR 
  (has_role(auth.uid(), 'school_admin'::app_role) AND get_user_school_id(auth.uid()) = school_id)
);

-- Drop and recreate car_lines policies  
DROP POLICY IF EXISTS "School admins and system admins can manage car lines" ON public.car_lines;

CREATE POLICY "School users can manage their school car lines"
ON public.car_lines
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR 
  (has_role(auth.uid(), 'school_admin'::app_role) AND get_user_school_id(auth.uid()) = school_id) OR
  (has_role(auth.uid(), 'teacher'::app_role) AND get_user_school_id(auth.uid()) = school_id)
)
WITH CHECK (
  has_role(auth.uid(), 'system_admin'::app_role) OR 
  (has_role(auth.uid(), 'school_admin'::app_role) AND get_user_school_id(auth.uid()) = school_id)
);