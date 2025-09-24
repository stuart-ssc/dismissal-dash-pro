-- Fix security vulnerability: Remove any overly permissive access to teachers table
-- and ensure all policies require proper authentication

-- First, let's check current policies and remove any that might allow public access
-- We'll rebuild the policies to ensure they're secure

-- Drop existing policies to rebuild them securely
DROP POLICY IF EXISTS "teachers_school_admin" ON public.teachers;
DROP POLICY IF EXISTS "teachers_system_admin" ON public.teachers;
DROP POLICY IF EXISTS "teachers_public_access" ON public.teachers;

-- Create secure policies that require authentication and proper role-based access

-- System admins can access all teacher records
CREATE POLICY "teachers_system_admin_access" 
ON public.teachers 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- School admins can only access teachers from their school
CREATE POLICY "teachers_school_admin_access" 
ON public.teachers 
FOR ALL 
TO authenticated
USING (
  has_role(auth.uid(), 'school_admin'::app_role) 
  AND can_view_school_data(school_id)
)
WITH CHECK (
  has_role(auth.uid(), 'school_admin'::app_role) 
  AND can_manage_school_data(school_id)
);

-- Teachers can only view other teachers from their school (but not modify)
CREATE POLICY "teachers_same_school_view" 
ON public.teachers 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND can_view_school_data(school_id)
);

-- Ensure RLS is enabled on teachers table
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Revoke any public access that might exist
REVOKE ALL ON public.teachers FROM anon;
REVOKE ALL ON public.teachers FROM public;