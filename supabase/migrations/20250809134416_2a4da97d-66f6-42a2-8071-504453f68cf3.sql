-- Create student_walker_assignments table
CREATE TABLE public.student_walker_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  walker_location_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, walker_location_id)
);

-- Create student_car_assignments table  
CREATE TABLE public.student_car_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  car_line_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, car_line_id)
);

-- Enable Row Level Security
ALTER TABLE public.student_walker_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_car_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for student_walker_assignments
CREATE POLICY "School admins can manage student walker assignments" 
ON public.student_walker_assignments 
FOR ALL 
USING (EXISTS (
  SELECT 1 
  FROM students s 
  WHERE s.id = student_walker_assignments.student_id 
  AND get_user_school_id(auth.uid()) = s.school_id
));

-- Create policies for student_car_assignments
CREATE POLICY "School admins can manage student car assignments" 
ON public.student_car_assignments 
FOR ALL 
USING (EXISTS (
  SELECT 1 
  FROM students s 
  WHERE s.id = student_car_assignments.student_id 
  AND get_user_school_id(auth.uid()) = s.school_id
));