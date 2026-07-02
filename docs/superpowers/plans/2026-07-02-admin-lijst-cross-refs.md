# Admin Lijst Cross-Refs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In de admin lijst-pagina's direct zichtbaar maken welke challenges bij welke locaties horen (en welke locaties leeg zijn), zonder ieder item apart te openen.

**Architecture:** Twee onafhankelijke server-component wijzigingen. Voor `/admin/tasks` een puur presentatiewijziging (bestaande data). Voor `/admin/locations` één extra Supabase query + client-side groepering.

**Tech Stack:** Next.js 16 App Router, TailwindCSS (bestaande dark/pink/cyan theme), Supabase service-role reads.

**Spec:** `docs/superpowers/specs/2026-07-02-admin-lijst-cross-refs-design.md`

## Global Constraints

- Geen schemawijzigingen — bestaande `tasks.location_id` en `locations` tabellen worden alleen gelezen.
- Baseline lint = 108 problems (13 errors, 95 warnings). Iedere task moet met exact deze telling eindigen.
- Verificatie via `NODE_OPTIONS=--use-system-ca npm run lint` — corporate-network SSL vereist deze prefix.
- Geen test-framework in dit project; kwaliteitspoortjes zijn lint + `npm run build` + korte handmatige browsercheck op `/admin/locations` en `/admin/tasks`.
- Behoud bestaande TailwindCSS-tokens (`bg-bg-card`, `text-fg-muted`, `text-pink`, `text-cyan`, `bg-cyan/10`, `border-cyan/40`) — geen nieuwe kleuren introduceren.
- Icons: gebruik emoji-glyphs (`📍`, `🌐`, `⚠`) — geen externe icon-library.

---

## File Structure

**Modify:**
- `src/app/admin/tasks/page.tsx` — vervang dim-inline locatie-vermelding door prominent pill-badge
- `src/app/admin/locations/page.tsx` — voeg extra tasks-query toe + nieuwe regel challenge-summary per locatie

Beide bestanden zijn zelfstandige server components, elk onder de 200 regels. Geen extra bestanden nodig.

---

## Task 1: Locatie-pill op `/admin/tasks`

**Files:**
- Modify: `src/app/admin/tasks/page.tsx`

**Interfaces:**
- Consumes: bestaande `TaskRow` type (heeft `location_id: string | null`), bestaande `locNameById: Map<string, string>` in de server component
- Produces: geen nieuwe exports — presentatie-wijziging binnen de bestaande component

- [ ] **Step 1: Vervang de dim-inline locatie-vermelding door een pill-badge**

Open `C:/speurtocht/src/app/admin/tasks/page.tsx`. Zoek dit blok (rond regel 113-117):

```tsx
{t.location_id && (
  <span className="text-xs text-fg-dim">
    · {locNameById.get(t.location_id) ?? "?"}
  </span>
)}
```

Vervang het door:

```tsx
{t.location_id ? (
  <span className="rounded-full border border-cyan/40 bg-cyan/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-cyan">
    📍 {locNameById.get(t.location_id) ?? "?"}
  </span>
) : (
  <span className="rounded-full border border-border bg-bg-elev px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-fg-muted">
    🌐 anywhere
  </span>
)}
```

Belangrijk: dit pill-blok moet in de bestaande `<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">` regel blijven, direct ná het type-label `<span>` (rond regel 100-103) en vóór de `· {t.max_points} likes` en media-hint spans.

Verplaats het pill-blok naar direct na de type-label span. De uiteindelijke volgorde binnen de flex-container wordt:

1. type-label (`Drop` / `Video` / `Hot Take` / `Quiz` / `Arrival`)
2. locatie-pill (`📍 <naam>` of `🌐 anywhere`) — NIEUWE positie
3. `· {t.max_points} likes`
4. optionele media-hint (`· {mediaHint(t)}`)

Verwijder de `.` scheidingstekens vóór het pill-blok — de pill staat op zichzelf en heeft geen `·` nodig.

- [ ] **Step 2: Lint**

