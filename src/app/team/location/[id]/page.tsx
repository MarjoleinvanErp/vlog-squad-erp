import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getTeamSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";

type TaskRow = {
  id: string;
  title: string;
  description: string;
  type: "photo" | "text" | "multiple_choice" | "arrival";
  max_points: number;
};

type SubmissionRow = {
  task_id: string;
  status: "pending" | "approved" | "rejected";
  awarded_points: number | null;
};

const TYPE_LABEL: Record<TaskRow["type"], string> = {
  photo: "Drop",
  text: "Hot Take",
  multiple_choice: "Quiz",
  arrival: "Arrival",
};

const TYPE_COLOR: Record<TaskRow["type"], string> = {
  photo: "text-pink",
  text: "text-cyan",
  multiple_choice: "text-yellow-400",
  arrival: "text-green-400",
};

export default async function LocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const teamId = await getTeamSession();
  if (!teamId) redirect("/team");

  const { id } = await params;
  const sb = supabaseService();

  const { data: locData } = await sb
    .from("locations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!locData) notFound();
  const loc = locData as {
    id: string;
    name: string;
    description: string | null;
    arrival_points: number;
  };

  const [{ data: tasksData }, { data: subsData }, { data: visitData }] =
    await Promise.all([
      sb.from("tasks").select("*").eq("location_id", id).order("sort_order"),
      sb
        .from("submissions")
        .select("task_id, status, awarded_points")
        .eq("team_id", teamId),
      sb
        .from("location_visits")
        .select("id, arrived_at, order_position, bonus_awarded")
        .eq("team_id", teamId)
        .eq("location_id", id)
        .maybeSingle(),
    ]);

  const tasks = (tasksData ?? []) as TaskRow[];
  const subs = (subsData ?? []) as SubmissionRow[];
  const subByTask = new Map(subs.map((s) => [s.task_id, s]));
  const visit = visitData as {
    arrived_at: string;
    order_position: number;
    bonus_awarded: number;
  } | null;
  const arrived = !!visit;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-6 pt-6 pb-10">
      <Link href="/team/map" className="text-sm text-fg-muted hover:text-fg">
        ← map
      </Link>

      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan">
          drop
        </p>
        <h1 className="mt-1 text-3xl font-bold">{loc.name}</h1>
        {loc.description && (
          <p className="mt-2 text-fg-muted">{loc.description}</p>
        )}
        {arrived ? (
          <p className="mt-3 inline-block rounded-full bg-cyan/15 px-3 py-1 text-xs font-bold text-cyan">
            ✓ aangekomen
            {visit?.order_position
              ? ` · ${visit.order_position}e team · +${visit.bonus_awarded} likes`
              : ""}
          </p>
        ) : (
          <p className="mt-2 text-xs text-fg-dim">
            +{loc.arrival_points} likes bij aankomst
          </p>
        )}
      </header>

      {!arrived && (
        <section className="rounded-2xl border-2 border-yellow-400/40 bg-yellow-400/5 p-4">
          <p className="text-sm font-bold text-yellow-300">
            Loop eerst naar deze plek
          </p>
          <p className="mt-1 text-sm text-fg-muted">
            Zodra je squad binnen de radius staat (en GPS aan staat) wordt de
            arrival automatisch geregistreerd. Daarna kun je hier challenges
            indienen.
          </p>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
          Challenges
        </h2>
        {tasks.length === 0 ? (
          <p className="rounded-2xl border border-border bg-bg-card p-4 text-fg-muted">
            Nog geen challenges hier.
          </p>
        ) : (
          tasks.map((t) => {
            const sub = subByTask.get(t.id);
            const done = sub?.status === "approved";
            const pending = sub?.status === "pending";
            const rejected = sub?.status === "rejected";
            const locked = !arrived;

            const inner = (
              <div
                className={`flex items-center justify-between gap-3 rounded-2xl border p-4 transition ${
                  done
                    ? "border-cyan/40 bg-cyan/5"
                    : rejected
                      ? "border-fg-dim/30 bg-bg-card opacity-70"
                      : locked
                        ? "border-border bg-bg-card opacity-50"
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
                </div>
                <div className="flex-shrink-0 text-right text-xs">
                  {done && (
                    <>
                      <p className="font-bold text-cyan">
                        +{sub?.awarded_points ?? 0}
                      </p>
                      <p className="text-fg-dim">approved</p>
                    </>
                  )}
                  {pending && <p className="text-yellow-400">in review</p>}
                  {rejected && <p className="text-fg-dim">rejected</p>}
                  {!sub && t.type !== "arrival" && (
                    <p
                      className={`font-bold ${locked ? "text-fg-dim" : "text-pink"}`}
                    >
                      {locked ? "vergrendeld" : "start →"}
                    </p>
                  )}
                </div>
              </div>
            );

            if (t.type === "arrival" || sub || locked) {
              return <div key={t.id}>{inner}</div>;
            }
            return (
              <Link key={t.id} href={`/team/challenge/${t.id}`}>
                {inner}
              </Link>
            );
          })
        )}
      </section>
    </main>
  );
}
