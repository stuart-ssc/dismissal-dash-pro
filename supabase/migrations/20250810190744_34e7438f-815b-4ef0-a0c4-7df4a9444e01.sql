
-- 1) Daily dismissal run per school
create table if not exists public.dismissal_runs (
  id uuid primary key default gen_random_uuid(),
  school_id bigint not null,
  plan_id uuid,
  "date" date not null default current_date,
  started_by uuid not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dismissal_runs enable row level security;

create policy "School users can manage dismissal_runs"
  on public.dismissal_runs
  as permissive
  for all
  using (get_user_school_id(auth.uid()) = school_id)
  with check (get_user_school_id(auth.uid()) = school_id);

create index if not exists idx_dismissal_runs_school_date
  on public.dismissal_runs (school_id, "date");

create trigger set_updated_at_dismissal_runs
  before update on public.dismissal_runs
  for each row
  execute procedure public.update_updated_at_column();

-- 2) Groups announced for classroom display (live)
create table if not exists public.dismissal_run_groups (
  id uuid primary key default gen_random_uuid(),
  dismissal_run_id uuid not null references public.dismissal_runs(id) on delete cascade,
  dismissal_group_id uuid not null,
  activated_at timestamptz not null default now(),
  deactivated_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

alter table public.dismissal_run_groups enable row level security;

create policy "School users can manage dismissal_run_groups"
  on public.dismissal_run_groups
  as permissive
  for all
  using (
    exists (
      select 1
      from public.dismissal_runs dr
      where dr.id = dismissal_run_groups.dismissal_run_id
        and get_user_school_id(auth.uid()) = dr.school_id
    )
  )
  with check (
    exists (
      select 1
      from public.dismissal_runs dr
      where dr.id = dismissal_run_groups.dismissal_run_id
        and get_user_school_id(auth.uid()) = dr.school_id
    )
  );

create index if not exists idx_drg_run_active
  on public.dismissal_run_groups (dismissal_run_id, activated_at)
  where deactivated_at is null;

-- 3) Bus presence/order + departures for a run
create table if not exists public.bus_run_events (
  id uuid primary key default gen_random_uuid(),
  school_id bigint not null,
  dismissal_run_id uuid not null references public.dismissal_runs(id) on delete cascade,
  bus_id uuid not null,
  check_in_time timestamptz,
  checked_in_by uuid,
  order_index integer,
  departed_at timestamptz,
  departed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dismissal_run_id, bus_id)
);

alter table public.bus_run_events enable row level security;

create policy "School users can manage bus_run_events"
  on public.bus_run_events
  as permissive
  for all
  using (get_user_school_id(auth.uid()) = school_id)
  with check (get_user_school_id(auth.uid()) = school_id);

create index if not exists idx_bus_run_events_run_order
  on public.bus_run_events (dismissal_run_id, order_index nulls last, check_in_time);

create trigger set_updated_at_bus_run_events
  before update on public.bus_run_events
  for each row
  execute procedure public.update_updated_at_column();

-- 4) Car line staff sessions (arrival/finish)
create table if not exists public.car_line_sessions (
  id uuid primary key default gen_random_uuid(),
  school_id bigint not null,
  dismissal_run_id uuid not null references public.dismissal_runs(id) on delete cascade,
  car_line_id uuid not null,
  managed_by uuid not null,
  arrived_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.car_line_sessions enable row level security;

create policy "School users can manage car_line_sessions"
  on public.car_line_sessions
  as permissive
  for all
  using (get_user_school_id(auth.uid()) = school_id)
  with check (get_user_school_id(auth.uid()) = school_id);

create index if not exists idx_car_line_sessions_run_line
  on public.car_line_sessions (dismissal_run_id, car_line_id, arrived_at);

-- 5) Walker staff sessions (arrival/finish)
create table if not exists public.walker_sessions (
  id uuid primary key default gen_random_uuid(),
  school_id bigint not null,
  dismissal_run_id uuid not null references public.dismissal_runs(id) on delete cascade,
  walker_location_id uuid not null,
  managed_by uuid not null,
  arrived_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.walker_sessions enable row level security;

create policy "School users can manage walker_sessions"
  on public.walker_sessions
  as permissive
  for all
  using (get_user_school_id(auth.uid()) = school_id)
  with check (get_user_school_id(auth.uid()) = school_id);

create index if not exists idx_walker_sessions_run_loc
  on public.walker_sessions (dismissal_run_id, walker_location_id, arrived_at);

-- 6) Realtime configuration (for live UI updates)
alter table public.dismissal_run_groups replica identity full;
alter table public.bus_run_events replica identity full;

-- Add relevant tables to supabase_realtime publication if not already present
alter publication supabase_realtime add table public.dismissal_run_groups;
alter publication supabase_realtime add table public.bus_run_events;
