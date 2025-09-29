-- Fix existing teacher data inconsistency
-- Insert missing teacher records for users who have 'teacher' role but are not in teachers table
INSERT INTO public.teachers (id, email, first_name, last_name, school_id, invitation_status, account_completed_at)
SELECT 
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.school_id,
  'completed'::text,
  now()
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id
WHERE ur.role = 'teacher'::app_role
  AND p.id NOT IN (SELECT id FROM public.teachers)
  AND p.email IS NOT NULL
  AND p.first_name IS NOT NULL
  AND p.last_name IS NOT NULL
  AND p.school_id IS NOT NULL;