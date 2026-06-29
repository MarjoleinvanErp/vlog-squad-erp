# Berichten + Ranking-Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vervang de Ranking-tab op de team-view door een Berichten-tab waarop ouders broadcast-berichten kunnen pushen. Ranking wordt pas onthuld bij "Eindig spel".

**Architecture:** Nieuwe Supabase-tabel `broadcast_messages` (event-scoped, append-only). Ouder verstuurt via server action die ook push-notificaties stuurt. Team-pagina toont chat-log met Realtime-subscription. Een floating "messages-bell" badge (zoals review-bell) toont ongelezen-tellertje uit localStorage. `/team/ranking` redirect naar `/team/messages` zolang `event.state !== "finished"`.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + Realtime), web-push, framer-motion (al aanwezig), TailwindCSS.

**Spec:** `docs/superpowers/specs/2026-06-29-berichten-en-ranking-reveal-design.md`

**Testing note:** Dit project heeft geen test-framework. Verificatie per task gebeurt via `NODE_OPTIONS=--use-system-ca npm run lint` (typecheck via eslint-next + tsc inbegrepen in `npm run build`) en handmatige browser-checks. Frequente kleine commits, één per task.

---

## File Structure

**Create:**
- `supabase/migrations/0007_broadcast_messages.sql` — schema + realtime publication
- `src/app/ouder/dashboard/broadcast-actions.ts` — `sendBroadcastAction` server action
- `src/app/ouder/dashboard/broadcast-section.tsx` — client component (form + log)
- `src/app/team/messages/page.tsx` — server component
- `src/app/team/messages/messages-stream.tsx` — client component met Realtime subscription
- `src/app/team/messages-bell.tsx` — floating badge component

**Modify:**
- `src/lib/supabase/types.ts` — voeg `BroadcastMessageRow` toe
- `src/app/team/bottom-nav.tsx` — `ranking` tab → `messages` tab
- `src/app/team/layout.tsx` — mount `MessagesBell`
- `src/app/team/ranking/page.tsx` — redirect als event !== finished + bottom-nav `active="messages"`
- `src/app/ouder/dashboard/page.tsx` — render `BroadcastSection`
- `src/app/ouder/dashboard/announce-actions.ts` — `finishEventAction` push-tekst + url → ranking-reveal

---

## Task 1: Migratie — broadcast_messages tabel

**Files:**
- Create: `supabase/migrations/0007_broadcast_messages.sql`

- [ ] **Step 1: Schrijf migratie**

```sql
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
-- Geen anon policies — alleen service role mag lezen/schrijven.

-- Realtime publication: squads abonneren live op nieuwe berichten.
do $$
begin
  begin
    alter publication supabase_realtime add table public.broadcast_messages;
  exception when duplicate_object then null;
  end;
end $$;
```

- [ ] **Step 2: Pas migratie toe op Supabase**

Run de migratie via het Supabase dashboard SQL-editor (project-ID staat in `memory/reference_supabase.md`) of via `supabase db push` als de CLI gekoppeld is. Verifieer in dashboard → Database → Tables dat `broadcast_messages` bestaat en in Realtime → Channels onder publication `supabase_realtime` staat.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0007_broadcast_messages.sql
git commit -m "feat(db): broadcast_messages tabel + realtime publication"
```

---

## Task 2: TypeScript type voor BroadcastMessage

**Files:**
- Modify: `src/lib/supabase/types.ts`

- [ ] **Step 1: Voeg interface toe onderaan het bestand**

```typescript
export interface BroadcastMessageRow {
  id: string;
  event_id: string;
  body: string;
  created_at: string;
}
```

- [ ] **Step 2: Verifieer typecheck**

```bash
NODE_OPTIONS=--use-system-ca npm run lint
```
Expected: PASS (geen errors over types).

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/types.ts
git commit -m "feat(types): BroadcastMessageRow"
```

---

## Task 3: Server action `sendBroadcastAction`

**Files:**
- Create: `src/app/ouder/dashboard/broadcast-actions.ts`

- [ ] **Step 1: Schrijf de server action**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth/session";
import { sendPush } from "@/lib/push";

