-- Make student_id column nullable since it's now optional
ALTER TABLE public.students 
ALTER COLUMN student_id DROP NOT NULL;

-- Update the unique constraint to handle NULL values properly
-- Drop the existing constraint
ALTER TABLE public.students 
DROP CONSTRAINT students_student_id_school_id_key;

-- Add a new partial unique constraint that only applies when student_id is not null
CREATE UNIQUE INDEX students_student_id_school_id_unique 
ON public.students (student_id, school_id) 
WHERE student_id IS NOT NULL;