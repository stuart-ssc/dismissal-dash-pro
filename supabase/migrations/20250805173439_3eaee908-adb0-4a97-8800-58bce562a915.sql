-- Create buses table
CREATE TABLE public.buses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bus_number text NOT NULL,
  driver_first_name text NOT NULL,
  driver_last_name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  school_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create student_bus_assignments table
CREATE TABLE public.student_bus_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL,
  bus_id uuid NOT NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id, bus_id)
);

-- Enable RLS on buses table
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;

-- Enable RLS on student_bus_assignments table
ALTER TABLE public.student_bus_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for buses
CREATE POLICY "School admins can manage buses" 
ON public.buses 
FOR ALL 
USING (get_user_school_id(auth.uid()) = school_id);

-- Create RLS policies for student_bus_assignments
CREATE POLICY "School admins can manage student bus assignments" 
ON public.student_bus_assignments 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM students s 
  WHERE s.id = student_bus_assignments.student_id 
  AND get_user_school_id(auth.uid()) = s.school_id
));

-- Create trigger for buses updated_at
CREATE TRIGGER update_buses_updated_at
BEFORE UPDATE ON public.buses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_buses_school_id ON public.buses(school_id);
CREATE INDEX idx_student_bus_assignments_student_id ON public.student_bus_assignments(student_id);
CREATE INDEX idx_student_bus_assignments_bus_id ON public.student_bus_assignments(bus_id);