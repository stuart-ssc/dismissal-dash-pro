-- Allow teachers to view dismissal group car line assignments for their school
CREATE POLICY "Teachers can view dismissal group car lines"
ON dismissal_group_car_lines
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND
  EXISTS (
    SELECT 1
    FROM dismissal_groups dg
    INNER JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id
    INNER JOIN profiles p ON p.school_id = dp.school_id
    WHERE dg.id = dismissal_group_car_lines.dismissal_group_id
      AND p.id = auth.uid()
  )
);

-- Allow teachers to view dismissal group bus assignments for their school
CREATE POLICY "Teachers can view dismissal group buses"
ON dismissal_group_buses
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND
  EXISTS (
    SELECT 1
    FROM dismissal_groups dg
    INNER JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id
    INNER JOIN profiles p ON p.school_id = dp.school_id
    WHERE dg.id = dismissal_group_buses.dismissal_group_id
      AND p.id = auth.uid()
  )
);

-- Allow teachers to view dismissal group activity assignments for their school
CREATE POLICY "Teachers can view dismissal group activities"
ON dismissal_group_activities
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND
  EXISTS (
    SELECT 1
    FROM dismissal_groups dg
    INNER JOIN dismissal_plans dp ON dp.id = dg.dismissal_plan_id
    INNER JOIN profiles p ON p.school_id = dp.school_id
    WHERE dg.id = dismissal_group_activities.dismissal_group_id
      AND p.id = auth.uid()
  )
);