-- Create security definer function to get teacher school_id without RLS
CREATE OR REPLACE FUNCTION public.get_teacher_school_id(p_teacher_id UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id
  FROM public.teachers
  WHERE id = p_teacher_id
  LIMIT 1
$$;

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "teachers_view_same_school" ON public.teachers;

-- Recreate the policy without self-recursion
CREATE POLICY "teachers_view_same_school"
ON public.teachers
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND
  school_id = public.get_teacher_school_id(auth.uid())
);