-- Create junction table for dismissal group activities
CREATE TABLE public.dismissal_group_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dismissal_group_id UUID NOT NULL,
  after_school_activity_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.dismissal_group_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for dismissal group activities (following same pattern as other junction tables)
CREATE POLICY "dismissal_group_activities_school_users" 
ON public.dismissal_group_activities 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM dismissal_groups dg
    JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id
    WHERE dg.id = dismissal_group_activities.dismissal_group_id 
      AND can_view_school_data(dp.school_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM dismissal_groups dg
    JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id
    WHERE dg.id = dismissal_group_activities.dismissal_group_id 
      AND can_manage_school_data(dp.school_id)
  )
);

CREATE POLICY "dismissal_group_activities_system_admin" 
ON public.dismissal_group_activities 
FOR ALL 
USING (has_role(auth.uid(), 'system_admin'::app_role));