Run:
```bash
cd C:/speurtocht && NODE_OPTIONS=--use-system-ca npm run lint 2>&1 | tail -5
```
Expected: 108 problems (13 errors, 95 warnings) — geen regressies.

- [ ] **Step 3: Handmatige browsercheck**

Start dev-server:
```bash
NODE_OPTIONS=--use-system-ca npm run dev
```

Log in als ouder (via `/ouder`), ga naar `/admin/tasks`. Verifieer:
- Challenges met een gekoppelde locatie tonen een cyan pill `📍 <naam>` direct na het type-label.
- Anywhere quests (zonder `location_id`) tonen een gedempte pill `🌐 anywhere`.
- De overige metadata (points, media-hint) blijft zichtbaar en leesbaar.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/tasks/page.tsx
git commit -m "feat(admin): locatie-pill in challenges lijst"
```

---

## Task 2: Challenge-summary op `/admin/locations`

**Files:**
- Modify: `src/app/admin/locations/page.tsx`

**Interfaces:**
- Consumes: bestaande `Loc` type, bestaande `supabaseService()` en `getAdminSession()` helpers, `TaskType` union van de admin/tasks/page.tsx (dupliceer inline — geen import om cyclische bestanden te vermijden)
- Produces: geen nieuwe exports

- [ ] **Step 1: Breid het `Loc` type uit met een `taskSummary` veld**

Voeg boven de bestaande `Loc` type een nieuwe helper-type en pas `Loc` niet aan — we gebruiken twee getypeerde stromen. Zoek regel 9-17:

```typescript
type Loc = {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  radius_meters: number;
  arrival_points: number;
};
```

Voeg BOVEN deze `Loc` type toe:

```typescript
type TaskType =
  | "photo"
  | "video"
  | "text"
  | "multiple_choice"
  | "arrival";

const TYPE_LABEL: Record<TaskType, string> = {
  photo: "Drop",
  video: "Video",
  text: "Hot Take",
  multiple_choice: "Quiz",
  arrival: "Arrival",
};

// Canonieke volgorde voor het samenvatten van types per locatie
const TYPE_ORDER: TaskType[] = [
  "photo",
  "video",
  "text",
  "multiple_choice",
  "arrival",
];
```

- [ ] **Step 2: Voeg de tasks-query toe en groepeer client-side**

Zoek deze bestaande query (rond regel 23-29):

```typescript
const sb = supabaseService();
const { data } = await sb
  .from("locations")
  .select("*")
  .eq("event_id", eventId)
  .order("sort_order", { ascending: true })
  .order("created_at", { ascending: true });

const locations = (data ?? []) as Loc[];
```

Vervang door:

```typescript
const sb = supabaseService();
const [{ data: locsData }, { data: tasksData }] = await Promise.all([
  sb
    .from("locations")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true }),
  sb
    .from("tasks")
    .select("id, location_id, type")
    .eq("event_id", eventId),
]);

const locations = (locsData ?? []) as Loc[];
const tasks = (tasksData ?? []) as Array<{
  id: string;
  location_id: string | null;
  type: TaskType;
}>;

// Groepeer types per location_id, dedupe
const typesByLocation = new Map<string, Set<TaskType>>();
const countByLocation = new Map<string, number>();
for (const t of tasks) {
  if (!t.location_id) continue;
  countByLocation.set(
    t.location_id,
    (countByLocation.get(t.location_id) ?? 0) + 1
  );
  const set = typesByLocation.get(t.location_id) ?? new Set<TaskType>();
  set.add(t.type);
  typesByLocation.set(t.location_id, set);
}
```

- [ ] **Step 3: Render de challenge-summary regel per locatie**

Zoek dit blok binnen de `locations.map` (rond regel 47-61):

```tsx
<Link
  href={`/admin/locations/${l.id}`}
  className="min-w-0 flex-1 rounded-lg px-2 py-1 -mx-2 transition hover:bg-bg-elev"
