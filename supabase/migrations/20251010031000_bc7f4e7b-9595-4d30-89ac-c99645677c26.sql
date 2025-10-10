-- Update the handle_new_user trigger to notify when first user signs up for a school
-- This replaces the existing function to add notification functionality

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id bigint;
BEGIN
  -- Extract school_id from metadata
  v_school_id := (NEW.raw_user_meta_data ->> 'school_id')::bigint;
  
  -- Insert into profiles table
  INSERT INTO public.profiles (id, first_name, last_name, email, school_id)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'first_name', 
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email,
    v_school_id
  );
  
  -- If school_id exists, notify the edge function asynchronously
  -- This will check if it's the first user and send email if needed
  IF v_school_id IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://lwbmtirzntexaxdlhgsk.supabase.co/functions/v1/notify-first-school-user',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'user_id', NEW.id,
        'first_name', NEW.raw_user_meta_data ->> 'first_name',
        'last_name', NEW.raw_user_meta_data ->> 'last_name',
        'email', NEW.email,
        'school_id', v_school_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;