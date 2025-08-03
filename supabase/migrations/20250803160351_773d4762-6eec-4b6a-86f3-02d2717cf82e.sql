-- Create a separate teachers table for teacher information
CREATE TABLE public.teachers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  school_id BIGINT NOT NULL REFERENCES public.schools(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email, school_id)
);

-- Enable RLS on teachers table
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- RLS policies for teachers table
CREATE POLICY "School admins can manage teachers" 
ON public.teachers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON p.id = ur.user_id
    WHERE p.id = auth.uid()
    AND p.school_id = teachers.school_id
    AND ur.role = 'school_admin'
  )
);

-- Update class_teachers to reference teachers table instead of profiles
ALTER TABLE public.class_teachers 
DROP CONSTRAINT class_teachers_teacher_id_fkey;

ALTER TABLE public.class_teachers 
ADD CONSTRAINT class_teachers_teacher_id_fkey 
FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;

-- Add updated_at trigger
CREATE TRIGGER update_teachers_updated_at
BEFORE UPDATE ON public.teachers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();