-- Create alert configuration table
CREATE TABLE ic_data_quality_alert_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id BIGINT NOT NULL REFERENCES schools(id) UNIQUE,
  
  -- Threshold settings (percentage)
  overall_threshold NUMERIC(5,2) DEFAULT 80.00,
  student_contact_threshold NUMERIC(5,2) DEFAULT 90.00,
  student_parent_threshold NUMERIC(5,2) DEFAULT 90.00,
  teacher_email_threshold NUMERIC(5,2) DEFAULT 95.00,
  class_coverage_threshold NUMERIC(5,2) DEFAULT 95.00,
  
  -- Notification preferences
  alert_enabled BOOLEAN DEFAULT true,
  weekly_summary_enabled BOOLEAN DEFAULT true,
  weekly_summary_day INTEGER DEFAULT 1,
  alert_email_recipients TEXT[],
  
  -- Cooldown to prevent spam (hours)
  alert_cooldown_hours INTEGER DEFAULT 24,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ic_data_quality_alert_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School admins can manage their alert config"
  ON ic_data_quality_alert_config FOR ALL
  USING (can_manage_school_data(school_id));

CREATE POLICY "System admins can manage all alert configs"
  ON ic_data_quality_alert_config FOR ALL
  USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Create alert history table
CREATE TABLE ic_data_quality_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id BIGINT NOT NULL REFERENCES schools(id),
  
  -- Alert details
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  
  -- Data quality snapshot at time of alert
  overall_completeness_score NUMERIC(5,2),
  data_quality_grade TEXT,
  
  -- Specific issues detected
  issues_detected JSONB,
  
  -- Notification tracking
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  recipients TEXT[],
  
  -- Acknowledgment tracking
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledgment_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_school_created ON ic_data_quality_alerts(school_id, created_at DESC);
CREATE INDEX idx_alerts_acknowledged ON ic_data_quality_alerts(acknowledged, school_id);

ALTER TABLE ic_data_quality_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School staff can view their alerts"
  ON ic_data_quality_alerts FOR SELECT
  USING (can_view_school_data(school_id));

CREATE POLICY "School admins can acknowledge alerts"
  ON ic_data_quality_alerts FOR UPDATE
  USING (can_manage_school_data(school_id));

CREATE POLICY "Service role can insert alerts"
  ON ic_data_quality_alerts FOR INSERT
  WITH CHECK (true);

-- Create weekly summary tracking table
CREATE TABLE ic_data_quality_weekly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id BIGINT NOT NULL REFERENCES schools(id),
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  
  -- Summary metrics
  avg_completeness_score NUMERIC(5,2),
  min_completeness_score NUMERIC(5,2),
  max_completeness_score NUMERIC(5,2),
  
  -- Trend analysis
  score_change_from_previous_week NUMERIC(5,2),
  total_alerts_triggered INTEGER DEFAULT 0,
  
  -- Top issues over the week
  top_issues JSONB,
  
  -- Notification tracking
  sent_at TIMESTAMPTZ,
  recipients TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(school_id, week_start_date)
);

ALTER TABLE ic_data_quality_weekly_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School staff can view their summaries"
  ON ic_data_quality_weekly_summaries FOR SELECT
  USING (can_view_school_data(school_id));

CREATE POLICY "Service role can insert summaries"
  ON ic_data_quality_weekly_summaries FOR INSERT
  WITH CHECK (true);

-- Helper function to check if alert should fire
CREATE OR REPLACE FUNCTION should_trigger_data_quality_alert(
  p_school_id BIGINT,
  p_current_score NUMERIC
) RETURNS BOOLEAN
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_config RECORD;
  v_last_alert TIMESTAMPTZ;
  v_cooldown_expired BOOLEAN;
BEGIN
  -- Get alert configuration
  SELECT * INTO v_config
  FROM ic_data_quality_alert_config
  WHERE school_id = p_school_id;
  
  -- No config or alerts disabled
  IF v_config IS NULL OR NOT v_config.alert_enabled THEN
    RETURN FALSE;
  END IF;
  
  -- Check if score is below threshold
  IF p_current_score >= v_config.overall_threshold THEN
    RETURN FALSE;
  END IF;
  
  -- Check cooldown period
  SELECT MAX(created_at) INTO v_last_alert
  FROM ic_data_quality_alerts
  WHERE school_id = p_school_id
    AND alert_type = 'threshold_breach';
  
  v_cooldown_expired := (
    v_last_alert IS NULL OR
    v_last_alert < NOW() - (v_config.alert_cooldown_hours || ' hours')::INTERVAL
  );
  
  RETURN v_cooldown_expired;
END;
$$;

-- Add scheduler secret if not exists
INSERT INTO app_secrets (key, value)
VALUES ('DATA_QUALITY_ALERT_SECRET', encode(gen_random_bytes(32), 'base64'))
ON CONFLICT (key) DO NOTHING;

-- Schedule data quality alert check (runs every 6 hours)
SELECT cron.schedule(
  'check-data-quality-alerts',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lwbmtirzntexaxdlhgsk.supabase.co/functions/v1/check-data-quality-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || get_app_secret('DATA_QUALITY_ALERT_SECRET')
    ),
    body := jsonb_build_object('time', now()::text, 'source', 'pg_cron')
  ) as request_id;
  $$
);

-- Schedule weekly summary (runs daily at 7 AM)
SELECT cron.schedule(
  'send-weekly-data-quality-summaries',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lwbmtirzntexaxdlhgsk.supabase.co/functions/v1/send-weekly-data-quality-summary',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || get_app_secret('DATA_QUALITY_ALERT_SECRET')
    ),
    body := jsonb_build_object('time', now()::text, 'source', 'pg_cron')
  ) as request_id;
  $$
);