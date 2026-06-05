-- ================================================================
-- Speurtocht Erp - Push notification subscriptions
-- ================================================================
-- Per browser/device één rij. Endpoint is uniek (re-subscribe overschrijft).
-- Subscription kan gekoppeld zijn aan een team (squad-side push) OF
-- aan een event als ouder (event-side push voor SOS / arrivals).
-- ================================================================

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  team_id uuid references teams(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  is_ouder boolean not null default false,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subs_team_idx on push_subscriptions (team_id)
  where team_id is not null;
create index if not exists push_subs_event_ouder_idx on push_subscriptions (event_id)
  where is_ouder = true;

alter table push_subscriptions enable row level security;
-- Geen anon policies — alleen service role mag lezen/schrijven.
