-- Update dismissal plan time to 9:35 PM for testing
UPDATE dismissal_plans 
SET dismissal_time = '21:35:00'
WHERE status = 'active' 
AND is_default = true;

-- Create today's dismissal run with the updated plan
SELECT create_scheduled_dismissal_run(
  (SELECT school_id FROM dismissal_plans WHERE status = 'active' AND is_default = true LIMIT 1)::bigint,
  CURRENT_DATE
);