-- Sync teachers from profiles/user_roles to teachers table
-- This fixes the issue where teachers exist in profiles but not in teachers table
INSERT INTO teachers (
  id, 
  first_name, 
  last_name, 
  email, 
  school_id, 
  account_completed_at, 
  invitation_status,
  auth_provider
)
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.email,
  p.school_id,
  COALESCE(p.created_at, now()),
  'completed',
  COALESCE(p.auth_provider, 'email')
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id
WHERE ur.role = 'teacher'
  AND NOT EXISTS (
    SELECT 1 FROM teachers t WHERE t.id = p.id
  );