-- First, add 'teacher' role to the app_role enum if it doesn't exist
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'teacher';

-- Create students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  school_id BIGINT NOT NULL REFERENCES public.schools(id),
  parent_guardian_name TEXT,
  contact_info TEXT,
  special_notes TEXT,
  dismissal_group TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, school_id)
);

-- Create classes table
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_name TEXT NOT NULL,
  room_number TEXT,
  school_id BIGINT NOT NULL REFERENCES public.schools(id),
  grade_level TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class_name, room_number, school_id)
);

-- Create class_rosters junction table (students in classes)
CREATE TABLE public.class_rosters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, class_id)
);

-- Create class_teachers junction table (teachers assigned to classes)
CREATE TABLE public.class_teachers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, class_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_teachers ENABLE ROW LEVEL SECURITY;

-- RLS policies for students table
CREATE POLICY "School admins can manage students" 
ON public.students 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON p.id = ur.user_id
    WHERE p.id = auth.uid()
    AND p.school_id = students.school_id
    AND ur.role = 'school_admin'
  )
);

CREATE POLICY "Teachers can view their students" 
ON public.students 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON p.id = ur.user_id
    JOIN public.class_teachers ct ON p.id = ct.teacher_id
    JOIN public.class_rosters cr ON ct.class_id = cr.class_id
    WHERE p.id = auth.uid()
    AND cr.student_id = students.id
    AND ur.role = 'teacher'
  )
);

-- RLS policies for classes table
CREATE POLICY "School admins can manage classes" 
ON public.classes 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON p.id = ur.user_id
    WHERE p.id = auth.uid()
    AND p.school_id = classes.school_id
    AND ur.role = 'school_admin'
  )
);

CREATE POLICY "Teachers can view their classes" 
ON public.classes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON p.id = ur.user_id
    JOIN public.class_teachers ct ON p.id = ct.teacher_id
    WHERE p.id = auth.uid()
    AND ct.class_id = classes.id
    AND ur.role = 'teacher'
  )
);

-- RLS policies for class_rosters table
CREATE POLICY "School admins can manage class rosters" 
ON public.class_rosters 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON p.id = ur.user_id
    JOIN public.students s ON class_rosters.student_id = s.id
    WHERE p.id = auth.uid()
    AND p.school_id = s.school_id
    AND ur.role = 'school_admin'
  )
);

CREATE POLICY "Teachers can view their class rosters" 
ON public.class_rosters 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON p.id = ur.user_id
    JOIN public.class_teachers ct ON p.id = ct.teacher_id
    WHERE p.id = auth.uid()
    AND ct.class_id = class_rosters.class_id
    AND ur.role = 'teacher'
  )
);

-- RLS policies for class_teachers table
CREATE POLICY "School admins can manage class teachers" 
ON public.class_teachers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON p.id = ur.user_id
    JOIN public.classes c ON class_teachers.class_id = c.id
    WHERE p.id = auth.uid()
    AND p.school_id = c.school_id
    AND ur.role = 'school_admin'
  )
);

CREATE POLICY "Teachers can view their class assignments" 
ON public.class_teachers 
FOR SELECT 
USING (
  auth.uid() = teacher_id OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON p.id = ur.user_id
    JOIN public.classes c ON class_teachers.class_id = c.id
    WHERE p.id = auth.uid()
    AND p.school_id = c.school_id
    AND ur.role = 'school_admin'
  )
);

-- Add updated_at triggers
CREATE TRIGGER update_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classes_updated_at
BEFORE UPDATE ON public.classes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();