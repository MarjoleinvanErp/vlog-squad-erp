import Link from "next/link";
import { redirect } from "next/navigation";
import { getTeamSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import { TeamBottomNav } from "../bottom-nav";
import { FeedStream } from "./feed-stream";

type FeedRow = {
  id: string;
  status: "pending" | "approved" | "rejected";
  awarded_points: number | null;
  photo_url: string | null;
  text_answer: string | null;
  submitted_at: string;
  task_title: string | null;
  task_type: string | null;
};

export default async function FeedPage() {
  const teamId = await getTeamSession();
  if (!teamId) redirect("/team");

  const sb = supabaseService();
  const { data: teamData } = await sb
    .from("teams")
    .select("name, color, team_photo_url")
    .eq("id", teamId)
    .maybeSingle();

  const team = teamData as {
    name: string;
    color: string;
    team_photo_url: string | null;
  } | null;

  const { data } = await sb
    .from("submissions")
    .select(
      "id, status, awarded_points, photo_url, text_answer, submitted_at, tasks(title, type)"
    )
    .eq("team_id", teamId)
    .order("submitted_at", { ascending: false });

  type RawRow = {
    id: string;
    status: "pending" | "approved" | "rejected";
    awarded_points: number | null;
    photo_url: string | null;
    text_answer: string | null;
    submitted_at: string;
    tasks:
      | { title: string; type: string }
      | { title: string; type: string }[]
      | null;
  };

  const submissions: FeedRow[] = ((data ?? []) as unknown as RawRow[]).map(
    (r) => {
      const task = Array.isArray(r.tasks) ? r.tasks[0] ?? null : r.tasks;
      return {
        id: r.id,
        status: r.status,
        awarded_points: r.awarded_points,
        photo_url: r.photo_url,
        text_answer: r.text_answer,
        submitted_at: r.submitted_at,
        task_title: task?.title ?? null,
        task_type: task?.type ?? null,
      };
    }
  );

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col bg-bg">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-bg/90 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Link href="/team/map" className="text-sm text-fg-muted hover:text-fg">
            ←
          </Link>
          <h1 className="text-lg font-bold">
            <span className="text-gradient">Your</span> feed
          </h1>
        </div>
        {team && (
          <span className="text-xs font-bold" style={{ color: team.color }}>
            @{team.name}
          </span>
        )}
      </header>

      {submissions.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-8 py-20 text-center">
          <p className="text-fg-muted">
            Nog geen posts. Tap een drop op de map of doe een quest.
          </p>
        </div>
      ) : (
        <FeedStream
          teamId={teamId}
          submissions={submissions}
          teamName={team?.name ?? ""}
          teamColor={team?.color ?? "#fe2c55"}
          teamAvatar={team?.team_photo_url ?? null}
        />
      )}

      <TeamBottomNav active="feed" fixed />
    </main>
  );
}
