-- Create index on profiles.school_id to optimize joins
CREATE INDEX IF NOT EXISTS idx_profiles_school_id 
ON public.profiles(school_id) 
WHERE school_id IS NOT NULL;

-- This index will significantly speed up queries that join user_roles with profiles
-- by school_id, especially for finding schools with admins