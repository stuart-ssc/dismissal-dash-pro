-- Fix dismissal scheduler to use app_secrets table
-- First, unschedule the broken cron job that uses current_setting
SELECT cron.unschedule('dismissal-scheduler-automated');

-- Create new cron job that uses app_secrets table for the secret
SELECT cron.schedule(
  'dismissal-scheduler-automated',
  '*/2 * * * *', -- Every 2 minutes
  $$
  SELECT net.http_post(
    url := 'https://lwbmtirzntexaxdlhgsk.supabase.co/functions/v1/dismissal-scheduler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || get_app_secret('DISMISSAL_SCHEDULER_SECRET')
    ),
    body := jsonb_build_object('time', now()::text, 'source', 'pg_cron')
  ) as request_id;
  $$
);

-- Add comment for documentation
COMMENT ON EXTENSION pg_cron IS 'Automated dismissal scheduler runs every 2 minutes via pg_cron using app_secrets table';