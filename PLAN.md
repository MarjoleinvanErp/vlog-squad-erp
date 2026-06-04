# Speurtocht Erp — Plan

> **Event:** kinderfeest dochter, **3 juli 2026**, vertrek **Veghelsedijk 5, Erp**
> **Deelnemers:** 15 kinderen (11 jr) in 3 teams van 5, lopend, zonder begeleider
> **Duur:** 1,5–2 uur · **Gebied:** kern Erp (≤1 km uit centrum)
> **Doel:** interactieve PWA-speurtocht waarin teams opdrachten doen en locaties bezoeken; ouders monitoren en geven punten.

---

## 1. Tech stack

| Onderdeel | Keuze | Reden |
|---|---|---|
| Frontend | **Next.js 15** (App Router, TypeScript) | SSR + RSC + makkelijke Vercel-deploy |
| PWA | `next-pwa` | install op telefoon, offline app-shell |
| Backend | **Supabase** (Postgres + Realtime + Storage) | one-stop, realtime gratis, geen eigen server |
| Hosting | **Vercel** | naadloos met Next.js |
| Auth | **Geen Supabase Auth** — teamcode + admincode via cookie | simpeler, geen mail/wachtwoord nodig |
| Maps | **Leaflet + OpenStreetMap** | gratis, geen API key |
| Geolocation | Browser Geolocation API | standaard |
| Styling | Tailwind + shadcn/ui | snel + mooi |

