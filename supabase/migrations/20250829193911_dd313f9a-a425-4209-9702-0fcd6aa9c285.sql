-- Add after school activities support to schools table
ALTER TABLE public.schools 
ADD COLUMN after_school_activities_enabled boolean DEFAULT true;

-- Update the group_type check constraint to include after_school_activities
-- First, drop the existing constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'dismissal_groups_group_type_check' 
               AND table_name = 'dismissal_groups') THEN
        ALTER TABLE public.dismissal_groups DROP CONSTRAINT dismissal_groups_group_type_check;
    END IF;
END $$;

-- Add the updated constraint with after_school_activities
ALTER TABLE public.dismissal_groups 
ADD CONSTRAINT dismissal_groups_group_type_check 
CHECK (group_type IN ('bus', 'car_rider', 'walker', 'after_school_activities'));