
-- Create ic_sync_configuration table
CREATE TABLE IF NOT EXISTS public.ic_sync_configuration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id bigint NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  paused boolean NOT NULL DEFAULT false,
  paused_until timestamptz,
  pause_reason text,
  sync_window_start time NOT NULL DEFAULT '10:00:00',
  sync_window_end time NOT NULL DEFAULT '14:00:00',
  skip_weekends boolean NOT NULL DEFAULT true,
  interval_type text NOT NULL DEFAULT 'daily',
  interval_value integer NOT NULL DEFAULT 1,
  last_sync_at timestamptz,
  next_scheduled_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id)
);

-- Enable RLS
ALTER TABLE public.ic_sync_configuration ENABLE ROW LEVEL SECURITY;

-- Only service role (edge functions) can access this table
-- No anon/authenticated policies needed since this is backend-only

-- Seed config for school 103090 (the school with an active IC connection)
INSERT INTO public.ic_sync_configuration (school_id)
SELECT 103090
WHERE EXISTS (SELECT 1 FROM schools WHERE id = 103090)
ON CONFLICT (school_id) DO NOTHING;

-- Also seed for any school that already has an active IC connection
INSERT INTO public.ic_sync_configuration (school_id)
SELECT ic.school_id
FROM infinite_campus_connections ic
WHERE ic.status = 'active'
ON CONFLICT (school_id) DO NOTHING;

-- Create should_sync_now function
CREATE OR REPLACE FUNCTION public.should_sync_now(p_school_id bigint)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_config RECORD;
  v_school_tz text;
  v_local_now timestamptz;
  v_local_time time;
  v_local_dow integer;
  v_local_date date;
  v_already_synced boolean;
BEGIN
  -- Get sync configuration
  SELECT * INTO v_config
  FROM ic_sync_configuration
  WHERE school_id = p_school_id;
  
  -- No config = don't sync
  IF v_config IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check enabled and not paused
  IF NOT v_config.enabled THEN
    RETURN false;
  END IF;
  
  IF v_config.paused THEN
    -- Check if pause has expired
    IF v_config.paused_until IS NOT NULL AND v_config.paused_until <= now() THEN
      -- Auto-unpause (will be updated by the scheduler)
      NULL; -- Allow sync to proceed
    ELSE
      RETURN false;
    END IF;
  END IF;
  
  -- Get school timezone
  SELECT COALESCE(s.timezone, 'America/New_York') INTO v_school_tz
  FROM schools s
  WHERE s.id = p_school_id;
  
  IF v_school_tz IS NULL THEN
    RETURN false;
  END IF;
  
  -- Convert current time to school's local time
  v_local_now := now() AT TIME ZONE v_school_tz;
  v_local_time := v_local_now::time;
  v_local_dow := EXTRACT(DOW FROM v_local_now); -- 0=Sun, 1=Mon, ..., 6=Sat
  v_local_date := v_local_now::date;
  
  -- Check weekday (skip weekends if configured)
  IF v_config.skip_weekends AND (v_local_dow = 0 OR v_local_dow = 6) THEN
    RETURN false;
  END IF;
  
  -- Check if within sync window
  IF v_local_time < v_config.sync_window_start OR v_local_time > v_config.sync_window_end THEN
    RETURN false;
  END IF;
  
  -- Check if already synced today (look at ic_sync_logs for a successful sync today in school's local time)
  SELECT EXISTS (
    SELECT 1
    FROM ic_sync_logs
    WHERE school_id = p_school_id
      AND status = 'completed'
      AND (created_at AT TIME ZONE v_school_tz)::date = v_local_date
  ) INTO v_already_synced;
  
  IF v_already_synced THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Create calculate_next_sync_time function
CREATE OR REPLACE FUNCTION public.calculate_next_sync_time(p_school_id bigint, p_from_time timestamptz DEFAULT now())
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_config RECORD;
  v_school_tz text;
  v_local_now timestamp;
  v_next_date date;
  v_next_dow integer;
  v_result timestamptz;
BEGIN
  -- Get sync configuration
  SELECT * INTO v_config
  FROM ic_sync_configuration
  WHERE school_id = p_school_id;
  
  IF v_config IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get school timezone
  SELECT COALESCE(s.timezone, 'America/New_York') INTO v_school_tz
  FROM schools s
  WHERE s.id = p_school_id;
  
  IF v_school_tz IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Convert from_time to school local time
  v_local_now := p_from_time AT TIME ZONE v_school_tz;
  
  -- Start from tomorrow
  v_next_date := (v_local_now::date) + 1;
  
  -- Find next valid weekday
  IF v_config.skip_weekends THEN
    v_next_dow := EXTRACT(DOW FROM v_next_date);
    -- Skip to Monday if on weekend
    IF v_next_dow = 0 THEN -- Sunday
      v_next_date := v_next_date + 1;
    ELSIF v_next_dow = 6 THEN -- Saturday
      v_next_date := v_next_date + 2;
    END IF;
  END IF;
  
  -- Combine next date with sync window start, in school timezone
  v_result := (v_next_date::text || ' ' || v_config.sync_window_start::text)::timestamp AT TIME ZONE v_school_tz;
  
  RETURN v_result;
END;
$$;

-- Update the cron job to run hourly instead of daily at 2 AM
-- First unschedule the old job if it exists
SELECT cron.unschedule('ic-sync-scheduler')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ic-sync-scheduler');

-- Create the hourly cron job
SELECT cron.schedule(
  'ic-sync-scheduler',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://lwbmtirzntexaxdlhgsk.supabase.co/functions/v1/ic-sync-scheduler',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3Ym10aXJ6bnRleGF4ZGxoZ3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxOTIzMTgsImV4cCI6MjA2OTc2ODMxOH0.6spEfXtZjS1qGGzJHoyphcAGpdF9_OwOFZdw6fYP_FE"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);

-- Add updated_at trigger
CREATE TRIGGER update_ic_sync_configuration_updated_at
  BEFORE UPDATE ON public.ic_sync_configuration
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
