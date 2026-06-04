import Link from "next/link";
import { redirect } from "next/navigation";
import { getTeamSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import { TeamBottomNav } from "../bottom-nav";

type Task = {
  id: string;
  title: string;
  description: string;
  type: "photo" | "text" | "multiple_choice" | "arrival";
  max_points: number;
};

type Sub = { task_id: string; status: "pending" | "approved" | "rejected"; awarded_points: number | null };

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

  const [{ data: tasksData }, { data: subsData }] = await Promise.all([
    sb
      .from("tasks")
      .select("*")
      .eq("event_id", eventId)
      .is("location_id", null)
      .neq("type", "arrival")
      .order("sort_order", { ascending: true }),
    sb
      .from("submissions")
      .select("task_id, status, awarded_points")
      .eq("team_id", teamId),
  ]);

  const tasks = (tasksData ?? []) as Task[];
  const subs = (subsData ?? []) as Sub[];
  const subByTask = new Map(subs.map((s) => [s.task_id, s]));

  const available = tasks.filter((t) => !subByTask.has(t.id));
  const done = tasks.filter((t) => subByTask.has(t.id));

  return (
    <main
      className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-6 pt-6"
      style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}
    >
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan">
          anywhere
        </p>
        <h1 className="mt-1 text-3xl font-bold leading-tight">
          <span className="text-gradient">Quests</span>
        </h1>
        <p className="mt-2 text-fg-muted">
          Deze challenges mag je overal doen, geen locatie nodig.
        </p>
      </header>

      {available.length === 0 && done.length === 0 ? (
        <p className="rounded-2xl border border-border bg-bg-card p-6 text-fg-muted">
          Nog geen quests beschikbaar.
        </p>
      ) : (
        <>
          {available.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
                Te doen
              </h2>
              {available.map((t) => (
                <Link
                  key={t.id}
                  href={`/team/challenge/${t.id}`}
                  className="rounded-2xl border border-border-strong bg-bg-card p-4 transition hover:border-pink"
                >
                  <div className="flex items-center justify-between gap-3">
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
                      <p className="mt-1 line-clamp-2 text-sm text-fg-muted">
                        {t.description}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-pink">→</span>
                  </div>
                </Link>
              ))}
            </section>
          )}

          {done.length > 0 && (
            <section className="flex flex-col gap-3 opacity-70">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
                Al ingediend
              </h2>
              {done.map((t) => {
                const sub = subByTask.get(t.id)!;
                return (
                  <div
                    key={t.id}
                    className="rounded-2xl border border-border bg-bg-card p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-widest ${TYPE_COLOR[t.type]}`}
                          >
                            {TYPE_LABEL[t.type]}
                          </span>
                        </div>
                        <p className="mt-0.5 font-bold">{t.title}</p>
                      </div>
                      <div className="text-right text-xs">
                        {sub.status === "approved" && (
                          <p className="font-bold text-cyan">
                            +{sub.awarded_points ?? 0}
                          </p>
                        )}
                        {sub.status === "pending" && (
                          <p className="text-yellow-400">in review</p>
                        )}
                        {sub.status === "rejected" && (
                          <p className="text-fg-dim">rejected</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </>
      )}

      <TeamBottomNav active="quests" fixed />
    </main>
  );
}
