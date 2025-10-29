-- Create new cron job with proper authentication using the secret
-- Note: If a job with this name exists, it will be replaced
SELECT cron.schedule(
  'invoke-dismissal-scheduler-every-2min',
  '*/2 * * * *', -- Every 2 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://lwbmtirzntexaxdlhgsk.supabase.co/functions/v1/dismissal-scheduler',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.dismissal_scheduler_secret', true)
      ),
      body := jsonb_build_object('time', now())
    ) as request_id;
  $$
);

-- Force update today's dismissal run for School ID 2 to preparation status
UPDATE dismissal_runs 
SET 
  status = 'preparation', 
  updated_at = now() 
WHERE 
  school_id = 2 
  AND date = CURRENT_DATE 
  AND status = 'scheduled'
  AND preparation_start_time <= now();