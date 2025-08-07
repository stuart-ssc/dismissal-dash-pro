-- Create junction table for dismissal groups and car lines
CREATE TABLE public.dismissal_group_car_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dismissal_group_id UUID NOT NULL,
  car_line_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dismissal_group_id, car_line_id)
);

-- Enable Row Level Security
ALTER TABLE public.dismissal_group_car_lines ENABLE ROW LEVEL SECURITY;

-- Create policy for school admins to manage dismissal group car lines
CREATE POLICY "School admins can manage dismissal group car lines"
ON public.dismissal_group_car_lines
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM dismissal_groups dg
    JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id
    WHERE dg.id = dismissal_group_car_lines.dismissal_group_id 
    AND get_user_school_id(auth.uid()) = dp.school_id
  )
);