-- Add verification status and audit fields to schools table
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified', 'flagged', 'deactivated')),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS created_at_ip TEXT,
ADD COLUMN IF NOT EXISTS flagged_reason TEXT,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES profiles(id);

-- Create school_creation_logs audit table
CREATE TABLE IF NOT EXISTS school_creation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
  created_by_email TEXT NOT NULL,
  created_by_ip TEXT,
  user_agent TEXT,
  school_data JSONB NOT NULL,
  flagged BOOLEAN DEFAULT false,
  flag_reasons TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE school_creation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: System admins can view all logs
CREATE POLICY "system_admins_full_access" ON school_creation_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'system_admin'
    )
  );

-- RLS Policy: School admins can view logs for their school
CREATE POLICY "school_admins_view_own_logs" ON school_creation_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.school_id = school_creation_logs.school_id
    )
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'school_admin'
    )
  );

-- Create auto-flagging function
CREATE OR REPLACE FUNCTION check_suspicious_school(
  school_name TEXT,
  email TEXT,
  ip_address TEXT
) RETURNS TEXT[] AS $$
DECLARE
  flags TEXT[] := '{}';
BEGIN
  -- Check for suspicious name patterns
  IF school_name ~* '(test|fake|asdf|qwerty|xxx|dummy)' THEN
    flags := array_append(flags, 'suspicious_name');
  END IF;
  
  -- Check if same IP created multiple schools today
  IF (SELECT COUNT(*) FROM school_creation_logs 
      WHERE created_by_ip = ip_address 
      AND created_at > NOW() - INTERVAL '24 hours') > 2 THEN
    flags := array_append(flags, 'multiple_from_ip');
  END IF;
  
  -- Check if email domain is suspicious (not .edu, not common providers)
  IF email !~* '\.edu$' AND email !~* '@(gmail|outlook|yahoo|hotmail|icloud|proton)' THEN
    flags := array_append(flags, 'suspicious_email_domain');
  END IF;
  
  RETURN flags;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policy: Prevent signup with deactivated schools
DROP POLICY IF EXISTS "prevent_signup_deactivated_schools" ON profiles;
CREATE POLICY "prevent_signup_deactivated_schools" ON profiles
  FOR INSERT WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM schools 
      WHERE id = school_id 
      AND verification_status = 'deactivated'
    )
  );