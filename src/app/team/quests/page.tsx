import Link from "next/link";
import { redirect } from "next/navigation";
import { getTeamSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import { TeamBottomNav } from "../bottom-nav";

type Task = {
  id: string;
  location_id: string | null;
  title: string;
  description: string;
  type: "photo" | "video" | "text" | "multiple_choice" | "arrival";
  max_points: number;
  sort_order: number;
};

type Sub = { task_id: string; status: "pending" | "approved" | "rejected"; awarded_points: number | null };

type Loc = { id: string; name: string; icon: string | null; sort_order: number };

const TYPE_LABEL = {
  photo: "Drop",
  video: "Video",
  text: "Hot Take",
  multiple_choice: "Quiz",
  arrival: "Arrival",
} as const;

const TYPE_COLOR = {
  photo: "text-pink",
  video: "text-pink",
  text: "text-cyan",
  multiple_choice: "text-yellow-400",
  arrival: "text-green-400",
} as const;

export default async function QuestsPage() {
  const teamId = await getTeamSession();
  if (!teamId) redirect("/team");

  const sb = supabaseService();
  const { data: myTeam } = await sb
    .from("teams")
    .select("event_id")
    .eq("id", teamId)
    .maybeSingle();
  if (!myTeam) redirect("/team");

  const eventId = (myTeam as { event_id: string }).event_id;

  const [
    { data: tasksData },
    { data: subsData },
    { data: locsData },
    { data: visitsData },
  ] = await Promise.all([
    sb
      .from("tasks")
      .select("id, location_id, title, description, type, max_points, sort_order")
      .eq("event_id", eventId)
      .neq("type", "arrival")
      .order("sort_order", { ascending: true }),
    sb
      .from("submissions")
      .select("task_id, status, awarded_points")
      .eq("team_id", teamId),
    sb
      .from("locations")
      .select("id, name, icon, sort_order")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true }),
    sb
      .from("location_visits")
      .select("location_id")
      .eq("team_id", teamId),
  ]);

  const tasks = (tasksData ?? []) as Task[];
  const subs = (subsData ?? []) as Sub[];
  const locations = (locsData ?? []) as Loc[];
  const subByTask = new Map(subs.map((s) => [s.task_id, s]));
  const visitedLocations = new Set(
    ((visitsData ?? []) as Array<{ location_id: string }>).map(
      (v) => v.location_id
    )
  );

  const anywhere = tasks.filter((t) => t.location_id == null);
  const available = anywhere.filter((t) => !subByTask.has(t.id));
  // Al ingediend: overal-quests én locatie-quests.
  const done = tasks.filter((t) => subByTask.has(t.id));

  // Alleen oppakbare locatie-quests: locatie bezocht en nog niet ingediend.
  const locationGroups = locations
    .filter((loc) => visitedLocations.has(loc.id))
    .map((loc) => ({
      loc,
      tasks: tasks.filter(
        (t) => t.location_id === loc.id && !subByTask.has(t.id)
      ),
    }))
    .filter((g) => g.tasks.length > 0);

  return (
    <main
      className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-6 pt-[calc(1.5rem+var(--st))]"
      style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}
    >
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan">
          nu te doen
        </p>
        <h1 className="mt-1 text-3xl font-bold leading-tight">
          <span className="text-gradient">Quests</span>
        </h1>
        <p className="mt-2 text-fg-muted">
          Alles wat je nu kunt doen. Bezoek plekken op de map om meer quests
          vrij te spelen!
        </p>
      </header>

      {available.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
            Overal te doen
          </h2>
          {available.map((t) => (
            <TaskCard key={t.id} task={t} sub={null} locked={false} />
          ))}
        </section>
      )}

      {locationGroups.map(({ loc, tasks: locTasks }) => (
        <section key={loc.id} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="min-w-0 truncate text-xs font-semibold uppercase tracking-widest text-fg-muted">
              {loc.icon ?? "📍"} {loc.name}
            </h2>
            <span className="flex-shrink-0 rounded-full bg-cyan/15 px-2 py-0.5 text-[10px] font-bold text-cyan">
              ✓ geweest
            </span>
          </div>
          {locTasks.map((t) => (
            <TaskCard key={t.id} task={t} sub={null} locked={false} />
          ))}
        </section>
      ))}

      {available.length === 0 && locationGroups.length === 0 && (
        <p className="rounded-2xl border border-border bg-bg-card p-6 text-fg-muted">
          Alles gedaan wat nu kan — loop naar een volgende plek op de map om
          nieuwe quests vrij te spelen! 🔥
        </p>
      )}

      {done.length > 0 && (
        <section className="flex flex-col gap-3 opacity-70">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
            Al ingediend
          </h2>
          {done.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              sub={subByTask.get(t.id) ?? null}
              locked={false}
            />
          ))}
        </section>
      )}

      <TeamBottomNav active="quests" fixed />
    </main>
  );
}

function TaskCard({
  task: t,
  sub,
  locked,
}: {
  task: Task;
  sub: Sub | null;
  locked: boolean;
}) {
  const done = sub?.status === "approved";
  const pending = sub?.status === "pending";
  const rejected = sub?.status === "rejected";

  const inner = (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl border p-4 transition ${
        done
          ? "border-cyan/40 bg-cyan/5"
          : rejected
            ? "border-fg-dim/30 bg-bg-card opacity-70"
            : locked
              ? "border-border bg-bg-card opacity-60"
              : "border-border-strong bg-bg-card hover:border-pink"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold uppercase tracking-widest ${TYPE_COLOR[t.type]}`}
          >
            {TYPE_LABEL[t.type]}
          </span>
          <span className="text-[10px] text-fg-dim">
            · max {t.max_points} likes
          </span>
        </div>
        <p className="mt-0.5 font-bold">{t.title}</p>
        {!sub && !locked && (
          <p className="mt-1 line-clamp-2 text-sm text-fg-muted">
            {t.description}
          </p>
        )}
      </div>
      <div className="flex-shrink-0 text-right text-xs">
        {done && <p className="font-bold text-cyan">+{sub?.awarded_points ?? 0}</p>}
        {pending && <p className="text-yellow-400">in review</p>}
        {rejected && <p className="text-fg-dim">rejected</p>}
        {!sub && (
          <p className={`font-bold ${locked ? "text-fg-dim" : "text-pink"}`}>
            {locked ? "🔒" : "start →"}
          </p>
        )}
      </div>
    </div>
  );

  if (sub) return inner;
  if (locked && t.location_id) {
    // Vergrendeld: doorklikken naar de locatiepagina (met kaart-uitleg).
    return <Link href={`/team/location/${t.location_id}`}>{inner}</Link>;
  }
  return <Link href={`/team/challenge/${t.id}`}>{inner}</Link>;
}
