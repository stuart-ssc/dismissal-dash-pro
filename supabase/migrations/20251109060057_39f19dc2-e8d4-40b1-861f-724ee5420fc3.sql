-- Clean up any existing IC sync scheduler jobs
SELECT cron.unschedule(jobid) 
FROM cron.job 
WHERE jobname LIKE 'ic-sync-scheduler%';

-- Create daily IC sync scheduler cron job (runs at 2 AM daily)
-- This job automatically triggers syncs for all schools with active IC connections
-- that haven't been synced in the last 20 hours
SELECT cron.schedule(
  'ic-sync-scheduler-daily',
  '0 2 * * *', -- Daily at 2 AM
  $$
  SELECT net.http_post(
    url := 'https://lwbmtirzntexaxdlhgsk.supabase.co/functions/v1/ic-sync-scheduler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || get_app_secret('IC_SYNC_SCHEDULER_SECRET')
    ),
    body := jsonb_build_object('time', now()::text, 'source', 'pg_cron')
  ) as request_id;
  $$
);