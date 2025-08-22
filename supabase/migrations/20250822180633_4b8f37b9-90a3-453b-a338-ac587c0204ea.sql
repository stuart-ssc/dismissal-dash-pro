-- Add car rider configuration fields to dismissal_groups table
ALTER TABLE public.dismissal_groups 
ADD COLUMN car_rider_capacity INTEGER,
ADD COLUMN car_rider_type TEXT CHECK (car_rider_type IN ('count', 'all_remaining'));

-- Update existing car rider groups to use 'all_remaining' as default
UPDATE public.dismissal_groups 
SET car_rider_type = 'all_remaining' 
WHERE group_type = 'car';

-- Add comment for clarity
COMMENT ON COLUMN public.dismissal_groups.car_rider_capacity IS 'Number of car riders to dismiss with this group (null for all_remaining type)';
COMMENT ON COLUMN public.dismissal_groups.car_rider_type IS 'Type of car rider group: count (specific number) or all_remaining';