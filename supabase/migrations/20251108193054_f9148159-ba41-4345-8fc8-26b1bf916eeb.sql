-- Create Special Use Runs Feature Tables

-- 1. Special Use Groups (Core group management)
CREATE TABLE public.special_use_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  group_type TEXT NOT NULL CHECK (group_type IN ('field_trip', 'athletics', 'club', 'other')),
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Group membership
CREATE TABLE public.special_use_group_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.special_use_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES public.profiles(id),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE(group_id, student_id)
);

-- 3. Scheduled runs
CREATE TABLE public.special_use_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.special_use_groups(id) ON DELETE CASCADE,
  run_name TEXT NOT NULL,
  run_date DATE NOT NULL,
  scheduled_departure_time TIME,
  scheduled_return_time TIME,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'outbound_active', 'at_destination', 'return_active', 'completed', 'cancelled')),
  outbound_started_at TIMESTAMPTZ,
  outbound_started_by UUID REFERENCES public.profiles(id),
  outbound_completed_at TIMESTAMPTZ,
  outbound_completed_by UUID REFERENCES public.profiles(id),
  return_started_at TIMESTAMPTZ,
  return_started_by UUID REFERENCES public.profiles(id),
  return_completed_at TIMESTAMPTZ,
  return_completed_by UUID REFERENCES public.profiles(id),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- 4. Bus assignments per run
CREATE TABLE public.special_use_run_buses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.special_use_runs(id) ON DELETE CASCADE,
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  capacity INTEGER,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(run_id, bus_id)
);

-- 5. Manager assignments per run
CREATE TABLE public.special_use_run_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.special_use_runs(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES public.profiles(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(run_id, manager_id)
);

-- 6. Student tracking events (outbound & return)
CREATE TABLE public.special_use_student_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.special_use_runs(id) ON DELETE CASCADE,
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('outbound_checkin', 'return_checkin', 'left_with_parent')),
  event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by UUID NOT NULL REFERENCES public.profiles(id),
  parent_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Permanent group managers
CREATE TABLE public.special_use_group_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.special_use_groups(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES public.profiles(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, manager_id)
);

-- Enable RLS on all tables
ALTER TABLE public.special_use_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_use_group_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_use_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_use_run_buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_use_run_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_use_student_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_use_group_managers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for special_use_groups
CREATE POLICY "System admins can manage all groups"
  ON public.special_use_groups FOR ALL
  USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "School admins can manage their school groups"
  ON public.special_use_groups FOR ALL
  USING (can_view_school_data(school_id))
  WITH CHECK (can_manage_school_data(school_id));

CREATE POLICY "Group managers can view their groups"
  ON public.special_use_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.special_use_group_managers 
      WHERE group_id = special_use_groups.id AND manager_id = auth.uid()
    )
  );

-- RLS Policies for special_use_group_students
CREATE POLICY "System admins can manage all group students"
  ON public.special_use_group_students FOR ALL
  USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "School admins can manage their school group students"
  ON public.special_use_group_students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.special_use_groups g
      WHERE g.id = special_use_group_students.group_id AND can_view_school_data(g.school_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.special_use_groups g
      WHERE g.id = special_use_group_students.group_id AND can_manage_school_data(g.school_id)
    )
  );

CREATE POLICY "Group managers can manage their group students"
  ON public.special_use_group_students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.special_use_group_managers
      WHERE group_id = special_use_group_students.group_id AND manager_id = auth.uid()
    )
  );

-- RLS Policies for special_use_runs
CREATE POLICY "System admins can manage all runs"
  ON public.special_use_runs FOR ALL
  USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "School admins can manage their school runs"
  ON public.special_use_runs FOR ALL
  USING (can_view_school_data(school_id))
  WITH CHECK (can_manage_school_data(school_id));

CREATE POLICY "Run managers can view their runs"
  ON public.special_use_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.special_use_run_managers
      WHERE run_id = special_use_runs.id AND manager_id = auth.uid()
    )
  );

CREATE POLICY "Run managers can update their runs"
  ON public.special_use_runs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.special_use_run_managers
      WHERE run_id = special_use_runs.id AND manager_id = auth.uid()
    )
  );

-- RLS Policies for special_use_run_buses
CREATE POLICY "System admins can manage all run buses"
  ON public.special_use_run_buses FOR ALL
  USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "School admins can manage their school run buses"
  ON public.special_use_run_buses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.special_use_runs r
      WHERE r.id = special_use_run_buses.run_id AND can_view_school_data(r.school_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.special_use_runs r
      WHERE r.id = special_use_run_buses.run_id AND can_manage_school_data(r.school_id)
    )
  );

CREATE POLICY "Run managers can view their run buses"
  ON public.special_use_run_buses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.special_use_run_managers
      WHERE run_id = special_use_run_buses.run_id AND manager_id = auth.uid()
    )
  );

