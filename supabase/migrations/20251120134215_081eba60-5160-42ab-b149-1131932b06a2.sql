-- Fix class_rosters RLS policies to support district_admin impersonation

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view class rosters for their school" ON public.class_rosters;
DROP POLICY IF EXISTS "Users can manage class rosters for their school" ON public.class_rosters;

-- Recreate SELECT policy with district_admin support
CREATE POLICY "Users can view class rosters for their school" 
ON public.class_rosters 
FOR SELECT 
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR
  has_role(auth.uid(), 'district_admin'::app_role) OR
  (has_role(auth.uid(), 'school_admin'::app_role) AND EXISTS (
    SELECT 1 FROM classes c WHERE c.id = class_id AND c.school_id = get_user_school_id(auth.uid())
  )) OR
  (has_role(auth.uid(), 'teacher'::app_role) AND class_id = ANY(get_user_taught_class_ids()))
);

-- Recreate ALL policy with district_admin support
CREATE POLICY "Users can manage class rosters for their school" 
ON public.class_rosters 
FOR ALL 
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR
  has_role(auth.uid(), 'district_admin'::app_role) OR
  (has_role(auth.uid(), 'school_admin'::app_role) AND EXISTS (
    SELECT 1 FROM classes c WHERE c.id = class_id AND c.school_id = get_user_school_id(auth.uid())
  ))
);

COMMENT ON POLICY "Users can view class rosters for their school" ON public.class_rosters IS 
'Allows system admins, district admins, school admins (for their school), and teachers (for their classes) to view class rosters. District admin access works during school impersonation via get_user_school_id().';

COMMENT ON POLICY "Users can manage class rosters for their school" ON public.class_rosters IS 
'Allows system admins, district admins, and school admins (for their school) to manage class rosters. District admin access works during school impersonation via get_user_school_id().';