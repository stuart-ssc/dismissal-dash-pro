-- 1. Create helper function for operational access (teachers, school admins, system admins)
CREATE OR REPLACE FUNCTION public.can_operate_school_data(target_school_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    has_role(auth.uid(), 'system_admin'::app_role) OR
    (has_role(auth.uid(), 'school_admin'::app_role) AND get_user_school_id(auth.uid()) = target_school_id) OR
    (has_role(auth.uid(), 'teacher'::app_role) AND get_user_school_id(auth.uid()) = target_school_id)
$$;

-- 2. Attach trigger for automatic status transitions on dismissal_runs
DROP TRIGGER IF EXISTS trigger_update_dismissal_run_status ON public.dismissal_runs;
CREATE TRIGGER trigger_update_dismissal_run_status
  BEFORE UPDATE ON public.dismissal_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_dismissal_run_status();

-- 3. Update RLS policies to allow teachers operational access

-- mode_sessions: Allow teachers to manage their own sessions
DROP POLICY IF EXISTS "mode_sessions_teacher_own" ON public.mode_sessions;
CREATE POLICY "mode_sessions_teacher_own"
ON public.mode_sessions
FOR ALL
TO authenticated
USING (user_id = auth.uid() AND can_view_school_data(school_id))
WITH CHECK (user_id = auth.uid() AND can_view_school_data(school_id));

-- bus_run_events: Allow operational users to manage
DROP POLICY IF EXISTS "bus_run_events_school_users" ON public.bus_run_events;
CREATE POLICY "bus_run_events_school_users"
ON public.bus_run_events
FOR ALL
TO authenticated
USING (can_view_school_data(school_id))
WITH CHECK (can_operate_school_data(school_id));

-- car_line_sessions: Allow operational users to manage
DROP POLICY IF EXISTS "car_line_sessions_school_users" ON public.car_line_sessions;
CREATE POLICY "car_line_sessions_school_users"
ON public.car_line_sessions
FOR ALL
TO authenticated
USING (can_view_school_data(school_id))
WITH CHECK (can_operate_school_data(school_id));

-- car_line_pickups: Allow operational users to manage
DROP POLICY IF EXISTS "car_line_pickups_school_users" ON public.car_line_pickups;
CREATE POLICY "car_line_pickups_school_users"
ON public.car_line_pickups
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM car_line_sessions cls
    WHERE cls.id = car_line_pickups.car_line_session_id 
    AND can_view_school_data(cls.school_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM car_line_sessions cls
    WHERE cls.id = car_line_pickups.car_line_session_id 
    AND can_operate_school_data(cls.school_id)
  )
);

-- walker_sessions: Allow operational users to manage
DROP POLICY IF EXISTS "walker_sessions_school_users" ON public.walker_sessions;
CREATE POLICY "walker_sessions_school_users"
ON public.walker_sessions
FOR ALL
TO authenticated
USING (can_view_school_data(school_id))
WITH CHECK (can_operate_school_data(school_id));

-- walker_pickups: Allow operational users to manage
DROP POLICY IF EXISTS "walker_pickups_school_users" ON public.walker_pickups;
CREATE POLICY "walker_pickups_school_users"
ON public.walker_pickups
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM walker_sessions ws
    WHERE ws.id = walker_pickups.walker_session_id 
    AND can_view_school_data(ws.school_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM walker_sessions ws
    WHERE ws.id = walker_pickups.walker_session_id 
    AND can_operate_school_data(ws.school_id)
  )
);

-- car_line_completions: Allow operational users to mark completions
DROP POLICY IF EXISTS "car_line_completions_school_users" ON public.car_line_completions;
CREATE POLICY "car_line_completions_school_users"
ON public.car_line_completions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM dismissal_runs dr
    WHERE dr.id = car_line_completions.dismissal_run_id 
    AND can_view_school_data(dr.school_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM dismissal_runs dr
    WHERE dr.id = car_line_completions.dismissal_run_id 
    AND can_operate_school_data(dr.school_id)
  )
);

-- walker_location_completions: Allow operational users to mark completions
DROP POLICY IF EXISTS "walker_location_completions_school_users" ON public.walker_location_completions;
CREATE POLICY "walker_location_completions_school_users"
ON public.walker_location_completions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM dismissal_runs dr
    WHERE dr.id = walker_location_completions.dismissal_run_id 
    AND can_view_school_data(dr.school_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM dismissal_runs dr
    WHERE dr.id = walker_location_completions.dismissal_run_id 
    AND can_operate_school_data(dr.school_id)
  )
);

COMMENT ON FUNCTION public.can_operate_school_data IS 'Returns true if user is system_admin, school_admin, or teacher for the given school';
COMMENT ON TRIGGER trigger_update_dismissal_run_status ON public.dismissal_runs IS 'Automatically transitions run status from scheduled->preparation->active based on time';