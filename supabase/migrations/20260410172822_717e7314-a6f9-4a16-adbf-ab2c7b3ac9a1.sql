-- Allow authenticated users to insert their own school associations
CREATE POLICY "Users can insert their own school associations"
ON public.user_schools
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fix Stuart's profile school_id
UPDATE public.profiles
SET school_id = 103090
WHERE id = 'd169d58c-0a40-41dc-ad7e-8a1a31f6b22f' AND school_id IS NULL;

-- Create missing user_schools entry
INSERT INTO public.user_schools (user_id, school_id, is_primary)
VALUES ('d169d58c-0a40-41dc-ad7e-8a1a31f6b22f', 103090, true)
ON CONFLICT (user_id, school_id) DO NOTHING;