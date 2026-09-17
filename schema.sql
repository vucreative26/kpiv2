-- Flow KPI V2 — clean schema. Safe to run alongside V1 in the existing Supabase project.
-- All business tables are user-owned and protected by Row Level Security.
begin;

create table if not exists public.flow_v2_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  daily_capacity_minutes integer not null default 480 check(daily_capacity_minutes between 60 and 1440),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.flow_v2_kpis (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  period text not null check(period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  title text not null check(length(trim(title)) between 1 and 1000), description text not null default '',
  category text not null default '', deadline date, priority text not null default 'medium' check(priority in ('low','medium','high')),
  status text not null default 'todo' check(status in ('todo','in_progress','done')),
  result_summary text not null default '', sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,id)
);
create table if not exists public.flow_v2_subtasks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  kpi_id uuid not null, title text not null check(length(trim(title)) between 1 and 1000), description text not null default '',
  planned_week smallint check(planned_week between 1 and 6), deadline date,
  priority text not null default 'medium' check(priority in ('low','medium','high')),
  status text not null default 'todo' check(status in ('todo','in_progress','done')), sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,id),
  foreign key(user_id,kpi_id) references public.flow_v2_kpis(user_id,id) on delete cascade
);
create table if not exists public.flow_v2_tasks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  subtask_id uuid not null, title text not null check(length(trim(title)) between 1 and 1000), description text not null default '',
  planned_date date, planned_period text check(planned_period is null or planned_period in ('morning','afternoon','anytime')),
  deadline date, estimated_minutes integer check(estimated_minutes is null or estimated_minutes between 0 and 10080),
  priority text not null default 'medium' check(priority in ('low','medium','high')),
  status text not null default 'todo' check(status in ('todo','in_progress','done')), result text not null default '',
  evidence_url text not null default '' check(evidence_url='' or evidence_url ~* '^https?://[^[:space:]]+$'),
  is_highlight boolean not null default false, sort_order integer not null default 0,
  completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,id),
  foreign key(user_id,subtask_id) references public.flow_v2_subtasks(user_id,id) on delete cascade
);
create table if not exists public.flow_v2_resource_links (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check(entity_type in ('kpi','subtask','task','urgent')),
  entity_id uuid not null, label text not null default 'Tài liệu', url text not null check(url ~* '^https?://[^[:space:]]+$'),
  created_at timestamptz not null default now()
);
create table if not exists public.flow_v2_daily_notes (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  note_date date not null, content text not null default '', updated_at timestamptz not null default now(), unique(user_id,note_date)
);
create table if not exists public.flow_v2_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '', event_type text not null default 'personal' check(event_type in ('leave','trip','training','personal')),
  start_date date not null, end_date date not null check(end_date>=start_date), start_time time, end_time time,
  note text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.flow_v2_urgent_tasks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check(length(trim(title))>0), due_date date, priority text not null default 'high' check(priority in ('low','medium','high')),
  status text not null default 'todo' check(status in ('todo','in_progress','done')), note text not null default '',
  evidence_url text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.flow_v2_salary_rules (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, rule_type text not null default 'keyword' check(rule_type in ('base','keyword','tax')),
  keyword text not null default '', amount numeric not null default 0, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.flow_v2_payrolls (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  period text not null check(period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'), title text not null, note text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,id)
);
create table if not exists public.flow_v2_payroll_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  payroll_id uuid not null, source_type text not null default 'manual' check(source_type in ('base','kpi','subtask','task','manual','tax')),
  source_id uuid, title text not null, amount numeric not null default 0,
  created_at timestamptz not null default now(), foreign key(user_id,payroll_id) references public.flow_v2_payrolls(user_id,id) on delete cascade
);

create index if not exists flow_v2_kpis_period on public.flow_v2_kpis(user_id,period);
create index if not exists flow_v2_subtasks_parent on public.flow_v2_subtasks(user_id,kpi_id);
create index if not exists flow_v2_subtasks_week on public.flow_v2_subtasks(user_id,planned_week);
create index if not exists flow_v2_tasks_parent on public.flow_v2_tasks(user_id,subtask_id);
create index if not exists flow_v2_tasks_date on public.flow_v2_tasks(user_id,planned_date);
create index if not exists flow_v2_events_dates on public.flow_v2_events(user_id,start_date,end_date);
create index if not exists flow_v2_urgent_due on public.flow_v2_urgent_tasks(user_id,due_date);
create index if not exists flow_v2_payroll_period on public.flow_v2_payrolls(user_id,period);

do $$ declare t text; begin
  foreach t in array array['flow_v2_profiles','flow_v2_kpis','flow_v2_subtasks','flow_v2_tasks','flow_v2_resource_links','flow_v2_daily_notes','flow_v2_events','flow_v2_urgent_tasks','flow_v2_salary_rules','flow_v2_payrolls','flow_v2_payroll_items'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists v2_owner_all on public.%I',t);
    execute format('create policy v2_owner_all on public.%I for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t);
    execute format('revoke all on public.%I from anon',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  end loop;
end $$;

create or replace function public.flow_v2_touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin
  foreach t in array array['flow_v2_profiles','flow_v2_kpis','flow_v2_subtasks','flow_v2_tasks','flow_v2_daily_notes','flow_v2_events','flow_v2_urgent_tasks','flow_v2_salary_rules','flow_v2_payrolls'] loop
    execute format('drop trigger if exists v2_touch on public.%I',t);
    execute format('create trigger v2_touch before update on public.%I for each row execute function public.flow_v2_touch_updated_at()',t);
  end loop;
end $$;
commit;