-- RLS Policies for special_use_run_managers
CREATE POLICY "System admins can manage all run managers"
  ON public.special_use_run_managers FOR ALL
  USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "School admins can manage their school run managers"
  ON public.special_use_run_managers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.special_use_runs r
      WHERE r.id = special_use_run_managers.run_id AND can_view_school_data(r.school_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.special_use_runs r
      WHERE r.id = special_use_run_managers.run_id AND can_manage_school_data(r.school_id)
    )
  );

CREATE POLICY "Run managers can view other managers"
  ON public.special_use_run_managers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.special_use_run_managers m
      WHERE m.run_id = special_use_run_managers.run_id AND m.manager_id = auth.uid()
    )
  );

-- RLS Policies for special_use_student_events
CREATE POLICY "System admins can manage all student events"
  ON public.special_use_student_events FOR ALL
  USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "School admins can view their school student events"
  ON public.special_use_student_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.special_use_runs r
      WHERE r.id = special_use_student_events.run_id AND can_view_school_data(r.school_id)
    )
  );

CREATE POLICY "Run managers can manage student events"
  ON public.special_use_student_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.special_use_run_managers
      WHERE run_id = special_use_student_events.run_id AND manager_id = auth.uid()
    )
  );

-- RLS Policies for special_use_group_managers
CREATE POLICY "System admins can manage all group managers"
  ON public.special_use_group_managers FOR ALL
  USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "School admins can manage their school group managers"
  ON public.special_use_group_managers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.special_use_groups g
      WHERE g.id = special_use_group_managers.group_id AND can_view_school_data(g.school_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.special_use_groups g
      WHERE g.id = special_use_group_managers.group_id AND can_manage_school_data(g.school_id)
    )
  );

CREATE POLICY "Group managers can view other managers"
  ON public.special_use_group_managers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.special_use_group_managers m
      WHERE m.group_id = special_use_group_managers.group_id AND m.manager_id = auth.uid()
    )
  );

-- Helper function: Check if user can manage a specific run
CREATE OR REPLACE FUNCTION public.can_manage_special_use_run(p_run_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    has_role(auth.uid(), 'system_admin'::app_role) OR
    (has_role(auth.uid(), 'school_admin'::app_role) AND EXISTS(
      SELECT 1 FROM special_use_runs WHERE id = p_run_id AND can_manage_school_data(school_id)
    )) OR
    EXISTS(
      SELECT 1 FROM special_use_run_managers WHERE run_id = p_run_id AND manager_id = auth.uid()
    )
  );
END;
$$;

-- Helper function: Get students for a specific bus on a run
CREATE OR REPLACE FUNCTION public.get_special_use_run_students(p_run_id UUID, p_bus_id UUID)
RETURNS TABLE (
  student_id UUID,
  first_name TEXT,
  last_name TEXT,
  grade_level TEXT,
  student_number TEXT,
  outbound_checked BOOLEAN,
  outbound_time TIMESTAMPTZ,
  return_checked BOOLEAN,
  return_time TIMESTAMPTZ,
  left_with_parent BOOLEAN,
  parent_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id AS student_id,
    s.first_name,
    s.last_name,
    s.grade_level,
    s.student_id AS student_number,
    EXISTS(SELECT 1 FROM special_use_student_events WHERE student_id = s.id AND run_id = p_run_id AND event_type = 'outbound_checkin') AS outbound_checked,
    (SELECT event_time FROM special_use_student_events WHERE student_id = s.id AND run_id = p_run_id AND event_type = 'outbound_checkin' ORDER BY event_time DESC LIMIT 1) AS outbound_time,
    EXISTS(SELECT 1 FROM special_use_student_events WHERE student_id = s.id AND run_id = p_run_id AND event_type = 'return_checkin') AS return_checked,
    (SELECT event_time FROM special_use_student_events WHERE student_id = s.id AND run_id = p_run_id AND event_type = 'return_checkin' ORDER BY event_time DESC LIMIT 1) AS return_time,
    EXISTS(SELECT 1 FROM special_use_student_events WHERE student_id = s.id AND run_id = p_run_id AND event_type = 'left_with_parent') AS left_with_parent,
    (SELECT parent_name FROM special_use_student_events WHERE student_id = s.id AND run_id = p_run_id AND event_type = 'left_with_parent' ORDER BY event_time DESC LIMIT 1) AS parent_name
  FROM students s
  JOIN special_use_group_students sgs ON sgs.student_id = s.id
  JOIN special_use_runs sur ON sur.group_id = sgs.group_id
  WHERE sur.id = p_run_id
    AND NOT is_student_absent(s.id, sur.run_date)
  ORDER BY s.last_name, s.first_name;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_special_use_groups_updated_at
  BEFORE UPDATE ON public.special_use_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_special_use_runs_updated_at
  BEFORE UPDATE ON public.special_use_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();