# Berichten-tab + ranking-reveal

## Doel

Voorkomen dat squads tijdens de speurtocht elkaars puntenstand zien — een achterstand kan op een kinderfeest de pret drukken. De Ranking-tab op de team-view wordt vervangen door een Berichten-tab waarmee ouders broadcast-berichten naar alle squads kunnen pushen. De eindstand wordt pas onthuld nadat de ouder op "Eindig spel" drukt.

## Scope

Geldt alleen voor de team-view. Het ouder-dashboard mag altijd de live ranking blijven zien (die zit nu impliciet in de submission-review flow, hier veranderen we niets aan).

## Datamodel

Nieuwe tabel `broadcast_messages`:

- `id uuid pk default gen_random_uuid()`
- `event_id uuid references events(id) on delete cascade not null`
- `body text not null check (char_length(body) between 1 and 280)`
- `created_at timestamptz not null default now()`

Geen `created_by` kolom — ouder-auth gaat via session-based `getAdminSession()` (event-id, geen `auth.users`), en er is per event maar één rol "ouder", dus de afzender is impliciet.

Index op `(event_id, created_at desc)` voor de chat-log query.

RLS: schrijven alleen via service-role server actions (zoals de bestaande ouder-flows). Voor Realtime-levering aan anon-clients (de `MessagesStream` en `MessagesBell` browser-subscriptions) is een `for select to anon using (true)` policy vereist — zonder die policy slaat Supabase Realtime row-events stilletjes over. Initial server-render gebruikt `supabaseService()` voor consistentie met andere pagina's.

## Realtime

Supabase Realtime subscription op `broadcast_messages` gefilterd op `event_id`. Patroon volgt bestaande live-componenten (zie `src/app/ouder/dashboard/live-refresh.tsx`).

## Push-notificaties

Bij elke nieuwe broadcast: push naar alle squads van het event, met titel "📣 Bericht van de ouders" en de eerste ~80 tekens van de body als preview. Hergebruikt de bestaande push-infrastructuur (zie commit `26f428f`).

Aparte push bij ranking-reveal (zie verder).

## Bottom-nav

`src/app/team/bottom-nav.tsx`:

- Tab-key `ranking` wordt vervangen door `messages`.
- Label: "Berichten".
- Href: `/team/messages`.
- Volgorde blijft: Map, Quests, Feed, Berichten.

De Berichten-tab krijgt een ongelezen-badge (zoals het bestaande review-belletje), op basis van `last_seen_at` per team (zie hieronder).

## Pagina `/team/messages` (team-view)

- Server component, vereist `getTeamSession()`.
- Query: alle `broadcast_messages` van het team's event, gesorteerd `created_at desc`.
- UI: chat-log stijl, nieuwste boven. Per bericht: tijdstip (HH:mm), body, kleine "Ouders"-tag.
- Realtime client-stream: nieuwe berichten verschijnen bovenaan zonder refresh.
- Bij `event.state === "finished"`: bovenaan een banner met "🏆 De eindstand is binnen — Bekijk ranking →" die linkt naar `/team/ranking`.
- Bij paginabezoek wordt `team_messages_seen.last_seen_at` geüpdatet (zie ongelezen-badge).

### Ongelezen-badge

Volgt het bestaande `ReviewBell`-patroon (`src/app/team/review-bell.tsx`): seen-state in `localStorage` per `team_id`, geen DB-tabel. Een nieuwe client-component telt `broadcast_messages` met `created_at > localStorage[seenKey]` via een Realtime-subscription en toont een floating badge. Bij bezoek aan `/team/messages` wordt `last_seen_at` op `now()` gezet.

## Pagina `/team/ranking` (team-view)

Bestaand bestand `src/app/team/ranking/page.tsx` blijft grotendeels intact, maar:

- Aan het begin: laad `event.state`. Als `!== "finished"` → `redirect("/team/messages")`.
- `TeamBottomNav` op deze pagina krijgt `active="messages"` (de tab heet zo, en de ranking is een sub-view).

## Ouder-dashboard

Nieuwe sectie op `src/app/ouder/dashboard/page.tsx`, los van de bestaande Pauze/Eindig-knoppen. Eigen component `broadcast-section.tsx`:

- Textarea met `maxLength={280}` en live char-counter.
- "Verstuur"-knop. Submit via server action `sendBroadcastAction` die:
  1. Inserts in `broadcast_messages` (event_id = het actieve event).
  2. Pusht naar alle squads van het event.
- Onder het formulier: log van laatste 20 verstuurde berichten met tijdstip en body.

De sectie is zichtbaar in alle event-states (running, paused, finished) — handig voor "kom naar de prijsuitreiking" na finished.

## Ranking-reveal flow

Bestaande "Eindig spel" actie (`finishEventAction`) krijgt twee extra stappen:

1. Push naar alle squads: "🏆 De eindstand is binnen!" met deeplink naar `/team/ranking`.
2. (Geen DB-wijziging nodig — `/team/ranking` checkt zelf `event.state === "finished"`.)

`FinishedView` in `announce-section.tsx` krijgt een extra zin: "Squads zien nu de eindstand op /team/ranking en elkaars posts op /team/feed."

Bij heropenen (`resumeEventAction` met state → running): geen extra push nodig, ranking-pagina redirect dan automatisch weer terug naar /team/messages.

## Migraties

Nieuwe migratie `0005_broadcast_messages.sql`:

- `create table broadcast_messages (...)`
- `create index broadcast_messages_event_created_idx on broadcast_messages (event_id, created_at desc)`
- `create table team_messages_seen (...)`
- Geen RLS policies — alleen service-role access.

## Niet in scope

- Per-team berichten (alleen broadcast).
- Reacties of likes op berichten van team-kant.
- Berichten van teams naar ouders.
- Edit/delete van verstuurde berichten (one-shot send).
- Auto-vertaal of emoji-picker — kale textarea is genoeg.
