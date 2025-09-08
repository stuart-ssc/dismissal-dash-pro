-- Update the check constraint on dismissal_groups.group_type to allow 'activity'
-- First drop the existing constraint
ALTER TABLE public.dismissal_groups DROP CONSTRAINT IF EXISTS dismissal_groups_group_type_check;

-- Create new constraint that includes 'activity' as a valid option
ALTER TABLE public.dismissal_groups 
ADD CONSTRAINT dismissal_groups_group_type_check 
CHECK (group_type IN ('bus', 'class', 'walker', 'car', 'activity', 'after_school_activities'));