export type BroadcastState = { ok?: boolean; error?: string | null };

export async function sendBroadcastAction(
  _prev: BroadcastState,
  formData: FormData
): Promise<BroadcastState> {
  const eventId = await getAdminSession();
  if (!eventId) return { error: "Niet ingelogd" };

  const body = String(formData.get("body") ?? "").trim().slice(0, 280);
  if (!body) return { error: "Bericht is leeg" };

  const sb = supabaseService();
  const { error } = await sb
    .from("broadcast_messages")
    .insert({ event_id: eventId, body });
  if (error) return { error: error.message };

  // Push best-effort naar alle squads van dit event.
  try {
    const { data: teams } = await sb
      .from("teams")
      .select("id")
      .eq("event_id", eventId);
    const teamIds = ((teams ?? []) as Array<{ id: string }>).map((t) => t.id);
    if (teamIds.length > 0) {
      const { data: subs } = await sb
        .from("push_subscriptions")
        .select("endpoint, subscription")
        .in("team_id", teamIds);
      const result = await sendPush(
        (subs ?? []) as Array<{ endpoint: string; subscription: never }>,
        {
          title: "📣 Bericht van de ouders",
          body: body.slice(0, 120),
          url: "/team/messages",
          tag: "broadcast",
        } as never
      );
      if (result.expired.length > 0) {
        await sb
          .from("push_subscriptions")
          .delete()
          .in("endpoint", result.expired);
      }
    }
  } catch {
    // push best-effort
  }

  revalidatePath("/ouder/dashboard");
  revalidatePath("/team/messages");
  return { ok: true };
}
```

- [ ] **Step 2: Verifieer typecheck**

```bash
NODE_OPTIONS=--use-system-ca npm run lint
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/ouder/dashboard/broadcast-actions.ts
git commit -m "feat(ouder): sendBroadcastAction server action"
```

---

## Task 4: Ouder-dashboard `BroadcastSection`

**Files:**
- Create: `src/app/ouder/dashboard/broadcast-section.tsx`
- Modify: `src/app/ouder/dashboard/page.tsx`

- [ ] **Step 1: Schrijf de client component**

```typescript
"use client";

import { useActionState, useRef, useState } from "react";
import {
  sendBroadcastAction,
  type BroadcastState,
} from "./broadcast-actions";

const initial: BroadcastState = { ok: false, error: null };

export type RecentBroadcast = {
  id: string;
  body: string;
  created_at: string;
};

