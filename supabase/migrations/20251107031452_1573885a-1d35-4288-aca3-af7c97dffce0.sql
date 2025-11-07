-- Fix profiles table RLS - Remove public access and implement restrictive policies

-- Drop any existing public access policies on profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- Create restrictive policies for profiles table
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- School admins can view profiles in their school
CREATE POLICY "School admins can view school profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'school_admin'::app_role) 
  AND school_id = get_user_school_id(auth.uid())
);

-- System admins can view all profiles
CREATE POLICY "System admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- System admins can update all profiles
CREATE POLICY "System admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'system_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role));

-- School admins can update profiles in their school
CREATE POLICY "School admins can update school profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'school_admin'::app_role) 
  AND school_id = get_user_school_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'school_admin'::app_role) 
  AND school_id = get_user_school_id(auth.uid())
);