>
  <p className="font-bold">{l.name}</p>
  <p className="font-mono text-xs text-fg-muted">
    {l.lat.toFixed(5)}, {l.lng.toFixed(5)} · {l.radius_meters}m ·{" "}
    <span className="text-pink">{l.arrival_points} likes</span>
  </p>
  {l.description && (
    <p className="mt-1 truncate text-sm text-fg-dim">
      {l.description}
    </p>
  )}
</Link>
```

Vervang door:

```tsx
<Link
  href={`/admin/locations/${l.id}`}
  className="min-w-0 flex-1 rounded-lg px-2 py-1 -mx-2 transition hover:bg-bg-elev"
>
  <p className="font-bold">{l.name}</p>
  <p className="font-mono text-xs text-fg-muted">
    {l.lat.toFixed(5)}, {l.lng.toFixed(5)} · {l.radius_meters}m ·{" "}
    <span className="text-pink">{l.arrival_points} likes</span>
  </p>
  <ChallengeSummary
    count={countByLocation.get(l.id) ?? 0}
    types={typesByLocation.get(l.id) ?? new Set()}
  />
  {l.description && (
    <p className="mt-1 truncate text-sm text-fg-dim">
      {l.description}
    </p>
  )}
</Link>
```

- [ ] **Step 4: Voeg de `ChallengeSummary` helper-component onderaan het bestand toe**

Voeg helemaal ONDERAAN `src/app/admin/locations/page.tsx` (na de default export functie) toe:

```typescript
function ChallengeSummary({
  count,
  types,
}: {
  count: number;
  types: Set<TaskType>;
}) {
  if (count === 0) {
    return (
      <p className="mt-1 inline-block rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-400">
        ⚠ geen challenges
      </p>
    );
  }
  const orderedLabels = TYPE_ORDER.filter((t) => types.has(t)).map(
    (t) => TYPE_LABEL[t]
  );
  return (
    <p className="mt-1 text-xs text-fg-muted">
      {count} challenge{count === 1 ? "" : "s"} · {orderedLabels.join(", ")}
    </p>
  );
}
```

- [ ] **Step 5: Lint**

Run:
```bash
cd C:/speurtocht && NODE_OPTIONS=--use-system-ca npm run lint 2>&1 | tail -5
```
Expected: 108 problems (13 errors, 95 warnings).

- [ ] **Step 6: Handmatige browsercheck**

In dev-server, ga naar `/admin/locations`. Verifieer:
- Locaties zonder challenges tonen een rode pill `⚠ geen challenges`.
- Locaties met 1+ challenges tonen `<n> challenges · <type1>, <type2>, ...` in fg-muted.
- De type-volgorde volgt: Drop, Video, Hot Take, Quiz, Arrival (bv. 2 Drops + 1 Quiz = `3 challenges · Drop, Quiz`).
- Singular/plural: 1 = "1 challenge", meer = "N challenges".

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/locations/page.tsx
git commit -m "feat(admin): challenge-summary per locatie in drops lijst"
```

---

## Task 3: Eindverificatie

**Files:** (geen wijzigingen, alleen verificatie)

- [ ] **Step 1: Lint**

```bash
cd C:/speurtocht && NODE_OPTIONS=--use-system-ca npm run lint 2>&1 | tail -5
```
Expected: 108 problems (13 errors, 95 warnings).

- [ ] **Step 2: Productie-build (typecheck)**

```bash
cd C:/speurtocht && NODE_OPTIONS=--use-system-ca npm run build 2>&1 | tail -20
```
Expected: succesvolle build, geen TypeScript-errors.

- [ ] **Step 3: End-to-end handmatige flow**

In dev-server:
1. Login als ouder, ga naar `/admin/locations`.
2. Controleer dat iedere locatie in de lijst óf een groene teller met types heeft, óf de rode "geen challenges" waarschuwing.
3. Klik door naar `/admin/tasks`.
4. Controleer dat iedere challenge óf een cyan `📍 <naam>` pill heeft, óf de gedempte `🌐 anywhere` pill.
5. Verifieer dat de tellers en pills correct blijven wanneer je een challenge toevoegt/verwijdert (revalidatePath is al aanwezig via bestaande delete-actions).