export function BroadcastSection({
  recent,
}: {
  recent: RecentBroadcast[];
}) {
  const [state, formAction, pending] = useActionState(
    sendBroadcastAction,
    initial
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [body, setBody] = useState("");

  if (state.ok && formRef.current) {
    formRef.current.reset();
    if (body !== "") setBody("");
  }

  return (
    <section className="rounded-3xl border border-border bg-bg-card p-5">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-cyan">
        Bericht aan squads
      </h2>
      <form ref={formRef} action={formAction} className="mt-3 flex flex-col gap-3">
        <label className="flex flex-col gap-2">
          <textarea
            name="body"
            rows={3}
            maxLength={280}
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="bv. Vergeet niet om een groepsfoto bij De Brink te maken!"
            className="rounded-xl border-2 border-border-strong bg-bg-elev px-4 py-3 text-fg placeholder:text-fg-dim focus:border-pink focus:outline-none"
          />
          <span className="self-end text-[10px] uppercase tracking-widest text-fg-muted">
            {body.length}/280
          </span>
        </label>
        {state.error && (
          <p className="rounded-xl border border-pink/30 bg-pink/10 px-4 py-3 text-sm text-pink-soft">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || body.trim().length === 0}
          className="self-end rounded-xl bg-pink px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {pending ? "Versturen..." : "Verstuur"}
        </button>
      </form>

      {recent.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-[10px] uppercase tracking-widest text-fg-muted">
            Laatste verstuurd
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {recent.map((m) => (
              <li
                key={m.id}
                className="rounded-xl border border-border bg-bg-elev px-3 py-2"
              >
                <p className="text-xs text-fg-muted">
                  {new Date(m.created_at).toLocaleTimeString("nl-NL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-sm">{m.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Mount in dashboard-pagina**

In `src/app/ouder/dashboard/page.tsx`:

1. Voeg import bovenaan toe:
```typescript
import { BroadcastSection, type RecentBroadcast } from "./broadcast-section";
```

2. Voeg extra query toe in het bestaande `Promise.all` blok (na de `positionsRaw` query):
```typescript
sb
  .from("broadcast_messages")
  .select("id, body, created_at")
  .eq("event_id", eventId)
  .order("created_at", { ascending: false })
  .limit(20),
```

Pas de destructuring aan om `{ data: broadcastsRaw }` op te vangen.

3. Hieronder, na de bestaande type-casts, voeg toe:
```typescript
const recentBroadcasts = (broadcastsRaw ?? []) as RecentBroadcast[];
```

4. Render in JSX, direct vóór de "Live ranking" sectie:
```tsx
<BroadcastSection recent={recentBroadcasts} />
```

- [ ] **Step 3: Verifieer typecheck**

```bash
NODE_OPTIONS=--use-system-ca npm run lint
```
Expected: PASS.

- [ ] **Step 4: Handmatige browsercheck**

Start dev-server:
```bash
NODE_OPTIONS=--use-system-ca npm run dev
```
Login als ouder via /ouder, ga naar /ouder/dashboard. Verifieer dat de "Bericht aan squads" sectie zichtbaar is met textarea, char-counter, en disabled verstuur-knop bij leeg veld. Type een testbericht, klik Verstuur, controleer dat het in de "Laatste verstuurd" lijst verschijnt na refresh.

- [ ] **Step 5: Commit**

```bash
git add src/app/ouder/dashboard/broadcast-section.tsx src/app/ouder/dashboard/page.tsx
git commit -m "feat(ouder): BroadcastSection met form en recent-log"
```

---

## Task 5: Bottom-nav — ranking → messages

**Files:**
- Modify: `src/app/team/bottom-nav.tsx`

- [ ] **Step 1: Vervang ranking-item door messages**

In `src/app/team/bottom-nav.tsx`, regel 5-12, wijzig:

```typescript
export type TeamTab = "map" | "quests" | "feed" | "messages";

const ITEMS: { key: TeamTab; label: string; href: string }[] = [
  { key: "map", label: "Map", href: "/team/map" },
  { key: "quests", label: "Quests", href: "/team/quests" },
  { key: "feed", label: "Feed", href: "/team/feed" },
  { key: "messages", label: "Berichten", href: "/team/messages" },
];
```

- [ ] **Step 2: Update referenties in bestaande pagina's**

Zoek in `src/app/team/` naar `active="ranking"`:

```bash
grep -rn 'active="ranking"' C:/speurtocht/src/app/team/
```

Verwacht 1 match in `src/app/team/ranking/page.tsx`. Wijzig die naar `active="messages"` (de tab heet zo, en de ranking-pagina is een sub-view die alleen na finished bereikbaar is).

- [ ] **Step 3: Verifieer typecheck**

```bash
NODE_OPTIONS=--use-system-ca npm run lint
```
Expected: PASS (TeamTab type is nu strikt, eventuele typo's komen eruit).

- [ ] **Step 4: Commit**

```bash
git add src/app/team/bottom-nav.tsx src/app/team/ranking/page.tsx
git commit -m "feat(team): ranking-tab vervangen door berichten-tab"
```

---

## Task 6: Pagina `/team/messages`

**Files:**
- Create: `src/app/team/messages/page.tsx`
- Create: `src/app/team/messages/messages-stream.tsx`

- [ ] **Step 1: Server component**

`src/app/team/messages/page.tsx`:

```typescript
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTeamSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import { TeamBottomNav } from "../bottom-nav";
import { MessagesStream, type MessageRow } from "./messages-stream";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const teamId = await getTeamSession();
  if (!teamId) redirect("/team");

  const sb = supabaseService();
  const { data: team } = await sb
    .from("teams")
    .select("event_id")
    .eq("id", teamId)
    .maybeSingle();
  if (!team) redirect("/team");
  const eventId = (team as { event_id: string }).event_id;

  const { data: eventRow } = await sb
    .from("events")
    .select("state")
    .eq("id", eventId)
    .maybeSingle();
  const isFinished = (eventRow as { state?: string } | null)?.state === "finished";

  const { data: rows } = await sb
    .from("broadcast_messages")
    .select("id, body, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  const messages = (rows ?? []) as MessageRow[];

  return (
    <main
      className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-6 pt-[calc(1.5rem+var(--st))]"
      style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}
    >
      <Link href="/team/map" className="text-sm text-fg-muted hover:text-fg">
        ← map
      </Link>
      <h1 className="text-3xl font-bold">
        <span className="text-gradient">Berichten</span>
      </h1>

      {isFinished && (
        <Link
          href="/team/ranking"
          className="rounded-2xl border-2 border-pink bg-pink/10 px-5 py-4 text-center font-bold text-pink glow-pink"
        >
          🏆 Bekijk de eindstand →
        </Link>
      )}

      <MessagesStream eventId={eventId} teamId={teamId} initial={messages} />

      <TeamBottomNav active="messages" fixed />
    </main>
  );
}
```

- [ ] **Step 2: Client streaming component**

`src/app/team/messages/messages-stream.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export type MessageRow = {
  id: string;
  body: string;
  created_at: string;
};

const SEEN_KEY = (teamId: string) => `speur:messages-seen-at:${teamId}`;

export function MessagesStream({
  eventId,
  teamId,
  initial,
}: {
  eventId: string;
  teamId: string;
  initial: MessageRow[];
}) {
  const [messages, setMessages] = useState<MessageRow[]>(initial);

  useEffect(() => {
    setMessages(initial);
  }, [initial]);

  // Markeer alle huidige berichten als gezien zodra de pagina openstaat.
  useEffect(() => {
    localStorage.setItem(SEEN_KEY(teamId), new Date().toISOString());
  }, [teamId, messages.length]);

  useEffect(() => {
    const sb = supabaseBrowser();
    const channel = sb
      .channel(`broadcast-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "broadcast_messages",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const row = payload.new as MessageRow | null;
          if (!row) return;
          setMessages((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [row, ...prev]
          );
        }
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [eventId]);

  if (messages.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-bg-card px-5 py-8 text-center text-fg-muted">
        Nog geen berichten van de ouders.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {messages.map((m) => (
        <li
          key={m.id}
          className="rounded-2xl border border-border bg-bg-card p-4"
        >
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-cyan/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-cyan">
              ouders
            </span>
            <span className="text-[10px] uppercase tracking-widest text-fg-muted">
              {new Date(m.created_at).toLocaleTimeString("nl-NL", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <p className="mt-2 whitespace-pre-line text-base">{m.body}</p>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 3: Verifieer typecheck**

```bash
NODE_OPTIONS=--use-system-ca npm run lint
```
Expected: PASS.

- [ ] **Step 4: Handmatige browsercheck**

In dev-server: login als team via /team, navigeer naar /team/messages. Zonder berichten → "Nog geen berichten" placeholder. Verstuur vanuit /ouder/dashboard een testbericht → zonder paginarefresh moet het bovenaan verschijnen via de Realtime subscription.

- [ ] **Step 5: Commit**

```bash
git add src/app/team/messages/
git commit -m "feat(team): /team/messages pagina met realtime chat-log"
```

---

## Task 7: MessagesBell badge

**Files:**
- Create: `src/app/team/messages-bell.tsx`
- Modify: `src/app/team/layout.tsx`

- [ ] **Step 1: Schrijf bell-component (variant van ReviewBell)**

`src/app/team/messages-bell.tsx`:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

const SEEN_KEY = (teamId: string) => `speur:messages-seen-at:${teamId}`;
const EPOCH = "1970-01-01T00:00:00.000Z";

export function MessagesBell({
  teamId,
  eventId,
}: {
  teamId: string;
  eventId: string;
}) {
  const pathname = usePathname();
  const [seenAt, setSeenAt] = useState<string>(EPOCH);
  const [count, setCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSeenAt(localStorage.getItem(SEEN_KEY(teamId)) ?? EPOCH);
    setHydrated(true);
  }, [teamId]);

  useEffect(() => {
    if (!hydrated) return;
    if (pathname !== "/team/messages") return;
    const now = new Date().toISOString();
    localStorage.setItem(SEEN_KEY(teamId), now);
    setSeenAt(now);
  }, [pathname, teamId, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const sb = supabaseBrowser();
    let cancelled = false;

    async function loadCount() {
      const { count: n } = await sb
        .from("broadcast_messages")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .gt("created_at", seenAt);
      if (!cancelled) setCount(n ?? 0);
    }
    loadCount();

    const channel = sb
      .channel(`messagesbell-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "broadcast_messages",
          filter: `event_id=eq.${eventId}`,
        },
        () => loadCount()
      )
      .subscribe();
    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, [eventId, seenAt, hydrated]);

  function handleClick() {
    const now = new Date().toISOString();
    localStorage.setItem(SEEN_KEY(teamId), now);
    setSeenAt(now);
  }

  if (!hydrated || count === 0 || pathname === "/team/messages") return null;

  return (
    <Link
      href="/team/messages"
      onClick={handleClick}
      aria-label={`${count} ${count === 1 ? "nieuw bericht" : "nieuwe berichten"}`}
      className="fixed left-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-cyan/60 bg-bg-card/90 text-cyan shadow-[0_0_14px_rgba(37,244,238,0.45)] backdrop-blur active:scale-95"
      style={{ top: "calc(0.5rem + env(safe-area-inset-top))" }}
    >
      <MessageIcon />
      <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-cyan px-1 text-[10px] font-extrabold leading-none text-bg">
        {count > 99 ? "99+" : count}
      </span>
    </Link>
  );
}

function MessageIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
```

Let op: dit komt links te staan (vs ReviewBell die rechts staat), zodat ze niet overlappen.

- [ ] **Step 2: Mount in team-layout**

In `src/app/team/layout.tsx`:

1. Voeg import toe naast de andere team-imports:
```typescript
import { MessagesBell } from "./messages-bell";
```

2. Onthoud `eventId` uit de bestaande layout-query (`teamData.event_id`). Die wordt al opgehaald maar niet doorgegeven — sla op in een variabele scoped buiten het if-blok:

Bovenaan de functie, naast `let eventStatus`:
```typescript
let eventIdForBell: string | null = null;
```

In het bestaande `if (teamData) { ... }` blok, direct na het bepalen van `eventId`:
```typescript
eventIdForBell = eventId;
```

3. Render in de JSX naast de andere mounted children (naast `ReviewBell`):
```tsx
{teamId && eventIdForBell && (
  <MessagesBell teamId={teamId} eventId={eventIdForBell} />
)}
```

- [ ] **Step 3: Verifieer typecheck**

```bash
NODE_OPTIONS=--use-system-ca npm run lint
```
Expected: PASS.

- [ ] **Step 4: Handmatige browsercheck**

In dev-server: ga met team-account naar /team/map (niet messages). Verstuur vanuit /ouder/dashboard een bericht. De linker bell met cyan badge "1" moet linksboven verschijnen. Klik → naar /team/messages, bell verdwijnt en blijft weg.

- [ ] **Step 5: Commit**

```bash
git add src/app/team/messages-bell.tsx src/app/team/layout.tsx
git commit -m "feat(team): floating messages-bell badge"
```

---

## Task 8: Ranking-pagina alleen na finished

**Files:**
- Modify: `src/app/team/ranking/page.tsx`

- [ ] **Step 1: Voeg event.state check toe**

In `src/app/team/ranking/page.tsx`, na het ophalen van `myTeam` en vóór de teams-query, voeg toe:

```typescript
const { data: eventRow } = await sb
  .from("events")
  .select("state")
  .eq("id", eventId)
  .maybeSingle();
const isFinished = (eventRow as { state?: string } | null)?.state === "finished";
if (!isFinished) redirect("/team/messages");
```

- [ ] **Step 2: Verifieer typecheck**

```bash
NODE_OPTIONS=--use-system-ca npm run lint
```
Expected: PASS.

- [ ] **Step 3: Handmatige browsercheck**

In dev-server, met running event: directe navigatie naar /team/ranking moet redirecten naar /team/messages. Eerst event op "finished" zetten via /ouder/dashboard → "Eindig spel" → daarna /team/ranking moet wél de eindstand laten zien.

- [ ] **Step 4: Commit**

```bash
git add src/app/team/ranking/page.tsx
git commit -m "feat(team): ranking-pagina alleen toegankelijk na finished"
```

---

## Task 9: Ranking-reveal push-tekst bij finish

**Files:**
- Modify: `src/app/ouder/dashboard/announce-actions.ts`

- [ ] **Step 1: Pas push-payload aan in `finishEventAction`**

In `src/app/ouder/dashboard/announce-actions.ts`, in `finishEventAction`, vervang het `sendPush(...)` call-object (regel 114-119):

```typescript
{
  title: "🏆 De eindstand is binnen!",
  body: "Bekijk de ranking en alle posts van alle squads.",
  url: "/team/ranking",
  tag: "event-finished",
}
```

(De `as never` cast laten staan zoals in bestaande code.)

- [ ] **Step 2: Update tekst in `FinishModal` en `FinishedView`**

In `src/app/ouder/dashboard/announce-section.tsx`:

- `FinishModal` (rond regel 229-232): vervang de uitleg-paragraaf door:
```tsx
<p className="mt-2 text-sm text-fg-muted">
  Squads kunnen niets meer indienen. De eindstand wordt nu zichtbaar op{" "}
  <span className="font-bold text-pink">/team/ranking</span>, en de feed
  opent zodat ze elkaars posts kunnen zien. Iedereen krijgt een push.
</p>
```

- `FinishedView` (rond regel 338-342): vervang de paragraaf door:
```tsx
<p className="text-sm">
  Het spel is afgelopen. Squads zien de eindstand op{" "}
  <span className="font-bold text-pink">/team/ranking</span> en elkaars
  approved posts op <span className="font-bold text-pink">/team/feed</span>.
</p>
```

- [ ] **Step 3: Verifieer typecheck**

```bash
NODE_OPTIONS=--use-system-ca npm run lint
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/ouder/dashboard/announce-actions.ts src/app/ouder/dashboard/announce-section.tsx
git commit -m "feat(ouder): finish stuurt push met ranking-reveal link"
```

---

## Task 10: Eindcheck — lint + build + handmatige flow

**Files:** (geen wijzigingen, alleen verificatie)

- [ ] **Step 1: Lint**

```bash
NODE_OPTIONS=--use-system-ca npm run lint
```
Expected: PASS.

- [ ] **Step 2: Productie-build (inclusief typecheck)**

```bash
NODE_OPTIONS=--use-system-ca npm run build
```
Expected: succesvolle build, geen TypeScript-errors.

- [ ] **Step 3: End-to-end handmatige flow**

In dev-server:
1. Login als ouder + login als team in tweede browser/incognito.
2. Team-side: bottom-nav toont Map / Quests / Feed / **Berichten** (Ranking weg).
3. Team-side: directe URL `/team/ranking` redirect naar `/team/messages`.
4. Ouder-side: type bericht in BroadcastSection, verstuur.
5. Team-side: zonder refresh verschijnt bericht bovenaan op /team/messages; op andere team-pagina's verschijnt linker messages-bell met badge.
6. Team-side: klik op bell of Berichten-tab → bericht zichtbaar, bell weg.
7. Ouder-side: klik "Eindig spel".
8. Team-side: krijgt push (indien browser het toestaat) "🏆 De eindstand is binnen!", banner verschijnt boven /team/messages "Bekijk de eindstand →", en /team/ranking toont nu de live ranking.
9. Ouder-side: klik "Heropen spel" → /team/ranking redirect weer naar /team/messages.

- [ ] **Step 4: Geen extra commit nodig** — alle wijzigingen zijn al per task gecommit. Indien er bugs uit de end-to-end check kwamen: fix + commit als losse task ná dit plan.
