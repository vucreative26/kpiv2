-- Flow KPI V3 — destructive migration requested by the owner.
-- Run this whole file in Supabase SQL Editor. Authentication users are preserved.
begin;

-- Remove old application tables only. auth.users and Storage are untouched.
drop function if exists public.flow_mutate(text,text,text,jsonb) cascade;
drop function if exists public.flow_period(text) cascade;
drop function if exists public.flow_revision() cascade;
drop table if exists public.flow_v2_payroll_items cascade;
drop table if exists public.flow_v2_payrolls cascade;
drop table if exists public.flow_v2_salary_rules cascade;
drop table if exists public.flow_v2_urgent_tasks cascade;
drop table if exists public.flow_v2_events cascade;
drop table if exists public.flow_v2_daily_notes cascade;
drop table if exists public.flow_v2_resource_links cascade;
drop table if exists public.flow_v2_tasks cascade;
drop table if exists public.flow_v2_subtasks cascade;
drop table if exists public.flow_v2_kpis cascade;
drop table if exists public.flow_v2_profiles cascade;
drop table if exists public.flow_payroll cascade;
drop table if exists public.flow_calendar_notes cascade;
drop table if exists public.flow_payroll_items cascade;
drop table if exists public.flow_payrolls cascade;
drop table if exists public.flow_salary_bonuses cascade;
drop table if exists public.flow_salary_rules cascade;
drop table if exists public.flow_resource_links cascade;
drop table if exists public.flow_leaves cascade;
drop table if exists public.flow_daily_notes cascade;
drop table if exists public.flow_urgent_tasks cascade;
drop table if exists public.flow_revisions cascade;
drop table if exists public.flow_check_items cascade;
drop table if exists public.flow_sub_tasks cascade;
drop table if exists public.flow_kpis cascade;

create table public.flow_v3_months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  year smallint not null check(year between 2000 and 2200),
  month smallint not null check(month between 1 and 12),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,year,month), unique(user_id,id)
);
create table public.flow_v3_kpis (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  month_id uuid not null, name text not null check(length(trim(name)) between 1 and 500), note text not null default '', sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,id),
  foreign key(user_id,month_id) references public.flow_v3_months(user_id,id) on delete cascade
);
create table public.flow_v3_subtasks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  kpi_id uuid not null, name text not null check(length(trim(name)) between 1 and 500), week_number smallint check(week_number between 1 and 6),
  start_date date, end_date date, note text not null default '', completed boolean not null default false, completed_at timestamptz, sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,id),
  check(end_date is null or start_date is null or end_date>=start_date),
  foreign key(user_id,kpi_id) references public.flow_v3_kpis(user_id,id) on delete cascade
);
create table public.flow_v3_tasks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  subtask_id uuid not null, name text not null check(length(trim(name)) between 1 and 500), date date, start_time time, end_time time,
  note text not null default '', completed boolean not null default false, completed_at timestamptz, sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,id),
  check(date is not null or (start_time is null and end_time is null)), check(end_time is null or start_time is null or end_time>start_time),
  foreign key(user_id,subtask_id) references public.flow_v3_subtasks(user_id,id) on delete cascade
);
create table public.flow_v3_urgent_tasks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  month_id uuid not null, name text not null check(length(trim(name)) between 1 and 500), date date not null, start_time time, end_time time,
  related_kpi_id uuid, related_subtask_id uuid, category text, note text not null default '', completed boolean not null default false, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,id),
  check(end_time is null or start_time is null or end_time>start_time),
  foreign key(user_id,month_id) references public.flow_v3_months(user_id,id) on delete cascade,
  foreign key(user_id,related_kpi_id) references public.flow_v3_kpis(user_id,id) on delete set null (related_kpi_id),
  foreign key(user_id,related_subtask_id) references public.flow_v3_subtasks(user_id,id) on delete set null (related_subtask_id)
);
create table public.flow_v3_payrolls (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  month_id uuid not null, base_salary numeric(14,2) not null default 0, kpi_bonus numeric(14,2) not null default 0,
  other_adjustment numeric(14,2) not null default 0, attendance_adjustment numeric(14,2) not null default 0, note text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,id), unique(user_id,month_id),
  foreign key(user_id,month_id) references public.flow_v3_months(user_id,id) on delete cascade
);
create table public.flow_v3_attendance_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  month_id uuid not null, type text not null check(type in ('leave','unpaid_leave','late','early_leave','business_trip','other')),
  start_date date not null, end_date date not null, start_time time, end_time time,
  approval_status text not null default 'draft' check(approval_status in ('draft','pending','approved','rejected')),
  salary_adjustment numeric(14,2) not null default 0, note text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,id),
  check(end_date>=start_date), foreign key(user_id,month_id) references public.flow_v3_months(user_id,id) on delete cascade
);
create table public.flow_v3_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '', week_starts_on smallint not null default 1 check(week_starts_on in (0,1)),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index flow_v3_kpis_month on public.flow_v3_kpis(user_id,month_id,sort_order);
create index flow_v3_subtasks_kpi on public.flow_v3_subtasks(user_id,kpi_id,sort_order);
create index flow_v3_subtasks_week on public.flow_v3_subtasks(user_id,week_number);
create index flow_v3_tasks_subtask on public.flow_v3_tasks(user_id,subtask_id,sort_order);
create index flow_v3_tasks_date on public.flow_v3_tasks(user_id,date);
create index flow_v3_urgent_date on public.flow_v3_urgent_tasks(user_id,date);
create index flow_v3_attendance_dates on public.flow_v3_attendance_events(user_id,start_date,end_date);

