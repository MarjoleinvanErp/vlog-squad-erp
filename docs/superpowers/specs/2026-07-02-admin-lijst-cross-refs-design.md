# Admin lijst-pagina's: kruisverwijzingen locatie ↔ challenge

## Doel

Bij het inrichten van het spel wil de admin (ouder) in één oogopslag zien welke challenges bij welke locaties horen — zonder elke rij te openen. Nu moet je iedere locatie/challenge apart aanklikken om te checken of er iets aan gekoppeld is. Dat maakt het lastig om vlak voor het feest te controleren of iedere locatie challenges heeft en of één locatie er niet té veel heeft.

## Scope

Alleen de twee lijst-pagina's:

- `/admin/locations` — voegt challenge-info per locatie toe
- `/admin/tasks` (titel "Challenges") — maakt de bestaande locatie-vermelding duidelijk zichtbaar

Detail-pagina's (`/admin/locations/[id]`, `/admin/tasks/[id]`) blijven ongemoeid — daar zit de info al in de formulier-velden.

## `/admin/tasks` (challenges lijst)

Huidige situatie: de locatie-naam wordt getoond met `text-fg-dim` inline naast andere metadata (bv. `Drop · 10 likes · 2 foto's · Kerk`). Zo dim dat je 'm mist.

Wijziging: vervang de dim-inline weergave door een gekleurd pill-badge in dezelfde regel als het type-label. Twee varianten:

- Met `location_id` gezet: `📍 <locatie-naam>` in cyan (`bg-cyan/10 border-cyan/40 text-cyan`) — matcht het bestaande cyan-accent van andere secondaire info.
- Zonder `location_id` (anywhere quest): `🌐 anywhere` in gedempte kleur (`bg-bg-elev border-border text-fg-muted`).

Positie: direct achter het type-label (bv. `Drop`), vóór de max-points-vermelding. De rest van de metadata-regel (media-hint, likes) blijft ongewijzigd.

## `/admin/locations` (drops lijst)

Nieuwe regel onder de bestaande coördinaten-regel per locatie, met samenvatting van gekoppelde challenges:

- 0 challenges: `⚠ geen challenges` in rood (`text-red-400` / `bg-red-500/10 border-red-500/30`).
- 1+ challenges: `<n> challenges · <type1>, <type2>, …` in fg-muted. De type-lijst bevat unieke type-labels van álle challenges op die locatie, in de canonieke volgorde uit `TYPE_LABEL` in `src/app/admin/tasks/page.tsx` (Drop, Video, Hot Take, Quiz, Arrival). Duplicaten worden gededupliceerd, dus 3 Drops + 2 Quizzes = `5 challenges · Drop, Quiz`.

## Datamodel

Geen schema-wijzigingen. Voor `/admin/locations` één extra query in de bestaande server-component:

```typescript
sb.from("tasks")
  .select("id, location_id, type")
  .eq("event_id", eventId)
```

Client-side groeperen op `location_id` → `Map<string, TaskSummary[]>`. Anywhere quests (`location_id === null`) worden niet meegeteld per locatie.

## Niet in scope

- Waarschuwing "te veel challenges op één locatie" met threshold — de teller in de pill is voldoende voor de admin om zelf te oordelen.
- Sorteren/filteren op aantal challenges.
- Directe navigatie vanaf de challenge-pill in de locations-lijst naar de challenge-detailpagina (alleen de teller is zichtbaar, geen individuele links).
- Wijziging op detail-pagina's.
