-- Add missing foreign key constraints to enable proper table relationships

-- Fix audit_logs foreign key (currently points to auth.users, should be profiles)
ALTER TABLE audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

ALTER TABLE audit_logs
ADD CONSTRAINT audit_logs_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

-- Add missing mode_sessions foreign keys
ALTER TABLE mode_sessions
ADD CONSTRAINT mode_sessions_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

ALTER TABLE mode_sessions
ADD CONSTRAINT mode_sessions_school_id_fkey 
FOREIGN KEY (school_id) 
REFERENCES schools(id) 
ON DELETE CASCADE;

-- Add missing student_absences foreign keys
ALTER TABLE student_absences
ADD CONSTRAINT student_absences_marked_by_fkey 
FOREIGN KEY (marked_by) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

ALTER TABLE student_absences
ADD CONSTRAINT student_absences_returned_by_fkey 
FOREIGN KEY (returned_by) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

-- Add missing dismissal_runs foreign keys
ALTER TABLE dismissal_runs
ADD CONSTRAINT dismissal_runs_school_id_fkey 
FOREIGN KEY (school_id) 
REFERENCES schools(id) 
ON DELETE CASCADE;

ALTER TABLE dismissal_runs
ADD CONSTRAINT dismissal_runs_started_by_fkey 
FOREIGN KEY (started_by) 
REFERENCES profiles(id) 
ON DELETE SET NULL;