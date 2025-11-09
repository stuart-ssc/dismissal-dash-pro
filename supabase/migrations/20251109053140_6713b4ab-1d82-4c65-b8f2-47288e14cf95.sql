-- Phase 0: Infinite Campus Integration - Foundational Schema

-- ============================================================================
-- 1. MULTI-SCHOOL SUPPORT
-- ============================================================================

-- Create user_schools junction table for multi-school teacher support
CREATE TABLE IF NOT EXISTS public.user_schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id bigint NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, school_id)
);

CREATE INDEX idx_user_schools_user_id ON public.user_schools(user_id);
CREATE INDEX idx_user_schools_school_id ON public.user_schools(school_id);

-- Enable RLS on user_schools
ALTER TABLE public.user_schools ENABLE ROW LEVEL SECURITY;

-- Migrate existing profiles.school_id to user_schools
INSERT INTO public.user_schools (user_id, school_id, is_primary)
SELECT id, school_id, true
FROM public.profiles
WHERE school_id IS NOT NULL
ON CONFLICT (user_id, school_id) DO NOTHING;

-- Add migration tracking column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS multi_school_migrated boolean DEFAULT false;
UPDATE public.profiles SET multi_school_migrated = true WHERE school_id IS NOT NULL;

-- Helper function: Get all school IDs for a user
CREATE OR REPLACE FUNCTION public.get_user_school_ids(user_uuid uuid)
RETURNS bigint[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT ARRAY_AGG(school_id) 
  FROM user_schools 
  WHERE user_id = user_uuid;
$$;

-- Helper function: Get primary school for a user
CREATE OR REPLACE FUNCTION public.get_primary_school_id(user_uuid uuid)
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT school_id 
  FROM user_schools 
  WHERE user_id = user_uuid AND is_primary = true
  LIMIT 1;
$$;

-- Update can_view_school_data to support multi-school
CREATE OR REPLACE FUNCTION public.can_view_school_data(target_school_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    has_role(auth.uid(), 'system_admin'::app_role) AND (
      get_impersonated_school_id() = target_school_id OR
      get_impersonated_school_id() IS NULL
    )
    OR
    EXISTS (
      SELECT 1 FROM user_schools 
      WHERE user_id = auth.uid() AND school_id = target_school_id
    );
$$;

-- RLS Policies for user_schools
CREATE POLICY "Users can view their own school associations"
ON public.user_schools FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "School admins can view their school associations"
ON public.user_schools FOR SELECT
USING (can_view_school_data(school_id));

CREATE POLICY "System admins can manage all school associations"
ON public.user_schools FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- ============================================================================
-- 2. ACADEMIC SESSIONS (SCHOOL YEARS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.academic_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id bigint NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  session_name text NOT NULL,
  session_code text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean DEFAULT false,
  ic_external_id text,
  session_type text DEFAULT 'schoolYear',
  parent_session_id uuid REFERENCES public.academic_sessions(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(school_id, session_code)
);

CREATE INDEX idx_academic_sessions_school ON public.academic_sessions(school_id);
CREATE INDEX idx_academic_sessions_active ON public.academic_sessions(school_id, is_active) WHERE is_active = true;
CREATE INDEX idx_academic_sessions_ic ON public.academic_sessions(ic_external_id) WHERE ic_external_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.academic_sessions ENABLE ROW LEVEL SECURITY;

-- Add academic_session_id to relevant tables
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS academic_session_id uuid REFERENCES public.academic_sessions(id);
CREATE INDEX IF NOT EXISTS idx_students_session ON public.students(academic_session_id);

ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS academic_session_id uuid REFERENCES public.academic_sessions(id);
CREATE INDEX IF NOT EXISTS idx_classes_session ON public.classes(academic_session_id);

ALTER TABLE public.class_rosters ADD COLUMN IF NOT EXISTS academic_session_id uuid REFERENCES public.academic_sessions(id);
CREATE INDEX IF NOT EXISTS idx_class_rosters_session ON public.class_rosters(academic_session_id);

ALTER TABLE public.dismissal_runs ADD COLUMN IF NOT EXISTS academic_session_id uuid REFERENCES public.academic_sessions(id);
CREATE INDEX IF NOT EXISTS idx_dismissal_runs_session ON public.dismissal_runs(academic_session_id);

ALTER TABLE public.dismissal_plans ADD COLUMN IF NOT EXISTS academic_session_id uuid REFERENCES public.academic_sessions(id);
CREATE INDEX IF NOT EXISTS idx_dismissal_plans_session ON public.dismissal_plans(academic_session_id);

ALTER TABLE public.student_absences ADD COLUMN IF NOT EXISTS academic_session_id uuid REFERENCES public.academic_sessions(id);
CREATE INDEX IF NOT EXISTS idx_student_absences_session ON public.student_absences(academic_session_id);

-- RLS Policies for academic_sessions
CREATE POLICY "School admins can manage their school sessions"
ON public.academic_sessions FOR ALL
USING (can_manage_school_data(school_id))
WITH CHECK (can_manage_school_data(school_id));

CREATE POLICY "Teachers can view their school sessions"
ON public.academic_sessions FOR SELECT
USING (can_view_school_data(school_id));

CREATE POLICY "System admins can manage all sessions"
ON public.academic_sessions FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Trigger to ensure only one active session per school
CREATE OR REPLACE FUNCTION public.ensure_single_active_session()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.academic_sessions
    SET is_active = false
    WHERE school_id = NEW.school_id
      AND id != NEW.id
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ensure_single_active_session
BEFORE INSERT OR UPDATE ON public.academic_sessions
FOR EACH ROW
WHEN (NEW.is_active = true)
EXECUTE FUNCTION public.ensure_single_active_session();

-- ============================================================================
-- 3. ARCHIVE SUPPORT
-- ============================================================================

-- Add archive columns to students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES auth.users(id);
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS archived_reason text;
CREATE INDEX IF NOT EXISTS idx_students_archived ON public.students(school_id, archived);

-- Add archive columns to teachers
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES auth.users(id);
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS archived_reason text;
CREATE INDEX IF NOT EXISTS idx_teachers_archived ON public.teachers(school_id, archived);

-- ============================================================================
-- 4. INFINITE CAMPUS INTEGRATION TABLES
-- ============================================================================

-- Infinite Campus connections
CREATE TABLE IF NOT EXISTS public.infinite_campus_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id bigint NOT NULL UNIQUE REFERENCES public.schools(id) ON DELETE CASCADE,
  host_url text NOT NULL,
  client_key text NOT NULL,
  client_secret text NOT NULL,
  token_url text NOT NULL,
  oneroster_version text NOT NULL DEFAULT '1.1',
  status text NOT NULL DEFAULT 'active',
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  sync_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX idx_ic_connections_school ON public.infinite_campus_connections(school_id);
CREATE INDEX idx_ic_connections_status ON public.infinite_campus_connections(status);

ALTER TABLE public.infinite_campus_connections ENABLE ROW LEVEL SECURITY;

-- IC Sync logs
CREATE TABLE IF NOT EXISTS public.ic_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id bigint NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.infinite_campus_connections(id) ON DELETE CASCADE,
  sync_type text NOT NULL,
  status text NOT NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  triggered_by uuid REFERENCES auth.users(id),
  
  students_created integer DEFAULT 0,
  students_updated integer DEFAULT 0,
  students_archived integer DEFAULT 0,
  teachers_created integer DEFAULT 0,
  teachers_updated integer DEFAULT 0,
  teachers_archived integer DEFAULT 0,
  classes_created integer DEFAULT 0,
  classes_updated integer DEFAULT 0,
  classes_archived integer DEFAULT 0,
  enrollments_created integer DEFAULT 0,
  enrollments_updated integer DEFAULT 0,
  
  error_message text,
  error_details jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ic_sync_logs_school ON public.ic_sync_logs(school_id);
CREATE INDEX idx_ic_sync_logs_status ON public.ic_sync_logs(status);
CREATE INDEX idx_ic_sync_logs_started ON public.ic_sync_logs(started_at DESC);

ALTER TABLE public.ic_sync_logs ENABLE ROW LEVEL SECURITY;

-- IC Pending merges
CREATE TABLE IF NOT EXISTS public.ic_pending_merges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id bigint NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  sync_log_id uuid REFERENCES public.ic_sync_logs(id) ON DELETE CASCADE,
  
  ic_external_id text NOT NULL,
  ic_data jsonb NOT NULL,
  
  record_type text NOT NULL,
  existing_record_id uuid,
  match_confidence numeric(3,2),
  match_criteria text,
  
  status text NOT NULL DEFAULT 'pending',
  decision_made_at timestamptz,
  decision_made_by uuid REFERENCES auth.users(id),
  decision_notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ic_pending_merges_school ON public.ic_pending_merges(school_id);
CREATE INDEX idx_ic_pending_merges_status ON public.ic_pending_merges(status);
CREATE INDEX idx_ic_pending_merges_sync ON public.ic_pending_merges(sync_log_id);

ALTER TABLE public.ic_pending_merges ENABLE ROW LEVEL SECURITY;

-- IC external ID tracking
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS ic_external_id text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_ic_external_id ON public.students(ic_external_id) WHERE ic_external_id IS NOT NULL;

ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS ic_external_id text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_ic_external_id ON public.teachers(ic_external_id) WHERE ic_external_id IS NOT NULL;

ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS ic_external_id text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_classes_ic_external_id ON public.classes(ic_external_id) WHERE ic_external_id IS NOT NULL;

-- IC rate limiting
CREATE TABLE IF NOT EXISTS public.ic_sync_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id bigint NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  sync_date date NOT NULL,
  sync_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(school_id, sync_date)
);

CREATE INDEX idx_ic_sync_rate_limits_school_date ON public.ic_sync_rate_limits(school_id, sync_date);

ALTER TABLE public.ic_sync_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for IC tables
CREATE POLICY "School admins can manage IC connections"
ON public.infinite_campus_connections FOR ALL
USING (can_manage_school_data(school_id))
WITH CHECK (can_manage_school_data(school_id));

CREATE POLICY "System admins can manage all IC connections"
ON public.infinite_campus_connections FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "School admins can view IC sync logs"
ON public.ic_sync_logs FOR SELECT
USING (can_view_school_data(school_id));

CREATE POLICY "System admins can view all IC sync logs"
ON public.ic_sync_logs FOR SELECT
USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "School admins can manage IC pending merges"
ON public.ic_pending_merges FOR ALL
USING (can_view_school_data(school_id))
WITH CHECK (can_manage_school_data(school_id));

CREATE POLICY "System admins can manage all IC pending merges"
ON public.ic_pending_merges FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "School admins can view IC rate limits"
ON public.ic_sync_rate_limits FOR SELECT
USING (can_view_school_data(school_id));