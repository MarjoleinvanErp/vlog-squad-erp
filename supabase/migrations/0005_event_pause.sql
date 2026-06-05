-- ================================================================
-- Speurtocht Erp - Event pause / rally
-- ================================================================
-- Ouders kunnen het spel pauzeren met een verzamel-bericht + locatie.
-- Squads krijgen full-screen overlay, kunnen geen challenges meer
-- indienen tot ouders hervatten.
-- ================================================================

alter table events
  add column if not exists state text not null default 'running',
  add column if not exists rally_message text,
  add column if not exists rally_lat numeric(10, 7),
  add column if not exists rally_lng numeric(10, 7),
  add column if not exists paused_at timestamptz;

-- Realtime publication: events moet ook live updates streamen voor squad-overlay
do $$
begin
  begin
    alter publication supabase_realtime add table public.events;
  exception when duplicate_object then null;
  end;
end $$;
