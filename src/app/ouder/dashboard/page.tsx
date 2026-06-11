import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import { LiveRefresh } from "./live-refresh";
import { acknowledgeIncidentAction } from "./incident-actions";
import { OuderPushToggle } from "./push-toggle";
import { AnnounceSection, type EventRally } from "./announce-section";
import { OuderPushBanner } from "./push-banner";

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

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
}

const INACTIVITY_THRESHOLD_MIN = 20;

function relativeMin(iso: string): number {
  return Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
}

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
  const event = eventData as {
    name: string;
    state?: string;
    rally_message?: string | null;
    rally_lat?: number | null;
    rally_lng?: number | null;
    paused_at?: string | null;
  };
  const rally: EventRally = {
    state:
      event.state === "paused"
        ? "paused"
        : event.state === "finished"
          ? "finished"
          : "running",
    rally_message: event.rally_message ?? null,
    rally_lat: event.rally_lat ?? null,
    rally_lng: event.rally_lng ?? null,
    paused_at: event.paused_at ?? null,
  };

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

  const [
    { data: pendingRaw },
    { data: subsForScore },
    { data: visitsForScore },
    { data: incidentsRaw },
    { data: positionsRaw },
  ] = await Promise.all([
    teamIds.length > 0
      ? sb
          .from("submissions")
          .select(
            "id, team_id, task_id, photo_urls, text_answer, submitted_at, status, tasks(title, type, max_points)"
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
    teamIds.length > 0
      ? sb
          .from("incidents")
          .select("*")
          .in("team_id", teamIds)
          .is("acknowledged_at", null)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    teamIds.length > 0
      ? sb
          .from("team_locations")
          .select("team_id, updated_at")
          .in("team_id", teamIds)
      : Promise.resolve({ data: [] }),
  ]);

  type PendingRow = {
    id: string;
    team_id: string;
    task_id: string;
    photo_urls: string[] | null;
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
  for (const s of (subsForScore ?? []) as Array<{
    team_id: string;
    awarded_points: number | null;
  }>) {
    likesByTeam.set(
      s.team_id,
      (likesByTeam.get(s.team_id) ?? 0) + (s.awarded_points ?? 0)
    );
  }
  for (const v of (visitsForScore ?? []) as Array<{
    team_id: string;
    bonus_awarded: number;
  }>) {
    likesByTeam.set(
      v.team_id,
      (likesByTeam.get(v.team_id) ?? 0) + v.bonus_awarded
    );
  }

  const ranking = teams
    .map((t) => ({ ...t, likes: likesByTeam.get(t.id) ?? 0 }))
    .sort((a, b) => b.likes - a.likes);

  const incidents = (incidentsRaw ?? []) as Array<{
    id: string;
    team_id: string;
    type: "sos" | "inactive" | "out_of_zone";
    lat: number | null;
    lng: number | null;
    created_at: string;
  }>;
  const sosIncidents = incidents.filter((i) => i.type === "sos");

  const positions = (positionsRaw ?? []) as Array<{
    team_id: string;
    updated_at: string;
  }>;
  const lastPingByTeam = new Map(
    positions.map((p) => [p.team_id, p.updated_at])
  );

  const inactiveSquads = teams
    .map((t) => {
      const last = lastPingByTeam.get(t.id);
      return {
        team: t,
        minAgo: last ? relativeMin(last) : null,
      };
    })
    .filter(
      (x) =>
        x.minAgo == null || x.minAgo >= INACTIVITY_THRESHOLD_MIN
    );

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-6 pb-10 pt-[calc(2rem+var(--st))]">
      <LiveRefresh />

      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-cyan">manager</p>
          <h1 className="text-2xl font-bold">{event.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <OuderPushToggle />
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

      <OuderPushBanner />

      <section
        className={`rounded-3xl border p-5 ${
          rally.state === "paused"
            ? "border-pink/50 bg-pink/5"
            : rally.state === "finished"
              ? "border-cyan/50 bg-cyan/5"
              : "border-border bg-bg-card"
        }`}
      >
        <AnnounceSection event={rally} />
      </section>

      {(sosIncidents.length > 0 || inactiveSquads.length > 0) && (
        <section className="space-y-3 rounded-3xl border-2 border-red-500/50 bg-red-500/10 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-red-300">
            Aandacht
          </h2>

          {sosIncidents.map((inc) => {
            const t = teamById.get(inc.team_id);
            if (!t) return null;
            const mapsLink =
              inc.lat != null && inc.lng != null
                ? `https://www.google.com/maps?q=${inc.lat},${inc.lng}`
                : null;
            return (
              <div
                key={inc.id}
                className="flex flex-col gap-3 rounded-2xl border border-red-500/40 bg-bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-white">
                    SOS
                  </span>
                  <span
                    className="text-base font-bold"
                    style={{ color: t.color }}
                  >
                    @{t.name}
                  </span>
                  <span className="ml-auto text-xs text-fg-muted">
                    {relativeMin(inc.created_at)} min geleden
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {mapsLink && (
                    <a
                      href={mapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-cyan/40 bg-cyan/10 px-3 py-2 text-sm font-bold text-cyan hover:bg-cyan/20"
                    >
                      Open in Maps →
                    </a>
                  )}
                  <Link
                    href="/ouder/map"
                    className="rounded-xl border border-border-strong bg-bg-elev px-3 py-2 text-sm hover:border-cyan hover:text-cyan"
                  >
                    Live map
                  </Link>
                  <form
                    action={acknowledgeIncidentAction}
                    className="ml-auto"
                  >
                    <input type="hidden" name="id" value={inc.id} />
                    <button
                      type="submit"
                      className="rounded-xl border border-border-strong bg-bg-elev px-3 py-2 text-sm font-bold text-fg-muted hover:text-fg"
                    >
                      Afgehandeld
                    </button>
                  </form>
                </div>
              </div>
            );
          })}

          {inactiveSquads.map(({ team: t, minAgo }) => (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-2xl border border-yellow-400/40 bg-bg-card p-4"
            >
              <span className="rounded-full bg-yellow-400/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-yellow-300">
                stil
              </span>
              <span
                className="text-base font-bold"
                style={{ color: t.color }}
              >
                @{t.name}
              </span>
              <span className="ml-auto text-xs text-fg-muted">
                {minAgo == null ? "geen GPS" : `${minAgo} min geen ping`}
              </span>
            </div>
          ))}
        </section>
      )}

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
              const urls = p.photo_urls ?? [];
              const heroUrl = urls[0] ?? null;
              const extraCount = Math.max(0, urls.length - 1);
              const heroIsVideo = heroUrl ? isVideoUrl(heroUrl) : false;
              return (
                <li key={p.id}>
                  <Link
                    href={`/ouder/submission/${p.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-border-strong bg-bg-elev p-3 transition hover:border-pink"
                  >
                    {heroUrl ? (
                      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-black">
                        {heroIsVideo ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <video
                              src={heroUrl}
                              muted
                              playsInline
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-white">
                              ▶
                            </span>
                          </>
                        ) : (
                          <Image
                            src={heroUrl}
                            alt=""
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        )}
                        {extraCount > 0 && (
                          <span className="absolute right-0.5 bottom-0.5 rounded-full bg-black/80 px-1.5 py-0.5 text-[9px] font-bold text-white">
                            +{extraCount}
                          </span>
                        )}
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
