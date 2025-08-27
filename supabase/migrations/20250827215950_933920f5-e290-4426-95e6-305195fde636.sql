-- Add location completion tracking tables
CREATE TABLE IF NOT EXISTS public.walker_location_completions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    dismissal_run_id UUID NOT NULL,
    walker_location_id UUID NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(dismissal_run_id, walker_location_id)
);

CREATE TABLE IF NOT EXISTS public.car_line_completions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    dismissal_run_id UUID NOT NULL,
    car_line_id UUID NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(dismissal_run_id, car_line_id)
);

-- Enable RLS on new tables
ALTER TABLE public.walker_location_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_line_completions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for walker location completions
CREATE POLICY "walker_location_completions_school_users" 
ON public.walker_location_completions 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM dismissal_runs dr 
        WHERE dr.id = walker_location_completions.dismissal_run_id 
        AND can_view_school_data(dr.school_id)
    )
) 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM dismissal_runs dr 
        WHERE dr.id = walker_location_completions.dismissal_run_id 
        AND can_manage_school_data(dr.school_id)
    )
);

CREATE POLICY "walker_location_completions_system_admin" 
ON public.walker_location_completions 
FOR ALL 
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Create RLS policies for car line completions
CREATE POLICY "car_line_completions_school_users" 
ON public.car_line_completions 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM dismissal_runs dr 
        WHERE dr.id = car_line_completions.dismissal_run_id 
        AND can_view_school_data(dr.school_id)
    )
) 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM dismissal_runs dr 
        WHERE dr.id = car_line_completions.dismissal_run_id 
        AND can_manage_school_data(dr.school_id)
    )
);

CREATE POLICY "car_line_completions_system_admin" 
ON public.car_line_completions 
FOR ALL 
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Add triggers for updated_at
CREATE TRIGGER update_walker_location_completions_updated_at
    BEFORE UPDATE ON public.walker_location_completions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_car_line_completions_updated_at
    BEFORE UPDATE ON public.car_line_completions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add realtime publication for the new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.walker_location_completions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.car_line_completions;