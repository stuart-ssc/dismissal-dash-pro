-- Create car_lines table for managing school car pickup lines
CREATE TABLE public.car_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id BIGINT NOT NULL,
  line_name TEXT NOT NULL,
  color TEXT NOT NULL,
  pickup_location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.car_lines ENABLE ROW LEVEL SECURITY;

-- Create policies for school admin access
CREATE POLICY "School admins can manage car lines" 
ON public.car_lines 
FOR ALL 
USING (get_user_school_id(auth.uid()) = school_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_car_lines_updated_at
BEFORE UPDATE ON public.car_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_car_lines_school_id ON public.car_lines(school_id);
CREATE INDEX idx_car_lines_status ON public.car_lines(status);