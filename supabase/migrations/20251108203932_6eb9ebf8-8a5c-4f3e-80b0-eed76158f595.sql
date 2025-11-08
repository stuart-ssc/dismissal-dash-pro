-- Add cancellation tracking fields to special_use_runs table
ALTER TABLE special_use_runs 
ADD COLUMN cancellation_reason text,
ADD COLUMN cancelled_at timestamp with time zone,
ADD COLUMN cancelled_by uuid REFERENCES profiles(id);

-- Add index for better query performance on cancelled_by
CREATE INDEX idx_special_use_runs_cancelled_by ON special_use_runs(cancelled_by) WHERE cancelled_by IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN special_use_runs.cancellation_reason IS 'Reason provided when a run is cancelled';
COMMENT ON COLUMN special_use_runs.cancelled_at IS 'Timestamp when the run was cancelled';
COMMENT ON COLUMN special_use_runs.cancelled_by IS 'User who cancelled the run';