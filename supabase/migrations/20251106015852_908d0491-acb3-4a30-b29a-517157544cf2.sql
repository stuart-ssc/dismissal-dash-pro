-- Create bus_student_loading_events table to track when students board buses
CREATE TABLE public.bus_student_loading_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  dismissal_run_id UUID NOT NULL REFERENCES public.dismissal_runs(id) ON DELETE CASCADE,
  loaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  loaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_bus_loading_events_bus_run ON public.bus_student_loading_events(bus_id, dismissal_run_id);
CREATE INDEX idx_bus_loading_events_student ON public.bus_student_loading_events(student_id, dismissal_run_id);

-- Enable RLS
ALTER TABLE public.bus_student_loading_events ENABLE ROW LEVEL SECURITY;

-- Policy: School users can view loading events for their school's buses
CREATE POLICY "Users can view loading events for their school"
ON public.bus_student_loading_events
FOR SELECT
USING (
  has_role(auth.uid(), 'system_admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.buses b
    WHERE b.id = bus_student_loading_events.bus_id
      AND can_view_school_data(b.school_id)
  )
);

-- Policy: School users can insert loading events for their school's buses
CREATE POLICY "Users can insert loading events for their school"
ON public.bus_student_loading_events
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'system_admin'::app_role) OR
  (
    (has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.buses b
      WHERE b.id = bus_student_loading_events.bus_id
        AND can_operate_school_data(b.school_id)
    )
  )
);

-- Enable real-time updates for loading events
ALTER TABLE public.bus_student_loading_events REPLICA IDENTITY FULL;