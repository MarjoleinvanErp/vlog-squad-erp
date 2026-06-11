# Foto/video opdrachten met aantallen en duur

## Doel

Opdrachten kunnen verschillende media-eisen hebben: meerdere foto's verplicht of een video met een vaste max-duur. Voorbeeld: "3 personen veters strikken" = 3 foto's, "TikTok-dansje" = max 10 seconden video.

## Datamodel

- Enum `task_type` krijgt waarde `video`. Bestaand: `photo, text, multiple_choice, arrival, video`.
- Tabel `tasks` krijgt vier nullable kolommen: `min_photos`, `max_photos`, `min_seconds`, `max_seconds`.
- Tabel `submissions`: `photo_url` (text) wordt vervangen door `photo_urls` (text[]).
- Bestaande photo-tasks krijgen `min_photos=1, max_photos=1` in de migratie.
- Bestaande photo-submissions: hun `photo_url` wordt geconverteerd naar `photo_urls = array[photo_url]`.

## Admin (task-form)

Type-picker krijgt 5 opties: Drop (Photo), Video, Hot Take, Quiz, Arrival.

Bij `type=photo`: input "Aantal foto's" (max), default 1, plus advanced toggle "ook minder toestaan?" met min-input. Standaard wordt min gelijk aan max gezet (= "precies N foto's").

Bij `type=video`: input "Max seconden", default 10, plus advanced toggle "ook korter toestaan?" met min-input. Default min = 1.

## Team — photo flow (multi-foto, één voor één)

- Grid van slots, 1 per max-foto.
- Tap leeg slot → camera opent (`<input type="file" accept="image/*" capture="environment">`). Geüploade foto wordt direct naar Supabase Storage gepushed via signed URL.
- Slot toont thumb met "✕" om opnieuw te doen.
- localStorage backup per `team_id:task_id`: bij refresh worden geüploade paths teruggehaald.
- "Drop post"-knop alleen actief als aantal foto's tussen min en max.
- Pas bij submit wordt submission-row aangemaakt met `photo_urls = [url1, url2, ...]`.

## Team — video flow (in-app recorder met harde timer)

- `getUserMedia({ video: { facingMode: 'environment' }, audio: true })` → live preview.
- Pink "Start"-knop. Tijdens opname: ronde aftellende timer, rode "Stop"-knop. Auto-stop op max-seconden.
- `MediaRecorder` → Blob. Voorkeur mimeType: `video/mp4`, dan `video/webm;codecs=vp9`, dan `video/webm`.
- Na opname: preview met "Posten" / "Opnieuw".
- Min-seconden check vóór uploaden — als korter dan min: "Opnieuw" auto-actief.
- Upload via signed URL → submission insert met `photo_urls = [video_url]`.

## Submission action (server-side)

- `submitChallengeAction` accepteert nu een `photo_paths` (string[]) i.p.v. enkele `photo_path`.
- Validatie:
  - `type=photo`: `min_photos <= count <= max_photos`. Defaults 1/1 als kolommen NULL.
  - `type=video`: exact 1 path.
- Insert: `photo_urls` array met publieke URLs.

## UI elders (lees-paden)

- Feed-stream: toont eerste foto als hero, met badge `+N` als er meer foto's zijn (later evt. carousel).
- Ouder review-pagina (`/ouder/submission/[id]`): alle foto's in een verticale stack onder elkaar. Video: één `<video>` element.
- Ouder dashboard pending-lijst: eerste foto als thumb.
- Team-feed `feed-stream.tsx`: `s.photo_urls[0]` als hero.

## Migratie file

`supabase/migrations/0003_media_types.sql`

```sql
-- 1. Enum value
alter type task_type add value if not exists 'video';

-- 2. Task config columns
alter table tasks add column if not exists min_photos int;
alter table tasks add column if not exists max_photos int;
alter table tasks add column if not exists min_seconds int;
alter table tasks add column if not exists max_seconds int;

-- 3. Backfill bestaande photo-tasks
update tasks set min_photos = 1, max_photos = 1
where type = 'photo' and min_photos is null;

-- 4. photo_urls array kolom
alter table submissions add column if not exists photo_urls text[] not null default '{}';
update submissions set photo_urls = array[photo_url]
where photo_url is not null and (photo_urls = '{}' or photo_urls is null);
alter table submissions drop column if exists photo_url;
```

## Buiten scope

- Geen swipe-carousel in de feed (alleen eerste foto + count-badge in MVP).
- Geen retry-strategie voor mislukte uploads voorbij client-state.
- Geen server-side video-duration verification (we vertrouwen de client-side timer — anti-cheat is geen probleem op kinderfeest).
