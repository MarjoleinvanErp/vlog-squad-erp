import Link from "next/link";
import { redirect } from "next/navigation";
import { getTeamSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import { TeamBottomNav } from "../bottom-nav";
import { MessagesStream, type MessageRow } from "./messages-stream";
import { ReplyForm } from "./reply-form";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const teamId = await getTeamSession();
  if (!teamId) redirect("/team");

  const sb = supabaseService();
  const { data: team } = await sb
    .from("teams")
    .select("event_id")
    .eq("id", teamId)
    .maybeSingle();
  if (!team) redirect("/team");
  const eventId = (team as { event_id: string }).event_id;

  const { data: eventRow } = await sb
    .from("events")
    .select("state")
    .eq("id", eventId)
    .maybeSingle();
  const isFinished = (eventRow as { state?: string } | null)?.state === "finished";

  // Ouder-berichten (team_id null) + eigen antwoorden; niet die van
  // andere teams.
  const { data: rows } = await sb
    .from("broadcast_messages")
    .select("id, body, created_at, team_id")
    .eq("event_id", eventId)
    .or(`team_id.is.null,team_id.eq.${teamId}`)
    .order("created_at", { ascending: false });
  const messages = (rows ?? []) as MessageRow[];

  return (
    <main
      className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-6 pt-[calc(1.5rem+var(--st))]"
      style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}
    >
      <Link href="/team/map" className="text-sm text-fg-muted hover:text-fg">
        ← map
      </Link>
      <h1 className="text-3xl font-bold">
        <span className="text-gradient">Berichten</span>
      </h1>

      {isFinished && (
        <Link
          href="/team/ranking"
          className="rounded-2xl border-2 border-pink bg-pink/10 px-5 py-4 text-center font-bold text-pink glow-pink"
        >
          🏆 Bekijk de eindstand →
        </Link>
      )}

      <ReplyForm />

      <MessagesStream eventId={eventId} teamId={teamId} initial={messages} />

      <TeamBottomNav active="messages" fixed />
    </main>
  );
}
