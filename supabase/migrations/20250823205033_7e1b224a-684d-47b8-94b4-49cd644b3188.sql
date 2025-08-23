-- Remove the insecure students_teacher_view as it duplicates data without proper RLS protection
-- The main students table already has proper RLS policies and should be used instead
DROP VIEW IF EXISTS public.students_teacher_view;