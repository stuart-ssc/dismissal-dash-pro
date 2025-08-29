-- Create after_school_activities table
CREATE TABLE public.after_school_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id BIGINT NOT NULL,
  activity_name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  supervisor_name TEXT,
  capacity INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key to student_after_school_assignments
ALTER TABLE public.student_after_school_assignments 
ADD COLUMN after_school_activity_id UUID REFERENCES public.after_school_activities(id);

-- Enable RLS on after_school_activities
ALTER TABLE public.after_school_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for after_school_activities
CREATE POLICY "after_school_activities_school_admin" 
ON public.after_school_activities 
FOR ALL 
USING (can_view_school_data(school_id))
WITH CHECK (can_manage_school_data(school_id));

CREATE POLICY "after_school_activities_system_admin" 
ON public.after_school_activities 
FOR ALL 
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_after_school_activities_updated_at
BEFORE UPDATE ON public.after_school_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();