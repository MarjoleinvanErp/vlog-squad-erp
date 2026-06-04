import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import { LiveRefresh } from "./live-refresh";

const TYPE_LABEL = {
  photo: "Drop",
  text: "Hot Take",
  multiple_choice: "Quiz",
  arrival: "Arrival",
} as const;

const TYPE_COLOR = {
  photo: "text-pink",
  text: "text-cyan",
  multiple_choice: "text-yellow-400",
  arrival: "text-green-400",
} as const;

export default async function OuderDashboardPage() {
  const eventId = await getAdminSession();
  if (!eventId) redirect("/ouder");

  const sb = supabaseService();

  const { data: eventData } = await sb
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();
  if (!eventData) redirect("/ouder");
  const event = eventData as { name: string };

  const { data: teamsData } = await sb
    .from("teams")
    .select("id, name, color, team_photo_url")
    .eq("event_id", eventId);
  const teams = (teamsData ?? []) as Array<{
    id: string;
    name: string;
    color: string;
    team_photo_url: string | null;
  }>;
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const teamIds = teams.map((t) => t.id);

  const [{ data: pendingRaw }, { data: subsForScore }, { data: visitsForScore }] =
    await Promise.all([
      teamIds.length > 0
        ? sb
            .from("submissions")
            .select(
              "id, team_id, task_id, photo_url, text_answer, submitted_at, status, tasks(title, type, max_points)"
            )
            .eq("status", "pending")
            .in("team_id", teamIds)
            .order("submitted_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      teamIds.length > 0
        ? sb
            .from("submissions")
            .select("team_id, awarded_points")
            .eq("status", "approved")
            .in("team_id", teamIds)
        : Promise.resolve({ data: [] }),
      teamIds.length > 0
        ? sb
            .from("location_visits")
            .select("team_id, bonus_awarded")
            .in("team_id", teamIds)
        : Promise.resolve({ data: [] }),
    ]);

  type PendingRow = {
    id: string;
    team_id: string;
    task_id: string;
    photo_url: string | null;
    text_answer: string | null;
    submitted_at: string;
    tasks:
      | { title: string; type: keyof typeof TYPE_LABEL; max_points: number }
      | { title: string; type: keyof typeof TYPE_LABEL; max_points: number }[]
      | null;
  };

  const rawPending = (pendingRaw ?? []) as unknown as PendingRow[];
  const pending = rawPending.map((r) => ({
    ...r,
    task: Array.isArray(r.tasks) ? r.tasks[0] ?? null : r.tasks,
  }));

  const likesByTeam = new Map<string, number>();
  for (const s of (subsForScore ?? []) as Array<{ team_id: string; awarded_points: number | null }>) {
    likesByTeam.set(
      s.team_id,
      (likesByTeam.get(s.team_id) ?? 0) + (s.awarded_points ?? 0)
    );
  }
  for (const v of (visitsForScore ?? []) as Array<{ team_id: string; bonus_awarded: number }>) {
    likesByTeam.set(
      v.team_id,
      (likesByTeam.get(v.team_id) ?? 0) + v.bonus_awarded
    );
  }

  const ranking = teams
    .map((t) => ({ ...t, likes: likesByTeam.get(t.id) ?? 0 }))
    .sort((a, b) => b.likes - a.likes);

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-6 pt-8 pb-10">
      <LiveRefresh />

      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-cyan">
            manager
          </p>
          <h1 className="text-2xl font-bold">{event.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/ouder/map"
            className="rounded-full border border-border-strong px-4 py-2 text-sm hover:border-cyan hover:text-cyan"
          >
            Live map
          </Link>
          <Link
            href="/admin"
            className="rounded-full border border-border-strong px-4 py-2 text-sm hover:border-cyan hover:text-cyan"
          >
            Admin
          </Link>
        </div>
      </header>

      <section className="rounded-3xl border border-border bg-bg-card p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
            Wachten op review
          </h2>
          <span className="text-3xl font-bold text-pink">{pending.length}</span>
        </div>
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-fg-muted">
            Geen posts in de wachtrij. Live.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {pending.map((p) => {
              const t = teamById.get(p.team_id);
              if (!t || !p.task) return null;
              return (
                <li key={p.id}>
                  <Link
                    href={`/ouder/submission/${p.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-border-strong bg-bg-elev p-3 transition hover:border-pink"
                  >
                    {p.photo_url ? (
                      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl">
                        <Image
                          src={p.photo_url}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-bg-card text-xs text-fg-dim">
                        text
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="truncate text-sm font-bold"
                          style={{ color: t.color }}
                        >
                          @{t.name}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-widest ${TYPE_COLOR[p.task.type]}`}
                        >
                          · {TYPE_LABEL[p.task.type]}
                        </span>
                      </div>
                      <p className="truncate text-sm">{p.task.title}</p>
                    </div>
                    <span className="text-pink">→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-bg-card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
          Live ranking
        </h2>
        {ranking.length === 0 ? (
          <p className="mt-3 text-sm text-fg-muted">Geen squads.</p>
        ) : (
          <ol className="mt-4 flex flex-col gap-2">
            {ranking.map((s, i) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-bg-elev p-3"
              >
                <span className="w-5 text-center text-sm font-bold text-fg-muted">
                  {i + 1}
                </span>
                {s.team_photo_url ? (
                  <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={s.team_photo_url}
                      alt=""
                      fill
                      sizes="36px"
                      className="object-cover"
                      style={{
                        outline: `2px solid ${s.color}`,
                        outlineOffset: 1,
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className="h-9 w-9 flex-shrink-0 rounded-full"
                    style={{ background: s.color }}
                  />
                )}
                <span
                  className="min-w-0 flex-1 truncate text-sm font-bold"
                  style={{ color: s.color }}
                >
                  @{s.name}
                </span>
                <span className="text-base font-bold text-pink">{s.likes}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
