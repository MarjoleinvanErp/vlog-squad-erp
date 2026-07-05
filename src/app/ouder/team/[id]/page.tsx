import Link from "next/link";
import Image from "next/image";
import { redirect, notFound } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import type {
  LocationRow,
  SubmissionRow,
  TaskRow,
} from "@/lib/supabase/types";

const TYPE_LABEL = {
  photo: "Drop",
  video: "Video",
  text: "Hot Take",
  multiple_choice: "Quiz",
  arrival: "Arrival",
} as const;

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
}

function formatTimeNL(iso: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  }).format(new Date(iso));
}

type Visit = {
  location_id: string;
  arrived_at: string;
  order_position: number;
  bonus_awarded: number;
};

export default async function OuderTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const eventId = await getAdminSession();
  if (!eventId) redirect("/ouder");

  const { id } = await params;
  const sb = supabaseService();

  const { data: teamData } = await sb
    .from("teams")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!teamData) notFound();
  const team = teamData as {
    id: string;
    event_id: string;
    name: string;
    color: string;
    team_photo_url: string | null;
  };
  if (team.event_id !== eventId) notFound();

  const [
    { data: subsData },
    { data: visitsData },
    { data: membersData },
    { data: tasksData },
    { data: locationsData },
  ] = await Promise.all([
    sb
      .from("submissions")
      .select("*")
      .eq("team_id", id)
      .order("submitted_at", { ascending: true }),
    sb
      .from("location_visits")
      .select("location_id, arrived_at, order_position, bonus_awarded")
      .eq("team_id", id)
      .order("arrived_at", { ascending: true }),
    sb.from("team_members").select("name").eq("team_id", id),
    sb.from("tasks").select("*").eq("event_id", eventId),
    sb.from("locations").select("*").eq("event_id", eventId),
  ]);

  const submissions = (subsData ?? []) as SubmissionRow[];
  const visits = (visitsData ?? []) as Visit[];
  const members = ((membersData ?? []) as Array<{ name: string }>).map(
    (m) => m.name
  );
  const taskById = new Map(
    ((tasksData ?? []) as TaskRow[]).map((t) => [t.id, t])
  );
  const locationById = new Map(
    ((locationsData ?? []) as LocationRow[]).map((l) => [l.id, l])
  );

  const questPoints = submissions
    .filter((s) => s.status === "approved")
    .reduce((a, s) => a + (s.awarded_points ?? 0), 0);
  const locationPoints = visits.reduce((a, v) => a + v.bonus_awarded, 0);
  const total = questPoints + locationPoints;

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-6 pb-10 pt-[calc(1.5rem+var(--st))]">
      <Link
        href="/ouder/dashboard"
        className="text-sm text-fg-muted hover:text-fg"
      >
        ← dashboard
      </Link>

      <header className="flex items-center gap-4">
        {team.team_photo_url ? (
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full">
            <Image
              src={team.team_photo_url}
              alt=""
              fill
              sizes="64px"
              className="object-cover"
              style={{ outline: `3px solid ${team.color}`, outlineOffset: 1 }}
            />
          </div>
        ) : (
          <div
            className="h-16 w-16 flex-shrink-0 rounded-full"
            style={{ background: team.color }}
          />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-3xl font-bold" style={{ color: team.color }}>
            @{team.name}
          </h1>
          {members.length > 0 && (
            <p className="truncate text-sm text-fg-muted">
              {members.join(" · ")}
            </p>
          )}
        </div>
      </header>

      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-pink/40 bg-pink/10 p-4 text-center">
          <p className="text-2xl font-bold text-pink">{total}</p>
          <p className="text-[10px] uppercase tracking-widest text-fg-muted">
            totaal
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-bg-card p-4 text-center">
          <p className="text-2xl font-bold">{locationPoints}</p>
          <p className="text-[10px] uppercase tracking-widest text-fg-muted">
            📍 locaties ({visits.length})
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-bg-card p-4 text-center">
          <p className="text-2xl font-bold">{questPoints}</p>
          <p className="text-[10px] uppercase tracking-widest text-fg-muted">
            ✅ quests ({submissions.length})
          </p>
        </div>
      </section>

      {visits.length > 0 && (
        <section className="rounded-3xl border border-border bg-bg-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-cyan">
            📍 De route
          </h2>
          <ol className="mt-3 flex flex-col gap-1.5">
            {visits.map((v, i) => {
              const loc = locationById.get(v.location_id);
              return (
                <li
                  key={v.location_id}
                  className="flex items-baseline gap-2 text-sm"
                >
                  <span className="w-5 flex-shrink-0 text-right text-xs text-fg-dim">
                    {i + 1}.
                  </span>
                  <span className="w-12 flex-shrink-0 text-xs text-fg-muted">
                    {formatTimeNL(v.arrived_at)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {loc ? `${loc.icon ?? "📍"} ${loc.name}` : "Onbekende plek"}
                  </span>
                  <span
                    className={`flex-shrink-0 text-xs font-bold ${
                      v.order_position === 1 ? "text-pink" : "text-fg-muted"
                    }`}
                  >
                    {v.order_position === 1
                      ? "🥇 eerste!"
                      : v.order_position === 2
                        ? "🥈 2e"
                        : v.order_position === 3
                          ? "🥉 3e"
                          : `${v.order_position}e`}{" "}
                    +{v.bonus_awarded}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
          Alle posts
        </h2>
        {submissions.length === 0 ? (
          <p className="rounded-2xl border border-border bg-bg-card p-5 text-fg-muted">
            Geen posts.
          </p>
        ) : (
          submissions.map((s) => {
            const task = taskById.get(s.task_id);
            const location = task?.location_id
              ? locationById.get(task.location_id)
              : null;
            return (
              <article
                key={s.id}
                className="flex flex-col gap-3 rounded-3xl border border-border bg-bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold">{task?.title ?? "Opdracht"}</h3>
                    <p className="text-xs text-fg-muted">
                      {task ? `${TYPE_LABEL[task.type]} · ` : ""}
                      {location
                        ? `${location.icon ?? "📍"} ${location.name} · `
                        : ""}
                      {formatTimeNL(s.submitted_at)}
                    </p>
                  </div>
                  {s.status === "approved" ? (
                    <span className="flex-shrink-0 rounded-full bg-cyan/20 px-3 py-1 text-xs font-bold text-cyan">
                      +{s.awarded_points ?? 0}
                    </span>
                  ) : s.status === "rejected" ? (
                    <span className="flex-shrink-0 rounded-full bg-pink/20 px-3 py-1 text-xs font-bold text-pink-soft">
                      ✗ afgekeurd
                    </span>
                  ) : (
                    <span className="flex-shrink-0 rounded-full bg-yellow-400/20 px-3 py-1 text-xs font-bold text-yellow-300">
                      ⏳ review
                    </span>
                  )}
                </div>

                {s.photo_urls.length > 0 && (
                  <div
                    className={`grid gap-2 ${
                      s.photo_urls.length === 1 ? "grid-cols-1" : "grid-cols-2"
                    }`}
                  >
                    {s.photo_urls.map((url) =>
                      isVideoUrl(url) ? (
                        <video
                          key={url}
                          src={url}
                          controls
                          playsInline
                          preload="metadata"
                          className="w-full rounded-2xl bg-black"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={url}
                          src={url}
                          alt={task?.title ?? "Inzending"}
                          loading="lazy"
                          className="w-full rounded-2xl object-cover"
                        />
                      )
                    )}
                  </div>
                )}

                {s.text_answer && (
                  <p className="rounded-2xl border border-border bg-bg-elev px-4 py-3 text-sm italic">
                    &ldquo;{s.text_answer}&rdquo;
                  </p>
                )}

                {s.choice_index != null && task?.options && (
                  <p className="rounded-2xl border border-border bg-bg-elev px-4 py-3 text-sm">
                    Antwoord:{" "}
                    <strong>{task.options.choices[s.choice_index]}</strong>
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-xs text-fg-dim">
                    {s.reviewed_by
                      ? `beoordeeld door ${s.reviewed_by}`
                      : "nog niet beoordeeld"}
                  </p>
                  <Link
                    href={`/ouder/submission/${s.id}`}
                    className="text-xs font-bold text-cyan hover:underline"
                  >
                    bekijk / beoordeel →
                  </Link>
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
