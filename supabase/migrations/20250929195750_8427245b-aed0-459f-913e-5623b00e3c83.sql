-- Allow teachers to view dismissal runs for their own school
CREATE POLICY "dismissal_runs_teacher_select"
ON public.dismissal_runs
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.school_id = dismissal_runs.school_id
  )
);

-- Allow teachers to view dismissal plans for their own school
CREATE POLICY "dismissal_plans_teacher_select"
ON public.dismissal_plans
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.school_id = dismissal_plans.school_id
  )
);