-- Fix foreign key relationship between profiles and user_roles
ALTER TABLE public.user_roles 
ADD CONSTRAINT fk_user_roles_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Fix infinite recursion in classes RLS policies by creating a security definer function
CREATE OR REPLACE FUNCTION public.get_user_school_id(user_uuid uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT school_id FROM public.profiles WHERE id = user_uuid;
$$;

-- Drop existing problematic RLS policies on classes table
DROP POLICY IF EXISTS "School admins can manage classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can view their classes" ON public.classes;

-- Create new non-recursive RLS policies for classes
CREATE POLICY "School admins can manage classes" 
ON public.classes 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'school_admin'::app_role
  ) 
  AND public.get_user_school_id(auth.uid()) = school_id
);

CREATE POLICY "Teachers can view their classes" 
ON public.classes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_roles ur 
    JOIN public.class_teachers ct ON ur.user_id = ct.teacher_id
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'teacher'::app_role
    AND ct.class_id = classes.id
  )
);