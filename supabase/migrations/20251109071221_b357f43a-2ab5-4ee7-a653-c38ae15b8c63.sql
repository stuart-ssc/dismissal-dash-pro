-- Create auto-merge rules table
CREATE TABLE IF NOT EXISTS public.ic_auto_merge_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id bigint NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 1,
  
  -- Conditions
  min_confidence_score numeric(3,2) NOT NULL DEFAULT 0.90 CHECK (min_confidence_score >= 0 AND min_confidence_score <= 1),
  allowed_match_types text[] NOT NULL DEFAULT '{}', -- ['exact_ic_id', 'exact_email', 'exact_name_grade', 'fuzzy_name']
  record_types text[] NOT NULL DEFAULT ARRAY['student', 'teacher'], -- ['student', 'teacher']
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ic_auto_merge_rules ENABLE ROW LEVEL SECURITY;

-- Policy: School admins can view rules for their school
CREATE POLICY "School admins can view their school's auto-merge rules"
  ON public.ic_auto_merge_rules
  FOR SELECT
  USING (can_view_school_data(school_id));

-- Policy: School admins can create rules for their school
CREATE POLICY "School admins can create auto-merge rules for their school"
  ON public.ic_auto_merge_rules
  FOR INSERT
  WITH CHECK (can_manage_school_data(school_id));

-- Policy: School admins can update rules for their school
CREATE POLICY "School admins can update their school's auto-merge rules"
  ON public.ic_auto_merge_rules
  FOR UPDATE
  USING (can_manage_school_data(school_id))
  WITH CHECK (can_manage_school_data(school_id));

-- Policy: School admins can delete rules for their school
CREATE POLICY "School admins can delete their school's auto-merge rules"
  ON public.ic_auto_merge_rules
  FOR DELETE
  USING (can_manage_school_data(school_id));

-- Create updated_at trigger
CREATE TRIGGER set_updated_at_ic_auto_merge_rules
  BEFORE UPDATE ON public.ic_auto_merge_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_ic_auto_merge_rules_school_enabled ON public.ic_auto_merge_rules(school_id, enabled);

-- Add auto_approved_by_rule_id to ic_pending_merges to track which rule approved it
ALTER TABLE public.ic_pending_merges 
ADD COLUMN IF NOT EXISTS auto_approved_by_rule_id uuid REFERENCES public.ic_auto_merge_rules(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS auto_approved_at timestamptz;

-- Function to check if a merge matches any auto-merge rules
CREATE OR REPLACE FUNCTION public.check_auto_merge_rules(
  p_school_id bigint,
  p_record_type text,
  p_match_type text,
  p_confidence_score numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matching_rule_id uuid;
BEGIN
  -- Find the highest priority enabled rule that matches
  SELECT id INTO matching_rule_id
  FROM public.ic_auto_merge_rules
  WHERE school_id = p_school_id
    AND enabled = true
    AND p_confidence_score >= min_confidence_score
    AND p_match_type = ANY(allowed_match_types)
    AND p_record_type = ANY(record_types)
  ORDER BY priority ASC, created_at ASC
  LIMIT 1;
  
  RETURN matching_rule_id;
END;
$$;

COMMENT ON TABLE public.ic_auto_merge_rules IS 'Configurable rules for automatically approving IC pending merges based on confidence and match criteria';
COMMENT ON FUNCTION public.check_auto_merge_rules IS 'Checks if a pending merge matches any active auto-merge rules for the school';