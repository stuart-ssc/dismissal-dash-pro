-- Add OAuth provider tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS auth_provider text DEFAULT 'email',
ADD COLUMN IF NOT EXISTS oauth_sub text,
ADD COLUMN IF NOT EXISTS needs_school_association boolean DEFAULT false;

-- Create index for OAuth lookups
CREATE INDEX IF NOT EXISTS idx_profiles_oauth_sub ON public.profiles(oauth_sub);

-- Add unique constraint for oauth_sub (only non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_oauth_sub_unique ON public.profiles(oauth_sub) WHERE oauth_sub IS NOT NULL;

-- Add OAuth metadata to teachers table
ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS auth_provider text DEFAULT 'email';

-- Update the handle_new_user trigger function to support OAuth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  provider TEXT;
  user_role TEXT;
  user_school_id BIGINT;
BEGIN
  -- Get provider info from auth metadata
  provider := COALESCE(
    NEW.raw_app_meta_data->>'provider',
    'email'
  );
  
  -- Get role and school_id from user metadata
  user_role := NEW.raw_user_meta_data->>'role';
  user_school_id := (NEW.raw_user_meta_data->>'schoolId')::BIGINT;
  
  -- Create profile for all new users
  INSERT INTO public.profiles (
    id, 
    email, 
    first_name, 
    last_name,
    school_id,
    auth_provider,
    oauth_sub,
    needs_school_association
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'last_name',
    user_school_id,
    provider,
    NEW.raw_user_meta_data->>'sub',
    CASE 
      WHEN provider IN ('google', 'azure') AND user_school_id IS NULL THEN true
      ELSE false
    END
  );
  
  -- Only create role for users with role metadata (email signups or OAuth with role)
  IF user_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role::app_role);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;