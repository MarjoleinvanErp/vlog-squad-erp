import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getTeamSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import { TeamBottomNav } from "../bottom-nav";

type Squad = {
  id: string;
  name: string;
  color: string;
  team_photo_url: string | null;
  event_id: string;
  likes: number;
};

export default async function RankingPage() {
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

  const { data: eventRow } = await sb
    .from("events")
    .select("state")
    .eq("id", eventId)
    .maybeSingle();
  const isFinished = (eventRow as { state?: string } | null)?.state === "finished";
  if (!isFinished) redirect("/team/messages");

  const { data: teams } = await sb
    .from("teams")
    .select("id, name, color, team_photo_url")
    .eq("event_id", eventId);

  const teamRows = (teams ?? []) as Array<Omit<Squad, "event_id" | "likes">>;

  const squads: Squad[] = await Promise.all(
    teamRows.map(async (t) => {
      const [{ data: subs }, { data: visits }] = await Promise.all([
        sb
          .from("submissions")
          .select("awarded_points")
          .eq("team_id", t.id)
          .eq("status", "approved"),
        sb
          .from("location_visits")
          .select("bonus_awarded")
          .eq("team_id", t.id),
      ]);
      const likes =
        ((subs ?? []) as Array<{ awarded_points: number | null }>).reduce(
          (a, b) => a + (b.awarded_points ?? 0),
          0
        ) +
        ((visits ?? []) as Array<{ bonus_awarded: number }>).reduce(
          (a, b) => a + b.bonus_awarded,
          0
        );
      return { ...t, event_id: eventId, likes };
    })
  );

  squads.sort((a, b) => b.likes - a.likes);

  return (
    <main
      className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-6 pt-[calc(1.5rem+var(--st))]"
      style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}
    >
      <Link href="/team/map" className="text-sm text-fg-muted hover:text-fg">
        ← map
      </Link>
      <h1 className="text-3xl font-bold">
        <span className="text-gradient">Live</span> ranking
      </h1>

      <ol className="flex flex-col gap-3">
        {squads.map((s, i) => {
          const isYou = s.id === teamId;
          return (
            <li
              key={s.id}
              className={`flex items-center gap-3 rounded-3xl border p-4 ${
                isYou
                  ? "border-pink bg-pink/10 glow-pink"
                  : "border-border bg-bg-card"
              }`}
            >
              <span className="w-6 text-center text-xl font-bold text-fg-muted">
                {i + 1}
              </span>
              {s.team_photo_url ? (
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full">
                  <Image
                    src={s.team_photo_url}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                    style={{ outline: `2px solid ${s.color}`, outlineOffset: 1 }}
                  />
                </div>
              ) : (
                <div
                  className="h-12 w-12 flex-shrink-0 rounded-full"
                  style={{ background: s.color }}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold" style={{ color: s.color }}>
                  @{s.name}
                </p>
                {isYou && (
                  <p className="text-[10px] uppercase tracking-widest text-pink">
                    jij
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-pink">{s.likes}</p>
                <p className="text-[10px] uppercase tracking-widest text-fg-muted">
                  likes
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <TeamBottomNav active="messages" fixed />
    </main>
  );
}
