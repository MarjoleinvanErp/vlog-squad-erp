-- ================================================================
-- Speurtocht Erp — Seed (DEV/TEST)
-- ================================================================
-- Optioneel: voor lokaal testen. NIET uitvoeren in productie.
-- Maakt een test-event met 3 teams aan zodat je login en kaart
-- meteen kunt testen voordat de echte content erin staat.
-- ================================================================

insert into events (id, name, starts_at, ends_at, start_lat, start_lng, admin_code, active)
values (
  '00000000-0000-0000-0000-000000000001',
  'Test Speurtocht',
  '2026-07-03 14:00:00+02',
  '2026-07-03 16:00:00+02',
  51.5957,
  5.6017,
  'OUDER1234',
  true
)
on conflict (id) do nothing;

insert into teams (event_id, name, code, color) values
  ('00000000-0000-0000-0000-000000000001', 'Team Rood',  'ROOD', '#dc2626'),
  ('00000000-0000-0000-0000-000000000001', 'Team Blauw', 'BLAU', '#2563eb'),
  ('00000000-0000-0000-0000-000000000001', 'Team Geel',  'GEEL', '#eab308')
on conflict (code) do nothing;
