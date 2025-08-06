-- Create walker_locations table
CREATE TABLE public.walker_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id BIGINT NOT NULL,
  location_name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.walker_locations ENABLE ROW LEVEL SECURITY;

-- Create policy for school admins to manage walker locations
CREATE POLICY "School admins can manage walker locations" 
ON public.walker_locations 
FOR ALL 
USING (get_user_school_id(auth.uid()) = school_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_walker_locations_updated_at
BEFORE UPDATE ON public.walker_locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();