create or replace function public.flow_v3_touch() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin
  foreach t in array array['flow_v3_months','flow_v3_kpis','flow_v3_subtasks','flow_v3_tasks','flow_v3_urgent_tasks','flow_v3_payrolls','flow_v3_attendance_events','flow_v3_settings'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy v3_owner_all on public.%I for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t);
    execute format('revoke all on public.%I from anon',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('create trigger v3_touch before update on public.%I for each row execute function public.flow_v3_touch()',t);
  end loop;
end $$;

-- Atomic restore endpoint. Payload keys use snake_case database field names.
create or replace function public.flow_v3_restore_backup(payload jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare owner uuid := auth.uid(); item jsonb;
begin
  if owner is null then raise exception 'Authentication required'; end if;
  delete from public.flow_v3_months where user_id=owner;
  for item in select * from jsonb_array_elements(coalesce(payload#>'{data,months}','[]')) loop insert into public.flow_v3_months select * from jsonb_populate_record(null::public.flow_v3_months,item||jsonb_build_object('user_id',owner)); end loop;
  for item in select * from jsonb_array_elements(coalesce(payload#>'{data,kpis}','[]')) loop insert into public.flow_v3_kpis select * from jsonb_populate_record(null::public.flow_v3_kpis,item||jsonb_build_object('user_id',owner)); end loop;
  for item in select * from jsonb_array_elements(coalesce(payload#>'{data,subtasks}','[]')) loop insert into public.flow_v3_subtasks select * from jsonb_populate_record(null::public.flow_v3_subtasks,item||jsonb_build_object('user_id',owner)); end loop;
  for item in select * from jsonb_array_elements(coalesce(payload#>'{data,tasks}','[]')) loop insert into public.flow_v3_tasks select * from jsonb_populate_record(null::public.flow_v3_tasks,item||jsonb_build_object('user_id',owner)); end loop;
  for item in select * from jsonb_array_elements(coalesce(payload#>'{data,urgent_tasks}','[]')) loop insert into public.flow_v3_urgent_tasks select * from jsonb_populate_record(null::public.flow_v3_urgent_tasks,item||jsonb_build_object('user_id',owner)); end loop;
  for item in select * from jsonb_array_elements(coalesce(payload#>'{data,payrolls}','[]')) loop insert into public.flow_v3_payrolls select * from jsonb_populate_record(null::public.flow_v3_payrolls,item||jsonb_build_object('user_id',owner)); end loop;
  for item in select * from jsonb_array_elements(coalesce(payload#>'{data,attendance_events}','[]')) loop insert into public.flow_v3_attendance_events select * from jsonb_populate_record(null::public.flow_v3_attendance_events,item||jsonb_build_object('user_id',owner)); end loop;
  insert into public.flow_v3_settings(user_id,display_name,week_starts_on)
  values(owner,coalesce(payload#>>'{data,settings,display_name}',''),coalesce((payload#>>'{data,settings,week_starts_on}')::smallint,1))
  on conflict(user_id) do update set display_name=excluded.display_name,week_starts_on=excluded.week_starts_on;
end $$;
grant execute on function public.flow_v3_restore_backup(jsonb) to authenticated;
commit;
