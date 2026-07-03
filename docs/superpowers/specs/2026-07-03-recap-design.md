# Recap: terugkijk-pagina + offline export

**Datum:** 2026-07-03 · **Goedgekeurd door user:** ja ("ja akkoord, ga je gang")

## Doel

Na afloop van de speurtocht kunnen familie en vrienden de resultaten
terugkijken, en blijft er een blijvende offline kopie bestaan — de gratis
Supabase-opslag is niet permanent.

## Deel 1 — Online terugkijk-pagina `/recap`

- **Toegang:** simpel codewoord achter een invoerscherm (stijl van de
  team-login). Code komt uit env `RECAP_CODE`, fallback `ERP2026`.
  Na juiste code: httpOnly-cookie `st_recap` (zelfde patroon als
  `st_team`/`st_admin` in `src/lib/auth/session.ts`).
- **Inhoud** (server component, service key, actieve event):
  - Hero met eventnaam + datum.
  - Eindstand-podium: teams gesorteerd op score. Score = som
    `awarded_points` van approved submissions + som `bonus_awarded` van
    `location_visits` (identiek aan `/team/ranking`).
  - Per team: teamfoto, teamleden, alle inzendingen chronologisch met
    opdrachttitel, locatienaam, media (foto's in grid, video's met
    `<video controls>`), tekst-/meerkeuze-antwoorden en status:
    ✓ punten · ⏳ niet beoordeeld · ✗ afgekeurd.
- Media rechtstreeks via de bestaande publieke Supabase-URLs.
- Video vs. foto wordt bepaald op bestandsextensie (.mp4/.webm/.mov).

## Deel 2 — Export-script `scripts/export-recap.mjs`

Draait lokaal (`node scripts/export-recap.mjs`, op het gemeentenetwerk met
`NODE_OPTIONS=--use-system-ca`). Leest `.env.local` zelf in. Maakt:

```
recap-export/
  index.html          ← standalone offline recap (zelfde opzet/stijl)
  data.json           ← alle ruwe data
  media/<team>/...    ← alle foto's en video's, per team
```

- Data via Supabase REST met de service-role key: events, teams,
  team_members, locations, tasks, submissions, location_visits.
- Media gedownload van de publieke URLs; in `index.html` worden de
  relatieve paden gebruikt zodat alles offline werkt.
- Bestaande bestanden worden overgeslagen (script is herstartbaar).

## Buiten scope

- Download-knop in de app zelf (Vercel-serverfuncties zijn ongeschikt om
  honderden MB's te streamen; het lokale script is de betrouwbare route).
- Auth-hardening: het codewoord beschermt een feestje-recap, geen geheimen.

## Verificatie

`npm run build`; export-script draaien tegen het echte project en checken
dat `index.html` offline opent met media.
