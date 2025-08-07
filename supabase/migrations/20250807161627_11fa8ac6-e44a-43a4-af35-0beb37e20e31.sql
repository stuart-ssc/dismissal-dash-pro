-- Create dismissal_plans table
CREATE TABLE public.dismissal_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  dismissal_time TIME WITHOUT TIME ZONE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on dismissal_plans
ALTER TABLE public.dismissal_plans ENABLE ROW LEVEL SECURITY;

-- Create policy for dismissal_plans
CREATE POLICY "School admins can manage dismissal plans" 
ON public.dismissal_plans 
FOR ALL 
USING (get_user_school_id(auth.uid()) = school_id);

-- Create dismissal_groups table
CREATE TABLE public.dismissal_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dismissal_plan_id UUID NOT NULL REFERENCES public.dismissal_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  group_type TEXT NOT NULL CHECK (group_type IN ('bus', 'class', 'walker', 'car')),
  release_time TIME WITHOUT TIME ZONE,
  walker_location_id UUID REFERENCES public.walker_locations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on dismissal_groups
ALTER TABLE public.dismissal_groups ENABLE ROW LEVEL SECURITY;

-- Create policy for dismissal_groups
CREATE POLICY "School admins can manage dismissal groups" 
ON public.dismissal_groups 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.dismissal_plans dp 
  WHERE dp.id = dismissal_groups.dismissal_plan_id 
  AND get_user_school_id(auth.uid()) = dp.school_id
));

-- Create dismissal_group_buses junction table
CREATE TABLE public.dismissal_group_buses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dismissal_group_id UUID NOT NULL REFERENCES public.dismissal_groups(id) ON DELETE CASCADE,
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dismissal_group_id, bus_id)
);

-- Enable RLS on dismissal_group_buses
ALTER TABLE public.dismissal_group_buses ENABLE ROW LEVEL SECURITY;

-- Create policy for dismissal_group_buses
CREATE POLICY "School admins can manage dismissal group buses" 
ON public.dismissal_group_buses 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.dismissal_groups dg 
  JOIN public.dismissal_plans dp ON dp.id = dg.dismissal_plan_id
  WHERE dg.id = dismissal_group_buses.dismissal_group_id 
  AND get_user_school_id(auth.uid()) = dp.school_id
));

-- Create dismissal_group_classes junction table
CREATE TABLE public.dismissal_group_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dismissal_group_id UUID NOT NULL REFERENCES public.dismissal_groups(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dismissal_group_id, class_id)
);

-- Enable RLS on dismissal_group_classes
ALTER TABLE public.dismissal_group_classes ENABLE ROW LEVEL SECURITY;

-- Create policy for dismissal_group_classes
CREATE POLICY "School admins can manage dismissal group classes" 
ON public.dismissal_group_classes 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.dismissal_groups dg 
  JOIN public.dismissal_plans dp ON dp.id = dg.dismissal_plan_id
  WHERE dg.id = dismissal_group_classes.dismissal_group_id 
  AND get_user_school_id(auth.uid()) = dp.school_id
));

-- Create dismissal_group_students junction table
CREATE TABLE public.dismissal_group_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dismissal_group_id UUID NOT NULL REFERENCES public.dismissal_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dismissal_group_id, student_id)
);

-- Enable RLS on dismissal_group_students
ALTER TABLE public.dismissal_group_students ENABLE ROW LEVEL SECURITY;

-- Create policy for dismissal_group_students
CREATE POLICY "School admins can manage dismissal group students" 
ON public.dismissal_group_students 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.dismissal_groups dg 
  JOIN public.dismissal_plans dp ON dp.id = dg.dismissal_plan_id
  WHERE dg.id = dismissal_group_students.dismissal_group_id 
  AND get_user_school_id(auth.uid()) = dp.school_id
));

-- Create trigger for dismissal_plans updated_at
CREATE TRIGGER update_dismissal_plans_updated_at
BEFORE UPDATE ON public.dismissal_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for dismissal_groups updated_at
CREATE TRIGGER update_dismissal_groups_updated_at
BEFORE UPDATE ON public.dismissal_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create unique constraint to ensure only one default plan per school
CREATE UNIQUE INDEX idx_dismissal_plans_default_per_school 
ON public.dismissal_plans (school_id) 
WHERE is_default = true;