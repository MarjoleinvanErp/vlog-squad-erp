"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth/session";
import { sendPush } from "@/lib/push";

async function verifyOwnership(submissionId: string, eventId: string) {
  const sb = supabaseService();
  const { data } = await sb
    .from("submissions")
    .select("id, team_id, teams!inner(event_id)")
    .eq("id", submissionId)
    .maybeSingle();
  if (!data) return null;
  const sub = data as unknown as {
    id: string;
    team_id: string;
    teams: { event_id: string } | { event_id: string }[];
  };
  const teamEvent = Array.isArray(sub.teams)
    ? sub.teams[0]?.event_id
    : sub.teams?.event_id;
  if (teamEvent !== eventId) return null;
  return sub.id;
}

async function loadTaskTitle(submissionId: string): Promise<string> {
  const sb = supabaseService();
  const { data } = await sb
    .from("submissions")
    .select("tasks(title)")
    .eq("id", submissionId)
    .maybeSingle();
  if (!data) return "Je drop";
  const raw = (data as { tasks: { title: string } | { title: string }[] | null })
    .tasks;
  if (!raw) return "Je drop";
  const task = Array.isArray(raw) ? raw[0] : raw;
  return task?.title ?? "Je drop";
}

async function notifyTeamOfReview(opts: {
  submissionId: string;
  title: string;
  body: string;
}) {
  const sb = supabaseService();
  try {
    const { data: sub } = await sb
      .from("submissions")
      .select("team_id")
      .eq("id", opts.submissionId)
      .maybeSingle();
    const teamId = (sub as { team_id: string } | null)?.team_id;
    if (!teamId) return;

    const { data: subs } = await sb
      .from("push_subscriptions")
      .select("endpoint, subscription")
      .eq("team_id", teamId);

    const result = await sendPush(
      (subs ?? []) as Array<{ endpoint: string; subscription: never }>,
      {
        title: opts.title,
        body: opts.body,
        url: "/team/feed",
        tag: `review-${opts.submissionId}`,
      } as never
    );

    if (result.expired.length > 0) {
      await sb
        .from("push_subscriptions")
        .delete()
        .in("endpoint", result.expired);
    }
  } catch {
    // push is best-effort
  }
}

export async function approveSubmissionAction(formData: FormData) {
  const eventId = await getAdminSession();
  if (!eventId) return;

  const id = String(formData.get("id") ?? "");
  const points = Math.max(0, Number(formData.get("points") ?? 0));
  const reviewer = String(formData.get("reviewer") ?? "ouder").trim() || "ouder";
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!id) return;
  const ownedId = await verifyOwnership(id, eventId);
  if (!ownedId) return;

  const sb = supabaseService();
  await sb
    .from("submissions")
    .update({
      status: "approved",
      awarded_points: points,
      reviewed_by: reviewer,
      reviewed_at: new Date().toISOString(),
      review_note: note,
    })
    .eq("id", id);

  const taskTitle = await loadTaskTitle(id);

  await notifyTeamOfReview({
    submissionId: id,
    title: `+${points} likes! 🔥`,
    body: `${taskTitle} is goedgekeurd`,
  });

  revalidatePath("/ouder/dashboard");
  revalidatePath("/team/feed");
  revalidatePath("/team/ranking");
  redirect("/ouder/dashboard");
}

export async function rejectSubmissionAction(formData: FormData) {
  const eventId = await getAdminSession();
  if (!eventId) return;

  const id = String(formData.get("id") ?? "");
  const reviewer = String(formData.get("reviewer") ?? "ouder").trim() || "ouder";
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!id) return;
  const ownedId = await verifyOwnership(id, eventId);
  if (!ownedId) return;

  const sb = supabaseService();
  await sb
    .from("submissions")
    .update({
      status: "rejected",
      awarded_points: 0,
      reviewed_by: reviewer,
      reviewed_at: new Date().toISOString(),
      review_note: note,
    })
    .eq("id", id);

  const taskTitle = await loadTaskTitle(id);

  await notifyTeamOfReview({
    submissionId: id,
    title: "Drop niet goedgekeurd",
    body: note ? `${taskTitle} — ${note}` : `${taskTitle} werd afgewezen`,
  });

  revalidatePath("/ouder/dashboard");
  revalidatePath("/team/feed");
  redirect("/ouder/dashboard");
}
