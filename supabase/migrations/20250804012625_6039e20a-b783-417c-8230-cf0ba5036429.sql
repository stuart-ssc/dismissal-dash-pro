-- Clean up and simplify ALL policies that could restrict student visibility
-- This will ensure school admins can see all students, classes, and related data in their school

-- 1. Clean up students policies completely
DROP POLICY IF EXISTS "School admins can manage students in their school" ON public.students;
DROP POLICY IF EXISTS "Teachers can view their assigned students" ON public.students;
DROP POLICY IF EXISTS "Teachers can view their students" ON public.students;

-- Create the simplest possible policy for students
CREATE POLICY "School admins full access to students" 
ON public.students 
FOR ALL 
USING (
  get_user_school_id(auth.uid()) = school_id
);

-- 2. Clean up class_rosters policies
DROP POLICY IF EXISTS "School admins can manage class rosters" ON public.class_rosters;
DROP POLICY IF EXISTS "Teachers can view their class rosters" ON public.class_rosters;

-- Create simple policy for class rosters  
CREATE POLICY "School admins full access to class rosters" 
ON public.class_rosters 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.students s 
    WHERE s.id = class_rosters.student_id 
    AND get_user_school_id(auth.uid()) = s.school_id
  )
);

-- 3. Ensure classes policies are clean
DROP POLICY IF EXISTS "School admins can view all classes in their school" ON public.classes;
DROP POLICY IF EXISTS "Teachers can view their assigned classes" ON public.classes;
DROP POLICY IF EXISTS "School admins can manage classes" ON public.classes;

-- Recreate simple classes policy
CREATE POLICY "School admins full access to classes" 
ON public.classes 
FOR ALL 
USING (
  get_user_school_id(auth.uid()) = school_id
);

-- 4. Ensure class_teachers policies are clean
DROP POLICY IF EXISTS "School admins can manage class teachers" ON public.class_teachers;
DROP POLICY IF EXISTS "Teachers can view their class assignments" ON public.class_teachers;

-- Recreate simple class_teachers policy
CREATE POLICY "School admins full access to class teachers" 
ON public.class_teachers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.classes c 
    WHERE c.id = class_teachers.class_id 
    AND get_user_school_id(auth.uid()) = c.school_id
  )
);