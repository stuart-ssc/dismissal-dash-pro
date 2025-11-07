
-- Clean up old cron jobs
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('dismissal-scheduler-every-2-minutes', 'run-dismissal-scheduler');

-- Create new cron job that uses database configuration for the secret
SELECT cron.schedule(
  'dismissal-scheduler-automated',
  '*/2 * * * *', -- Every 2 minutes
  $$
  SELECT net.http_post(
    url := 'https://lwbmtirzntexaxdlhgsk.supabase.co/functions/v1/dismissal-scheduler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.dismissal_scheduler_secret', true)
    ),
    body := jsonb_build_object('time', now()::text, 'source', 'pg_cron')
  ) as request_id;
  $$
);

-- Add comment for documentation
COMMENT ON EXTENSION pg_cron IS 'Automated dismissal scheduler runs every 2 minutes via pg_cron';
