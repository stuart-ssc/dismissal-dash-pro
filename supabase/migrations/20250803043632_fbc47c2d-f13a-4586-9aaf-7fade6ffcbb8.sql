-- Insert the missing user role for the existing user
INSERT INTO user_roles (user_id, role) 
VALUES ('bcbce85c-42da-4e4d-b512-b8548eea7a94', 'school_admin')
ON CONFLICT (user_id, role) DO NOTHING;