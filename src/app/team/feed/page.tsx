import Link from "next/link";
import { redirect } from "next/navigation";
import { getTeamSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import { TeamBottomNav } from "../bottom-nav";
import { FeedStream, type FeedRow } from "./feed-stream";

type RawRow = {
  id: string;
  team_id: string;
  status: "pending" | "approved" | "rejected";
  awarded_points: number | null;
  photo_urls: string[] | null;
  text_answer: string | null;
  submitted_at: string;
  review_note: string | null;
  reviewed_by: string | null;
  tasks:
    | { title: string; type: string }
    | { title: string; type: string }[]
    | null;
};

export default async function FeedPage() {
  const teamId = await getTeamSession();
  if (!teamId) redirect("/team");

  const sb = supabaseService();
  const { data: teamData } = await sb
    .from("teams")
    .select("name, color, team_photo_url, event_id")
    .eq("id", teamId)
    .maybeSingle();

  const team = teamData as {
    name: string;
    color: string;
    team_photo_url: string | null;
    event_id: string;
  } | null;

  if (!team) redirect("/team");

  const { data: eventData } = await sb
    .from("events")
    .select("state")
    .eq("id", team.event_id)
    .maybeSingle();
  const eventState = (eventData as { state?: string } | null)?.state ?? "running";
  const isFinished = eventState === "finished";

  let submissions: FeedRow[] = [];
  let teamsById: Map<
    string,
    { name: string; color: string; team_photo_url: string | null }
  > = new Map();

  if (isFinished) {
    const { data: eventTeams } = await sb
      .from("teams")
      .select("id, name, color, team_photo_url")
      .eq("event_id", team.event_id);
    const allTeams = (eventTeams ?? []) as Array<{
      id: string;
      name: string;
      color: string;
      team_photo_url: string | null;
    }>;
    teamsById = new Map(
      allTeams.map((t) => [
        t.id,
        { name: t.name, color: t.color, team_photo_url: t.team_photo_url },
      ])
    );
    const teamIds = allTeams.map((t) => t.id);

    if (teamIds.length > 0) {
      const { data } = await sb
        .from("submissions")
        .select(
          "id, team_id, status, awarded_points, photo_urls, text_answer, submitted_at, review_note, reviewed_by, tasks(title, type)"
        )
        .in("team_id", teamIds)
        .eq("status", "approved")
        .order("awarded_points", { ascending: false })
        .order("submitted_at", { ascending: false });

      submissions = ((data ?? []) as unknown as RawRow[]).map((r) => {
        const task = Array.isArray(r.tasks) ? r.tasks[0] ?? null : r.tasks;
        const t = teamsById.get(r.team_id);
        return {
          id: r.id,
          status: r.status,
          awarded_points: r.awarded_points,
          photo_urls: r.photo_urls ?? [],
          text_answer: r.text_answer,
          submitted_at: r.submitted_at,
          review_note: r.review_note,
          reviewed_by: r.reviewed_by,
          task_title: task?.title ?? null,
          task_type: task?.type ?? null,
          team: t
            ? {
                name: t.name,
                color: t.color,
                team_photo_url: t.team_photo_url,
              }
            : null,
        };
      });
    }
  } else {
    const { data } = await sb
      .from("submissions")
      .select(
        "id, team_id, status, awarded_points, photo_urls, text_answer, submitted_at, tasks(title, type)"
      )
      .eq("team_id", teamId)
      .order("submitted_at", { ascending: false });

    submissions = ((data ?? []) as unknown as RawRow[]).map((r) => {
      const task = Array.isArray(r.tasks) ? r.tasks[0] ?? null : r.tasks;
      return {
        id: r.id,
        status: r.status,
        awarded_points: r.awarded_points,
        photo_urls: r.photo_urls ?? [],
        text_answer: r.text_answer,
        submitted_at: r.submitted_at,
        review_note: r.review_note,
        reviewed_by: r.reviewed_by,
        task_title: task?.title ?? null,
        task_type: task?.type ?? null,
        team: null,
      };
    });
  }

  // Ouder-likes per post ophalen; als de tabel (nog) niet bestaat: leeg.
  if (submissions.length > 0) {
    try {
      const { data: likeRows, error: likeError } = await sb
        .from("post_likes")
        .select("submission_id, liker_name")
        .in(
          "submission_id",
          submissions.map((s) => s.id)
        )
        .order("created_at", { ascending: true });
      if (!likeError) {
        const bySubmission = new Map<string, string[]>();
        for (const row of (likeRows ?? []) as Array<{
          submission_id: string;
          liker_name: string;
        }>) {
          const list = bySubmission.get(row.submission_id) ?? [];
          list.push(row.liker_name);
          bySubmission.set(row.submission_id, list);
        }
        submissions = submissions.map((s) => ({
          ...s,
          likes: bySubmission.get(s.id) ?? [],
        }));
      }
    } catch {
      // tabel ontbreekt nog
    }
  }

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col bg-bg">
      <header
        className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-bg/90 px-5 pb-3 backdrop-blur pt-[calc(0.75rem+var(--st))]"
      >
        <div className="flex items-center gap-2">
          <Link href="/team/map" className="text-sm text-fg-muted hover:text-fg">
            ←
          </Link>
          <h1 className="text-lg font-bold">
            {isFinished ? (
              <>
                <span className="text-gradient">All Squads</span> feed
              </>
            ) : (
              <>
                <span className="text-gradient">Your</span> feed
              </>
            )}
          </h1>
        </div>
        {!isFinished && (
          <span className="text-xs font-bold" style={{ color: team.color }}>
            @{team.name}
          </span>
        )}
        {isFinished && (
          <span className="rounded-full bg-gradient-tiktok px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white">
            spel afgelopen
          </span>
        )}
      </header>

      {submissions.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-8 py-20 text-center">
          <p className="text-fg-muted">
            {isFinished
              ? "Nog geen approved posts."
              : "Nog geen posts. Tap een drop op de map of doe een quest."}
          </p>
        </div>
      ) : (
        <FeedStream
          teamId={teamId}
          submissions={submissions}
          teamName={team.name}
          teamColor={team.color}
          teamAvatar={team.team_photo_url}
        />
      )}

      <TeamBottomNav active="feed" fixed />
    </main>
  );
}
