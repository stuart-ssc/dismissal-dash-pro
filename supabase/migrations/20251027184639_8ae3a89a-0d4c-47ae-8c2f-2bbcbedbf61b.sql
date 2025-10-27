-- First, delete any class_coverage records that reference non-existent profiles
DELETE FROM class_coverage 
WHERE covering_teacher_id NOT IN (SELECT id FROM profiles);

-- Drop the existing foreign key constraint that references teachers table
ALTER TABLE class_coverage 
DROP CONSTRAINT IF EXISTS class_coverage_covering_teacher_id_fkey;

-- Add new foreign key constraint referencing profiles table
ALTER TABLE class_coverage 
ADD CONSTRAINT class_coverage_covering_teacher_id_fkey 
FOREIGN KEY (covering_teacher_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- Also update assigned_by to reference profiles for consistency
ALTER TABLE class_coverage 
DROP CONSTRAINT IF EXISTS class_coverage_assigned_by_fkey;

ALTER TABLE class_coverage 
ADD CONSTRAINT class_coverage_assigned_by_fkey 
FOREIGN KEY (assigned_by) 
REFERENCES profiles(id) 
ON DELETE CASCADE;