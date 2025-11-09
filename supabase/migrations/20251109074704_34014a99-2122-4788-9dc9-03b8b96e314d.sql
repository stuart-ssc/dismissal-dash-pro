-- Create IC Merge Audit Log table
CREATE TABLE ic_merge_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merge_id UUID NOT NULL,
  school_id BIGINT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approve', 'reject')),
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  auto_approved BOOLEAN NOT NULL DEFAULT FALSE,
  auto_approved_by_rule_id UUID REFERENCES ic_auto_merge_rules(id),
  notes TEXT,
  merge_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_ic_merge_audit_school_id ON ic_merge_audit_log(school_id);
CREATE INDEX idx_ic_merge_audit_decided_at ON ic_merge_audit_log(decided_at DESC);
CREATE INDEX idx_ic_merge_audit_decided_by ON ic_merge_audit_log(decided_by);
CREATE INDEX idx_ic_merge_audit_decision ON ic_merge_audit_log(decision);
CREATE INDEX idx_ic_merge_audit_auto_approved ON ic_merge_audit_log(auto_approved);

-- RLS Policies
ALTER TABLE ic_merge_audit_log ENABLE ROW LEVEL SECURITY;

-- School admins can view audit logs for their school
CREATE POLICY "School admins can view IC merge audit logs"
  ON ic_merge_audit_log FOR SELECT
  USING (can_view_school_data(school_id));

-- System admins can view all audit logs
CREATE POLICY "System admins can view all IC merge audit logs"
  ON ic_merge_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Only service role can insert audit logs (via edge functions)
CREATE POLICY "Service role can insert audit logs"
  ON ic_merge_audit_log FOR INSERT
  WITH CHECK (true);