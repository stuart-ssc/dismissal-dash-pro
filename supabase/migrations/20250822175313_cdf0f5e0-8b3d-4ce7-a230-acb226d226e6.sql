-- Convert release_time from absolute time to relative minutes offset
-- This allows groups to be relative to the plan's dismissal time

-- Drop existing column and add new one as integer
ALTER TABLE dismissal_groups DROP COLUMN release_time;
ALTER TABLE dismissal_groups ADD COLUMN release_offset_minutes integer DEFAULT 0;

-- Add constraint to ensure reasonable offset values (0-60 minutes typically)
ALTER TABLE dismissal_groups ADD CONSTRAINT release_offset_minutes_check 
  CHECK (release_offset_minutes >= 0 AND release_offset_minutes <= 180);