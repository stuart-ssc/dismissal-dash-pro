-- Update dan@test.co's role from system_admin to school_admin
UPDATE public.user_roles 
SET role = 'school_admin'::app_role 
WHERE user_id = '4553661d-3de1-40d9-8dcf-8e904dc9a69a' 
  AND role = 'system_admin'::app_role;