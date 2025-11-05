-- Add has_lanes field to car_lines table
ALTER TABLE public.car_lines
ADD COLUMN has_lanes boolean DEFAULT false;

-- Create car_line_lanes table
CREATE TABLE public.car_line_lanes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  car_line_id uuid NOT NULL REFERENCES public.car_lines(id) ON DELETE CASCADE,
  lane_name text NOT NULL,
  color text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add index for car_line_id
CREATE INDEX idx_car_line_lanes_car_line_id ON public.car_line_lanes(car_line_id);

-- Enable RLS on car_line_lanes
ALTER TABLE public.car_line_lanes ENABLE ROW LEVEL SECURITY;

-- RLS policies for car_line_lanes (match car_lines policies)
CREATE POLICY "car_line_lanes_school_admin"
ON public.car_line_lanes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM car_lines cl
    WHERE cl.id = car_line_lanes.car_line_id
    AND can_view_school_data(cl.school_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM car_lines cl
    WHERE cl.id = car_line_lanes.car_line_id
    AND can_manage_school_data(cl.school_id)
  )
);

CREATE POLICY "car_line_lanes_system_admin"
ON public.car_line_lanes
FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Add lane_id to car_line_pickups table
ALTER TABLE public.car_line_pickups
ADD COLUMN lane_id uuid REFERENCES public.car_line_lanes(id) ON DELETE SET NULL;

-- Add index for lane_id
CREATE INDEX idx_car_line_pickups_lane_id ON public.car_line_pickups(lane_id);

-- Add trigger for updated_at on car_line_lanes
CREATE TRIGGER update_car_line_lanes_updated_at
BEFORE UPDATE ON public.car_line_lanes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();