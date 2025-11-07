-- Fix remaining functions missing search_path
-- This prevents SQL injection attacks via search_path manipulation

-- Fix check_suspicious_school function
CREATE OR REPLACE FUNCTION public.check_suspicious_school(school_name text, email text, ip_address text)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  flags TEXT[] := '{}';
BEGIN
  -- Check for suspicious name patterns
  IF school_name ~* '(test|fake|asdf|qwerty|xxx|dummy)' THEN
    flags := array_append(flags, 'suspicious_name');
  END IF;
  
  -- Check if same IP created multiple schools today
  IF (SELECT COUNT(*) FROM school_creation_logs 
      WHERE created_by_ip = ip_address 
      AND created_at > NOW() - INTERVAL '24 hours') > 2 THEN
    flags := array_append(flags, 'multiple_from_ip');
  END IF;
  
  -- Check if email domain is suspicious (not .edu, not common providers)
  IF email !~* '\.edu$' AND email !~* '@(gmail|outlook|yahoo|hotmail|icloud|proton)' THEN
    flags := array_append(flags, 'suspicious_email_domain');
  END IF;
  
  RETURN flags;
END;
$function$;

-- Fix is_student_absent function
CREATE OR REPLACE FUNCTION public.is_student_absent(p_student_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.student_absences
    WHERE student_id = p_student_id
      AND returned_at IS NULL
      AND (
        (absence_type = 'single_date' AND start_date = p_date) OR
        (absence_type = 'date_range' AND p_date >= start_date AND p_date <= end_date)
      )
  );
END;
$function$;

-- Add audit comments
COMMENT ON FUNCTION public.check_suspicious_school IS 'Security definer function with search_path set to prevent SQL injection. Checks for suspicious school creation patterns.';
COMMENT ON FUNCTION public.is_student_absent IS 'Security definer function with search_path set to prevent SQL injection. Checks if student is marked absent for a given date.';