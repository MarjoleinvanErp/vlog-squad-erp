-- ================================================================
-- Speurtocht Erp — Initial Schema
-- ================================================================
-- Project: ztccdrzjlwhxseixpmjc
-- Apply via: Dashboard → SQL Editor (kopieer/plak deze hele file)
--
-- BELANGRIJK: voer dit ALLEEN uit in het Supabase project
-- ztccdrzjlwhxseixpmjc. Check dashboard URL voordat je 'Run' klikt.
-- ================================================================

-- ===== Extensions =====
create extension if not exists pgcrypto;

-- ===== Enums =====
do $$ begin
  create type task_type as enum ('photo', 'text', 'multiple_choice', 'arrival');
exception when duplicate_object then null; end $$;

do $$ begin
  create type submission_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type incident_type as enum ('sos', 'inactive', 'out_of_zone');
exception when duplicate_object then null; end $$;

-- ===== events =====
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  start_lat numeric(10, 7),
  start_lng numeric(10, 7),
  admin_code text not null unique,
  no_go_zones jsonb not null default '[]'::jsonb,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

-- ===== teams =====
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  code text not null unique,
  color text not null default '#dc2626',
  team_photo_url text,
  created_at timestamptz not null default now(),
  unique (event_id, name)
);
create index if not exists teams_event_id_idx on teams (event_id);

-- ===== team_members (optioneel) =====
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists team_members_team_id_idx on team_members (team_id);

-- ===== locations =====
create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  description text,
  lat numeric(10, 7) not null,
  lng numeric(10, 7) not null,
  radius_meters int not null default 30,
  arrival_points int not null default 10,
  bonus_first int not null default 5,
  bonus_second int not null default 3,
  bonus_third int not null default 1,
  icon text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists locations_event_id_idx on locations (event_id);

-- ===== tasks (opdrachten) =====
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  location_id uuid references locations(id) on delete cascade,
  title text not null,
  description text not null,
  type task_type not null,
  max_points int not null default 10,
  options jsonb,
  requires_approval boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists tasks_event_id_idx on tasks (event_id);
create index if not exists tasks_location_id_idx on tasks (location_id);

-- ===== submissions (inzendingen) =====
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  text_answer text,
  choice_index int,
  photo_url text,
  submitted_at timestamptz not null default now(),
  status submission_status not null default 'pending',
  awarded_points int,
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text
);
create index if not exists submissions_team_id_idx on submissions (team_id);
create index if not exists submissions_task_id_idx on submissions (task_id);
create index if not exists submissions_status_idx on submissions (status);

-- ===== location_visits =====
create table if not exists location_visits (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  arrived_at timestamptz not null default now(),
  order_position int not null,
  bonus_awarded int not null,
  unique (team_id, location_id)
);
create index if not exists location_visits_team_id_idx on location_visits (team_id);
create index if not exists location_visits_location_id_idx on location_visits (location_id);

-- ===== team_locations (live GPS) =====
create table if not exists team_locations (
  team_id uuid primary key references teams(id) on delete cascade,
  lat numeric(10, 7) not null,
  lng numeric(10, 7) not null,
  accuracy numeric,
  updated_at timestamptz not null default now()
);
create index if not exists team_locations_updated_at_idx on team_locations (updated_at);

-- ===== incidents =====
create table if not exists incidents (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  type incident_type not null,
  lat numeric(10, 7),
  lng numeric(10, 7),
  created_at timestamptz not null default now(),
  acknowledged_by text,
  acknowledged_at timestamptz
);
create index if not exists incidents_team_id_idx on incidents (team_id);
create index if not exists incidents_created_at_idx on incidents (created_at desc);

-- ===== Realtime publication =====
-- Idempotent: voegt tables toe aan supabase_realtime, slaat over als al toegevoegd.
do $$
declare t text;
begin
  for t in select unnest(array['submissions','location_visits','team_locations','incidents','teams','locations','tasks'])
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ===== RLS =====
-- Pragmatische aanpak voor 1-event: anon mag relevante tables lezen,
-- alle writes via server-side service role key (Next.js API routes).
-- Privacy is laag-risico (geen PII, korte event-window, niet-discoverable URL).

alter table events enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table locations enable row level security;
alter table tasks enable row level security;
alter table submissions enable row level security;
alter table location_visits enable row level security;
alter table team_locations enable row level security;
alter table incidents enable row level security;

-- Public read voor anon op alle tabellen
drop policy if exists "anon read events" on events;
create policy "anon read events" on events for select to anon using (true);

drop policy if exists "anon read teams" on teams;
create policy "anon read teams" on teams for select to anon using (true);

drop policy if exists "anon read team_members" on team_members;
create policy "anon read team_members" on team_members for select to anon using (true);

drop policy if exists "anon read locations" on locations;
create policy "anon read locations" on locations for select to anon using (true);

drop policy if exists "anon read tasks" on tasks;
create policy "anon read tasks" on tasks for select to anon using (true);

drop policy if exists "anon read submissions" on submissions;
create policy "anon read submissions" on submissions for select to anon using (true);

drop policy if exists "anon read location_visits" on location_visits;
create policy "anon read location_visits" on location_visits for select to anon using (true);

drop policy if exists "anon read team_locations" on team_locations;
create policy "anon read team_locations" on team_locations for select to anon using (true);

drop policy if exists "anon read incidents" on incidents;
create policy "anon read incidents" on incidents for select to anon using (true);

-- Geen anon write policies — alle writes gaan via service role (bypasst RLS).

-- ===== Storage buckets =====
insert into storage.buckets (id, name, public)
values ('team-photos', 'team-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('submission-photos', 'submission-photos', true)
on conflict (id) do nothing;

-- Public read op foto's (URLs zijn niet te raden = obscurity)
drop policy if exists "anon read team-photos" on storage.objects;
create policy "anon read team-photos" on storage.objects
  for select to anon using (bucket_id = 'team-photos');

drop policy if exists "anon read submission-photos" on storage.objects;
create policy "anon read submission-photos" on storage.objects
  for select to anon using (bucket_id = 'submission-photos');

-- Uploads gaan via service role (Next.js server actions/API routes).
