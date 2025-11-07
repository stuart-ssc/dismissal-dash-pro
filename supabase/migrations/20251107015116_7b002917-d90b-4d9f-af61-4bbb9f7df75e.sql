-- Add dismissal_mode_id column to students table
ALTER TABLE students 
ADD COLUMN dismissal_mode_id text;

-- Create index for fast searching by dismissal_mode_id
CREATE INDEX idx_students_dismissal_mode_id ON students(dismissal_mode_id) 
WHERE dismissal_mode_id IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN students.dismissal_mode_id IS 'Quick lookup ID for dismissal (e.g., car tag number, bus tag)';