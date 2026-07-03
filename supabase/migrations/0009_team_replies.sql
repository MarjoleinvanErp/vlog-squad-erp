-- ================================================================
-- Speurtocht Erp - Teams kunnen terugberichten sturen
-- ================================================================
-- broadcast_messages krijgt een optionele afzender: team_id null =
-- bericht van de ouders (zoals voorheen), gevuld = antwoord van dat
-- team. Teams zien alleen ouder-berichten + hun eigen antwoorden;
-- ouders zien alles. RLS en realtime staan al goed voor deze tabel.
-- ================================================================

alter table broadcast_messages
  add column if not exists team_id uuid references teams(id) on delete cascade;

create index if not exists broadcast_messages_team_idx
  on broadcast_messages (team_id);
