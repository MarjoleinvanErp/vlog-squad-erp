-- ================================================================
-- Speurtocht Erp - Broadcast berichten
-- ================================================================
-- Ouders kunnen tijdens het spel broadcast-berichten sturen naar alle
-- squads van het event. Append-only, geen RLS-policies (alleen service
-- role schrijft/leest).
-- ================================================================

create table if not exists broadcast_messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now()
);

create index if not exists broadcast_messages_event_created_idx
  on broadcast_messages (event_id, created_at desc);

alter table broadcast_messages enable row level security;

-- Anon read policy: nodig zodat Supabase Realtime row-events doorgeeft aan
-- de browser-clients (MessagesStream + MessagesBell). Writes blijven via
-- service role die RLS bypasst.
drop policy if exists "anon read broadcast_messages" on broadcast_messages;
create policy "anon read broadcast_messages" on broadcast_messages
  for select to anon using (true);

-- Realtime publication: squads abonneren live op nieuwe berichten.
do $$
begin
  begin
    alter publication supabase_realtime add table public.broadcast_messages;
  exception when duplicate_object then null;
  end;
end $$;
