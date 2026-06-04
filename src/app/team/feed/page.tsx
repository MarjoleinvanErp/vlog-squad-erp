import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getTeamSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import { TeamBottomNav } from "../bottom-nav";

export default async function FeedPage() {
  const teamId = await getTeamSession();
  if (!teamId) redirect("/team");

  const sb = supabaseService();
  const { data } = await sb
    .from("submissions")
    .select(
      "id, status, awarded_points, photo_url, text_answer, choice_index, submitted_at, tasks(title, type, max_points)"
    )
    .eq("team_id", teamId)
    .order("submitted_at", { ascending: false });

  type FeedRow = {
    id: string;
    status: "pending" | "approved" | "rejected";
    awarded_points: number | null;
    photo_url: string | null;
    text_answer: string | null;
    submitted_at: string;
    tasks:
      | { title: string; type: string; max_points: number }
      | { title: string; type: string; max_points: number }[]
      | null;
  };

  const raw = (data ?? []) as unknown as FeedRow[];
  const submissions = raw.map((r) => {
    const task = Array.isArray(r.tasks) ? r.tasks[0] ?? null : r.tasks;
    return { ...r, tasks: task };
  });

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-6 pt-6 pb-24">
      <Link href="/team/map" className="text-sm text-fg-muted hover:text-fg">
        ← map
      </Link>
      <h1 className="text-3xl font-bold">
        <span className="text-gradient">Your</span> feed
      </h1>

      {submissions.length === 0 ? (
        <p className="rounded-2xl border border-border bg-bg-card p-6 text-fg-muted">
          Nog geen posts. Tap een drop op de map en post je eerste.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {submissions.map((s) => (
            <li
              key={s.id}
              className="overflow-hidden rounded-3xl border border-border bg-bg-card"
            >
              {s.photo_url && (
                <div className="relative aspect-square w-full bg-black">
                  <Image
                    src={s.photo_url}
                    alt=""
                    fill
                    sizes="(max-width: 480px) 100vw, 480px"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex flex-col gap-2 p-4">
                <p className="text-xs uppercase tracking-widest text-fg-muted">
                  {s.tasks?.title ?? "challenge"}
                </p>
                {s.text_answer && (
                  <p className="whitespace-pre-line text-sm">{s.text_answer}</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-fg-dim">
                    {new Date(s.submitted_at).toLocaleTimeString("nl-NL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {s.status === "approved" && (
                    <span className="font-bold text-pink">
                      +{s.awarded_points ?? 0} likes
                    </span>
                  )}
                  {s.status === "pending" && (
                    <span className="text-yellow-400">in review</span>
                  )}
                  {s.status === "rejected" && (
                    <span className="text-fg-dim">rejected</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <TeamBottomNav active="feed" fixed />
    </main>
  );
}
