-- Create car line pickups table for tracking student pickup status
CREATE TABLE public.car_line_pickups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  car_line_session_id UUID NOT NULL,
  student_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'parent_arrived', 'picked_up')),
  parent_arrived_at TIMESTAMP WITH TIME ZONE,
  picked_up_at TIMESTAMP WITH TIME ZONE,
  managed_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(car_line_session_id, student_id)
);

-- Enable RLS
ALTER TABLE public.car_line_pickups ENABLE ROW LEVEL SECURITY;

-- Create policies for car_line_pickups
CREATE POLICY "car_line_pickups_school_users"
ON public.car_line_pickups
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM car_line_sessions cls
    WHERE cls.id = car_line_pickups.car_line_session_id 
      AND can_view_school_data(cls.school_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM car_line_sessions cls
    WHERE cls.id = car_line_pickups.car_line_session_id 
      AND can_manage_school_data(cls.school_id)
  )
);

CREATE POLICY "car_line_pickups_system_admin"
ON public.car_line_pickups
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_car_line_pickups_updated_at
  BEFORE UPDATE ON public.car_line_pickups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();