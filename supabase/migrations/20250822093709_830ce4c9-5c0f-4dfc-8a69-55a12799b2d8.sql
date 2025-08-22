-- Create walker_pickups table for tracking walker student status
CREATE TABLE public.walker_pickups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  walker_session_id UUID NOT NULL,
  student_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'left_building')),
  left_at TIMESTAMP WITH TIME ZONE,
  managed_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(walker_session_id, student_id)
);

-- Enable Row Level Security
ALTER TABLE public.walker_pickups ENABLE ROW LEVEL SECURITY;

-- Create policies for walker_pickups
CREATE POLICY "walker_pickups_school_users" 
ON public.walker_pickups 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM walker_sessions ws 
  WHERE ws.id = walker_pickups.walker_session_id 
    AND can_view_school_data(ws.school_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM walker_sessions ws 
  WHERE ws.id = walker_pickups.walker_session_id 
    AND can_manage_school_data(ws.school_id)
));

CREATE POLICY "walker_pickups_system_admin" 
ON public.walker_pickups 
FOR ALL 
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_walker_pickups_updated_at
BEFORE UPDATE ON public.walker_pickups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add table to realtime publication for real-time updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.walker_pickups;