**Supabase project:** `ztccdrzjlwhxseixpmjc` ([dashboard](https://supabase.com/dashboard/project/ztccdrzjlwhxseixpmjc))

---

## 2. Datamodel (Postgres)

```
events              één event = één speurtocht
├─ teams            3 teams per event, elk met code + kleur
│  ├─ team_members  (optioneel) namen kinderen
│  ├─ team_locations (1 rij per team — live GPS, elke 30s overschreven)
│  └─ submissions   inzendingen van team
├─ locations        plekken op de kaart met punten
│  ├─ location_visits  welk team wanneer aangekomen + bonus
│  └─ tasks         opdrachten gekoppeld aan locatie (of standalone)
├─ tasks            standalone opdrachten (location_id nullable)
│  └─ submissions
└─ incidents        SOS, inactiviteit, out-of-zone
```

**Belangrijke velden per tabel:**

- **events:** name, starts_at, ends_at, start_lat/lng, admin_code, no_go_zones (jsonb met GeoJSON polygons)
- **teams:** event_id, name, code (4 letters), color, team_photo_url
- **locations:** event_id, name, description, lat/lng, radius_meters (default 30), arrival_points, bonus_first/second/third (5/3/1), sort_order
- **tasks:** event_id, location_id (nullable), title, description, type ('photo'|'text'|'multiple_choice'|'arrival'), max_points, options (jsonb voor multiple_choice), sort_order
- **submissions:** team_id, task_id, type, text_answer, choice_index, photo_url, submitted_at, status ('pending'|'approved'|'rejected'), awarded_points, reviewed_by, reviewed_at, review_note
- **location_visits:** team_id, location_id, arrived_at, order_position (1/2/3), bonus_awarded — UNIQUE(team_id, location_id)
- **team_locations:** team_id (PK), lat, lng, accuracy, updated_at
- **incidents:** team_id, type ('sos'|'inactive'|'out_of_zone'), lat/lng, created_at, acknowledged_by/at

**RLS:** team-rows readable/writable via teamcode-cookie; admin-rows via admincode-cookie; locations + tasks publiek leesbaar binnen actief event.

---

## 3. Schermen

### Team-view (`/team`)
1. **Login** — teamcode invoeren (4 letters)
2. **Teamfoto** — verplichte foto bij start
3. **Kaart** — Leaflet met eigen positie, locaties (icoon, bezocht/niet), no-go zones in rood, puntentotaal bovenin
4. **Locatie-detail** — "Je bent hier!" als binnen radius, lijst opdrachten
5. **Opdracht** — beschrijving, input (foto/tekst/keuze), status pending/approved + behaalde punten
6. **Scorebord** — live alle teams
7. **SOS-overlay** — grote rode knop met bevestiging

### Ouder-view (`/ouder`)
1. **Login** — admincode
2. **Dashboard** — kaart alle teams live · openstaande inzendingen (badge) · scorebord · recente incidents
3. **Submission-detail** — foto/tekst/keuze, slider 0–max punten, goedkeur/afwijs + reden
4. **Team-detail** — positie + route, score-breakdown, bel-knop (`tel:`)

### Admin-view (`/admin`)
1. **Login** — admincode (zelfde als ouder-view; admin = ouder met bewerk-rechten)
2. **Event** — naam, start/eind, admincode, no-go zones tekenen op kaart
3. **Teams** — CRUD teams + codes regenereren
4. **Locaties** — kaart-picker (klik = coords), naam, radius, punten
5. **Opdrachten** — per locatie of standalone, type, max-punten, opties

---

## 4. Opdrachttypes

| Type | Input | Beoordeling | Voorbeeld |
|---|---|---|---|
| `photo` | foto via camera | ouder geeft punten op creativiteit | "Maak een groepsfoto voor de kerk" |
| `text` | tekstantwoord | ouder leest en scoort | "Wat staat er op het bordje bij de molen?" |
| `multiple_choice` | A/B/C/D | automatisch goed/fout | "In welk jaar is de Servatiuskerk gebouwd?" |
| `arrival` | GPS binnen radius | automatisch + volgorde-bonus | (auto bij aankomst) |

---

## 5. GPS + veiligheid

- **Tracking:** `watchPosition` met throttle → upsert `team_locations` elke 30s
- **Permission:** vragen bij start team-view, niet later
- **No-go zones:** GeoJSON polygons op kaart in rood, geen technische block (kinderen moeten zelf opletten — opvoedkundig + technisch onbetrouwbaar)
- **SOS:** vol-scherm bevestigingsknop → incident insert → Realtime + browser notification naar ouders
- **Inactiviteits-alarm:** Edge Function cron (5 min) checkt of laatste submission > 20 min geleden
- **Privacy:** alleen ouders zien team-locaties, teams zien alleen eigen positie

---

## 6. Tijdlijn (2026-06-03 → 2026-07-03)

| Week | Periode | Werk |
|---|---|---|
| 1 | 06-03 → 06-10 | Scaffold + Supabase schema + auth + teamfoto |
| 2 | 06-10 → 06-17 | Admin panel + kaart + opdrachten-flow + Storage uploads |
| 3 | 06-17 → 06-24 | Ouder-dashboard + GPS + SOS + PWA setup |
| 4 | 06-24 → 07-01 | Content invullen (locaties + opdrachten) + test-runs |
| Buffer | 07-01 → 07-03 | Bugs, prints (teamcode-kaartjes), klaarzetten |

---

## 7. Content (door user in te vullen via admin panel)

### Locaties — richtlijn ~6-8 plekken in kern Erp
Suggesties voor typen (jij kent de exacte plekken):
- Sint-Servatiuskerk (centrum / Brink)
- Molen Antonius
- Aa-park / Aa-strang
- Speeltuin
- Sportpark De Pijl
- IJssalon / bakker (lekker tussendoor)
- Basisschool van dochter (herkenbaar)
- Bijzonder monument of kunstwerk
- Begraafplaats (geschikt voor stille observatie-opdracht)

### Opdrachten — richtlijn
- **Per locatie** 2-3 varianten (random toegewezen) zodat teams die elkaar tegenkomen niet hetzelfde doen
  - 1× photo (creatief)
  - 1× text/quiz (info ter plaatse)
  - 1× arrival (automatisch bij aankomst)
- **Standalone** 5-10 vrije opdrachten zonder locatie:
  - "Maak een filmpje van 10 sec met choreografie"
  - "Verzin een groepsnaam-rap"
  - "Stel iemand op straat 3 vragen over Erp"
  - "Foto met iemand met een snor / hond / fiets"

---

## 8. Thema, juice & design (vastgelegd 2026-06-03)

### Concept: "Vlog Squad Erp"
Elk team = squad die voor één middag een vlog-channel runt. Posts droppen, likes scoren, achievements unlocken. Ouders zijn managers die approven.

### UI-taal (mix)
| Origineel | App-tekst |
|---|---|
| Punten | Likes (+ Followers) |
| Inzending | Post / Drop |
| Opdracht | Challenge / Trend |
| Team | Squad |
| Scorebord | Live Feed Ranking |

Mechaniek-termen in Engels (`Squad`, `Drop`, `Trend`, `Likes`, `Followers`, `Go live`). Uitleg/instructies in Nederlands.

### Visuele stijl: TikTok-pink
- Dark mode default — `#0a0a0a` background
- Primary: `#fe2c55` (pink) — alle CTA's en team-accenten
- Accent: `#25f4ee` (cyan) — "live" indicators, secundaire acties, manager-UI
- Gradient text op headlines: `pink → cyan` 135°
- Font: **Space Grotesk** (variable, 400/500/600/700)
- Hoge contrast, generous touch targets (kids' vingers)
- Animations via **framer-motion**: hearts pop-up bij like, trend banner slide-in, score tick-up, confetti bij viral

### Challenge-types (vervangen oude foto/text/multiple_choice/arrival)
Dezelfde 4 onderliggende task-types, maar geframed als trends:
- **Dance Drop** (photo/video) — 10s dans bij herkenbaar gebouw
- **Bakery Aesthetic** (photo) — foodie-style shot bij bakker
- **Hot Take** (video) — 15s vlog je mening
- **Aesthetic Photo** (photo)
- **POV** (photo/video) — ongebruikelijk perspectief
- **Squad Interview** (video) — 30s elkaar interviewen
- **Local Hero** (video) — Erp-feit ophalen bij voorbijganger
- **Statue Pose** (photo) — met monument/kunstwerk
- **Echo Check** (video) — plek met echo vinden
- **Hond-spotting** (photo serie) — 3 honden onderweg
- **Glow-up Snack** (photo) — afternoon-snack reel
- **Nature Reel** (video) — bloeiend/groens
- **Hashtag** (text) — verzin er een voor het feest
- **Arrival** (auto, GPS) — automatische like-bonus bij aankomen

### Juice-laag (te implementeren)
- **Confetti + hartjes** bij goedgekeurde post (framer-motion + canvas-confetti? of pure CSS)
- **Score tick-up** animatie bij likes binnen
- **Trend banner slide-in** vanaf bovenkant bij nieuwe trend
- **Achievement-badges**: *First Drop*, *Viral* (>50 likes op één post), *100 Likes Club*, *Squad Goals* (alle squads vermeld), *Explorer* (alle locaties), *Speedrun* (eerste bij 5 locaties)
- **Squad-profiel** bij start: kies squad-naam uit lijst, kies kleur, maak channel art (= teamfoto)
- **Trends dropping** halverwege — ouders triggeren live via admin
- **Eindstand** als social wrap-up — "@TeamRood eindigde met 247 likes en 4 viral moments"

### Squad-namen — voorgesteld
Kinderen kiezen bij start uit een vooraf samengestelde lijst. Voorbeelden (jij + dochter mogen aanpassen):
- Glow Girls · Erp Era · Vibe Squad · Main Character · Soft Pink · Cyber Crew · Sunset Crew · It Girls

---

## 9. Open punten

- [ ] Eindopdracht / finale bij terugkomst op Veghelsedijk 5?
- [ ] Prijsuitreiking-scherm met podium-animatie?
- [ ] PWA push notifications echt nodig of is in-app realtime genoeg? (iOS push = gedoe)
- [ ] Custom subdomain of `vlog-squad-erp.vercel.app`?
- [ ] Sound effects (like-ding, viral-sound, level-up)? Ja/nee
- [ ] Locaties + challenges + squad-namen vooraf invullen

---

## 10. Volgende actie

Apply `supabase/migrations/0001_init.sql` in Supabase Dashboard SQL Editor, vul `.env.local` met anon + service role keys, dan `npm run dev` om te zien hoe de TikTok-pink UI eruitziet.
