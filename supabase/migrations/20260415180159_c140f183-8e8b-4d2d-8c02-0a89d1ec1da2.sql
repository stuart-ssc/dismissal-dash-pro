-- Create activity_transport_options table
CREATE TABLE public.activity_transport_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.special_use_groups(id) ON DELETE CASCADE,
  school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id)
);

-- Enable RLS
ALTER TABLE public.activity_transport_options ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view activity transport options for their school"
ON public.activity_transport_options
FOR SELECT
TO authenticated
USING (can_view_school_data(school_id));

CREATE POLICY "School managers can create activity transport options"
ON public.activity_transport_options
FOR INSERT
TO authenticated
WITH CHECK (can_manage_school_data(school_id));

CREATE POLICY "School managers can update activity transport options"
ON public.activity_transport_options
FOR UPDATE
TO authenticated
USING (can_manage_school_data(school_id));

CREATE POLICY "School managers can delete activity transport options"
ON public.activity_transport_options
FOR DELETE
TO authenticated
USING (can_manage_school_data(school_id));

-- Updated_at trigger
CREATE TRIGGER update_activity_transport_options_updated_at
BEFORE UPDATE ON public.activity_transport_options
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add activity_transport_option_id to student_temporary_transportation
ALTER TABLE public.student_temporary_transportation
ADD COLUMN activity_transport_option_id UUID REFERENCES public.activity_transport_options(id) ON DELETE SET NULL;

-- Add activity_transport_option_id to dismissal_group_activities
ALTER TABLE public.dismissal_group_activities
ADD COLUMN activity_transport_option_id UUID REFERENCES public.activity_transport_options(id) ON DELETE SET NULL;