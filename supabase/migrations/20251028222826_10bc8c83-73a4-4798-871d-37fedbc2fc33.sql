-- Create security definer function to check if student belongs to user's school
-- This breaks the infinite recursion by not triggering RLS policies
create or replace function public.student_in_user_school(_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    where s.id = _student_id
      and s.school_id = get_user_school_id(auth.uid())
  )
$$;

-- Replace SELECT policies for student_bus_assignments
drop policy if exists student_bus_assignments_school_select on public.student_bus_assignments;
create policy student_bus_assignments_school_select
on public.student_bus_assignments
for select
to authenticated
using (
  has_role(auth.uid(), 'system_admin'::app_role)
  or student_in_user_school(student_id)
);

-- Replace SELECT policies for student_car_assignments
drop policy if exists student_car_assignments_school_select on public.student_car_assignments;
create policy student_car_assignments_school_select
on public.student_car_assignments
for select
to authenticated
using (
  has_role(auth.uid(), 'system_admin'::app_role)
  or student_in_user_school(student_id)
);

-- Replace SELECT policies for student_walker_assignments
drop policy if exists student_walker_assignments_school_select on public.student_walker_assignments;
create policy student_walker_assignments_school_select
on public.student_walker_assignments
for select
to authenticated
using (
  has_role(auth.uid(), 'system_admin'::app_role)
  or student_in_user_school(student_id)
);