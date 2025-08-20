-- Fix critical bug in teacher policy and consolidate student RLS policies for better security

-- First, drop all existing conflicting policies
DROP POLICY IF EXISTS "System and school admins can view students" ON public.students;
DROP POLICY IF EXISTS "Teachers can view their assigned students" ON public.students;
DROP POLICY IF EXISTS "Users can manage students for their school" ON public.students;
DROP POLICY IF EXISTS "students_school_admin" ON public.students;
DROP POLICY IF EXISTS "students_system_admin" ON public.students;

-- Create consolidated, secure policies with proper access control

-- 1. System admins have full access (most privileged)
CREATE POLICY "students_system_admin_access" 
ON public.students 
FOR ALL 
TO authenticated 
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- 2. School admins can manage students in their school only
CREATE POLICY "students_school_admin_access" 
ON public.students 
FOR ALL 
TO authenticated 
USING (
  has_role(auth.uid(), 'school_admin'::app_role) AND 
  can_view_school_data(school_id)
)
WITH CHECK (
  has_role(auth.uid(), 'school_admin'::app_role) AND 
  can_manage_school_data(school_id)
);

-- 3. Teachers can only view students in their assigned classes (READ ONLY)
CREATE POLICY "students_teacher_view_assigned" 
ON public.students 
FOR SELECT 
TO authenticated 
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND 
  EXISTS (
    SELECT 1 
    FROM class_rosters cr
    JOIN class_teachers ct ON ct.class_id = cr.class_id
    WHERE cr.student_id = students.id 
      AND ct.teacher_id = auth.uid()
  )
);

-- Create audit logging function for student data access
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only system admins can view audit logs
CREATE POLICY "audit_logs_system_admin_only" 
ON public.audit_logs 
FOR ALL 
TO authenticated 
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Create trigger for student access logging
DROP TRIGGER IF EXISTS student_access_audit_trigger ON public.students;
CREATE TRIGGER student_access_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.log_student_access();

-- Add additional security: function to mask sensitive student data for non-authorized users
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;