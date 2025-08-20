-- Fix security warnings by setting proper search_path for functions

-- Fix the audit logging function
CREATE OR REPLACE FUNCTION public.log_student_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log any access to student records for security auditing
  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    action,
    user_id,
    timestamp,
    details
  ) VALUES (
    'students',
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    auth.uid(),
    now(),
    jsonb_build_object(
      'student_name', COALESCE(NEW.first_name || ' ' || NEW.last_name, OLD.first_name || ' ' || OLD.last_name),
      'school_id', COALESCE(NEW.school_id, OLD.school_id)
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Fix the safe view function
CREATE OR REPLACE FUNCTION public.get_student_safe_view(student_uuid uuid)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  grade_level text,
  school_id bigint,
  -- Sensitive data only for authorized users
  parent_guardian_name text,
  contact_info text,
  special_notes text
) AS $$
BEGIN
  -- Check if user can manage this specific student
  IF NOT can_manage_student(student_uuid) THEN
    -- Return limited data for teachers who can only view
    IF has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
      SELECT 1 
      FROM class_rosters cr
      JOIN class_teachers ct ON ct.class_id = cr.class_id
      WHERE cr.student_id = student_uuid 
        AND ct.teacher_id = auth.uid()
    ) THEN
      RETURN QUERY
      SELECT 
        s.id,
        s.first_name,
        s.last_name,
        s.grade_level,
        s.school_id,
        NULL::text as parent_guardian_name,  -- Masked for teachers
        NULL::text as contact_info,          -- Masked for teachers
        NULL::text as special_notes          -- Masked for teachers
      FROM students s 
      WHERE s.id = student_uuid;
    ELSE
      -- No access at all
      RETURN;
    END IF;
  ELSE
    -- Full access for admins
    RETURN QUERY
    SELECT 
      s.id,
      s.first_name,
      s.last_name,
      s.grade_level,
      s.school_id,
      s.parent_guardian_name,
      s.contact_info,
      s.special_notes
    FROM students s 
    WHERE s.id = student_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path TO 'public';