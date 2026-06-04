"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth/session";

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

  revalidatePath("/ouder/dashboard");
  revalidatePath("/team/feed");
  redirect("/ouder/dashboard");
}
