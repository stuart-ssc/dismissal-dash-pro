-- Add completion_method column to track how dismissal runs are closed
ALTER TABLE dismissal_runs 
ADD COLUMN completion_method text 
CHECK (completion_method IN ('manual', 'auto_all_complete', 'auto_timeout'));