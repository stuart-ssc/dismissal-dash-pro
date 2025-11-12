-- Add constraint to ensure runs and their groups belong to the same academic session
-- First, add a trigger function to validate academic session consistency
CREATE OR REPLACE FUNCTION public.validate_special_use_run_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  group_session_id uuid;
BEGIN
  -- Get the group's academic session
  SELECT academic_session_id INTO group_session_id
  FROM special_use_groups
  WHERE id = NEW.group_id;
  
  -- Check if the run's session matches the group's session
  IF NEW.academic_session_id IS NOT NULL AND 
     group_session_id IS NOT NULL AND 
     NEW.academic_session_id != group_session_id THEN
    RAISE EXCEPTION 'Special use run academic session (%) must match the group academic session (%)', 
      NEW.academic_session_id, group_session_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to validate on insert and update
DROP TRIGGER IF EXISTS validate_special_use_run_session_trigger ON public.special_use_runs;
CREATE TRIGGER validate_special_use_run_session_trigger
  BEFORE INSERT OR UPDATE ON public.special_use_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_special_use_run_session();