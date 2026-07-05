import { supabaseService } from "@/lib/supabase/server";
import { hasRecapSession } from "@/lib/auth/session";
import { RecapLoginForm } from "./recap-login-form";
import type {
  LocationRow,
  SubmissionRow,
  TaskRow,
  TeamRow,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|m4v)(\?|$)/i;

function isVideoUrl(url: string): boolean {
  return VIDEO_EXTENSIONS.test(url);
}

type Visit = {
  location_id: string;
  arrived_at: string;
  order_position: number;
  bonus_awarded: number;
};

type TeamRecap = {
  team: TeamRow;
  members: string[];
  score: number;
  submissions: SubmissionRow[];
  visits: Visit[];
};

export default async function RecapPage() {
  const loggedIn = await hasRecapSession();
  if (!loggedIn) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-8 px-6 py-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan">
            Speurtocht Erp
          </p>
          <h1 className="text-4xl font-bold leading-tight">
            <span className="text-gradient">Kijk de speurtocht terug</span>
          </h1>
          <p className="text-sm text-fg-muted">
            Vul het codewoord in dat je van de organisatie hebt gekregen.
          </p>
        </div>
        <RecapLoginForm />
      </main>
    );
  }

  const sb = supabaseService();

  const { data: eventData } = await sb
    .from("events")
    .select("*")
    .eq("active", true)
    .maybeSingle();
  const event = eventData as
    | { id: string; name: string; starts_at: string }
    | null;

  if (!event) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6">
        <p className="text-fg-muted">Geen event gevonden.</p>
      </main>
    );
  }

  const [
    { data: teamsData },
    { data: locationsData },
    { data: tasksData },
  ] = await Promise.all([
    sb.from("teams").select("*").eq("event_id", event.id),
    sb.from("locations").select("*").eq("event_id", event.id),
    sb.from("tasks").select("*").eq("event_id", event.id),
  ]);

  const teams = (teamsData ?? []) as TeamRow[];
  const locations = (locationsData ?? []) as LocationRow[];
  const tasks = (tasksData ?? []) as TaskRow[];

  const locationById = new Map(locations.map((l) => [l.id, l]));
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  const recaps: TeamRecap[] = await Promise.all(
    teams.map(async (team) => {
      const [{ data: subs }, { data: visitRows }, { data: members }] =
        await Promise.all([
          sb
            .from("submissions")
            .select("*")
            .eq("team_id", team.id)
            .order("submitted_at", { ascending: true }),
          sb
            .from("location_visits")
            .select("location_id, arrived_at, order_position, bonus_awarded")
            .eq("team_id", team.id)
            .order("arrived_at", { ascending: true }),
          sb.from("team_members").select("name").eq("team_id", team.id),
        ]);

      const submissions = (subs ?? []) as SubmissionRow[];
      const visits = (visitRows ?? []) as Visit[];
      const score =
        submissions
          .filter((s) => s.status === "approved")
          .reduce((a, s) => a + (s.awarded_points ?? 0), 0) +
        visits.reduce((a, v) => a + v.bonus_awarded, 0);

      return {
        team,
        members: ((members ?? []) as Array<{ name: string }>).map(
          (m) => m.name
        ),
        score,
        submissions,
        visits,
      };
    })
  );

  recaps.sort((a, b) => b.score - a.score);

  const eventDate = new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(event.starts_at));

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-10 px-6 py-12">
      <header className="flex flex-col items-center gap-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan">
          {eventDate}
        </p>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          <span className="text-gradient">{event.name}</span>
        </h1>
        <p className="text-sm text-fg-muted">Zo ging de speurtocht door Erp</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold">
          <span className="text-gradient">Eindstand</span>
        </h2>
        <ol className="flex flex-col gap-3">
          {recaps.map((r, i) => (
            <li
              key={r.team.id}
              className={`flex items-center gap-3 rounded-3xl border p-4 ${
                i === 0
                  ? "border-pink bg-pink/10 glow-pink"
                  : "border-border bg-bg-card"
              }`}
            >
              <span className="w-8 text-center text-2xl">
                {i === 0 ? "🏆" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
              </span>
              {r.team.team_photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.team.team_photo_url}
                  alt={r.team.name}
                  className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
                  style={{ outline: `2px solid ${r.team.color}` }}
                />
              ) : (
                <div
                  className="h-12 w-12 flex-shrink-0 rounded-full"
                  style={{ background: r.team.color }}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold" style={{ color: r.team.color }}>
                  @{r.team.name}
                </p>
                {r.members.length > 0 && (
                  <p className="truncate text-xs text-fg-muted">
                    {r.members.join(" · ")}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-pink">{r.score}</p>
                <p className="text-[10px] uppercase tracking-widest text-fg-muted">
                  punten
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {recaps.map((r) => (
        <TeamSection
          key={r.team.id}
          recap={r}
          taskById={taskById}
          locationById={locationById}
        />
      ))}

      <footer className="pb-6 pt-4 text-center text-xs text-fg-dim">
        Speurtocht Erp · {eventDate} 💖
      </footer>
    </main>
  );
}

function TeamSection({
  recap,
  taskById,
  locationById,
}: {
  recap: TeamRecap;
  taskById: Map<string, TaskRow>;
  locationById: Map<string, LocationRow>;
}) {
  const { team, submissions } = recap;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {team.team_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={team.team_photo_url}
            alt={team.name}
            className="h-14 w-14 rounded-full object-cover"
            style={{ outline: `2px solid ${team.color}` }}
          />
        ) : (
          <div
            className="h-14 w-14 rounded-full"
            style={{ background: team.color }}
          />
        )}
        <div>
          <h2 className="text-2xl font-bold" style={{ color: team.color }}>
            @{team.name}
          </h2>
          <p className="text-xs uppercase tracking-widest text-fg-muted">
            {submissions.length} posts · {recap.visits.length} locaties ·{" "}
            {recap.score} punten
          </p>
        </div>
      </div>

      {recap.visits.length > 0 && (
        <div className="rounded-3xl border border-border bg-bg-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-cyan">
            📍 De route
          </h3>
          <ol className="mt-3 flex flex-col gap-1.5">
            {recap.visits.map((v, i) => {
              const loc = locationById.get(v.location_id);
              return (
                <li key={v.location_id} className="flex items-baseline gap-2 text-sm">
                  <span className="w-5 flex-shrink-0 text-right text-xs text-fg-dim">
                    {i + 1}.
                  </span>
                  <span className="w-12 flex-shrink-0 text-xs text-fg-muted">
                    {new Intl.DateTimeFormat("nl-NL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(v.arrived_at))}
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
                          : `${v.order_position}e`}
                    {v.bonus_awarded > 0 ? ` +${v.bonus_awarded}` : ""}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {submissions.map((s) => {
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
                    {location ? `${location.icon ?? "📍"} ${location.name} · ` : ""}
                    {new Intl.DateTimeFormat("nl-NL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(s.submitted_at))}
                  </p>
                </div>
                <StatusBadge submission={s} />
              </div>

              {task?.description && (
                <p className="whitespace-pre-line text-sm text-fg-muted">
                  {task.description}
                </p>
              )}

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
                  Antwoord: <strong>{task.options.choices[s.choice_index]}</strong>
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function StatusBadge({ submission }: { submission: SubmissionRow }) {
  if (submission.status === "approved") {
    return (
      <span className="flex-shrink-0 rounded-full bg-cyan/20 px-3 py-1 text-xs font-bold text-cyan">
        +{submission.awarded_points ?? 0}
      </span>
    );
  }
  if (submission.status === "rejected") {
    return (
      <span className="flex-shrink-0 rounded-full bg-pink/20 px-3 py-1 text-xs font-bold text-pink-soft">
        ✗ afgekeurd
      </span>
    );
  }
  return (
    <span className="flex-shrink-0 rounded-full bg-bg-elev px-3 py-1 text-xs font-bold text-fg-muted">
      ⏳ niet beoordeeld
    </span>
  );
}
