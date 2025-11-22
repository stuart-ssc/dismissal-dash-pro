-- Enable RLS on backup tables created by district state mismatch fix migration
-- These tables are temporary and only accessible to system admins

ALTER TABLE districts_backup_pre_split ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools_backup_pre_split ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_districts_backup_pre_split ENABLE ROW LEVEL SECURITY;

-- Create restrictive policies (only system admins can access backup tables)
CREATE POLICY "System admins only" ON districts_backup_pre_split
  FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "System admins only" ON schools_backup_pre_split
  FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "System admins only" ON user_districts_backup_pre_split
  FOR ALL USING (has_role(auth.uid(), 'system_admin'::app_role));