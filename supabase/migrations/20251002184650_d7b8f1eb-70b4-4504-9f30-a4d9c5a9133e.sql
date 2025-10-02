-- Set up cron job to run dismissal-scheduler every 2 minutes
SELECT cron.schedule(
  'dismissal-scheduler-cron',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://lwbmtirzntexaxdlhgsk.supabase.co/functions/v1/dismissal-scheduler',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3Ym10aXJ6bnRleGF4ZGxoZ3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxOTIzMTgsImV4cCI6MjA2OTc2ODMxOH0.6spEfXtZjS1qGGzJHoyphcAGpdF9_OwOFZdw6fYP_FE"}'::jsonb,
    body := jsonb_build_object('time', now())
  ) as request_id;
  $$
);