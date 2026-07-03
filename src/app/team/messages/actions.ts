"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { getTeamSession } from "@/lib/auth/session";
import { sendPush } from "@/lib/push";

export type ReplyState = { ok?: boolean; error?: string | null };

export async function sendTeamMessageAction(
  _prev: ReplyState,
  formData: FormData
): Promise<ReplyState> {
  const teamId = await getTeamSession();
  if (!teamId) return { error: "Niet ingelogd" };

  const body = String(formData.get("body") ?? "").trim().slice(0, 280);
  if (!body) return { error: "Bericht is leeg" };

  const sb = supabaseService();
  const { data: teamData } = await sb
    .from("teams")
    .select("event_id, name")
    .eq("id", teamId)
    .maybeSingle();
  if (!teamData) return { error: "Team niet gevonden" };
  const team = teamData as { event_id: string; name: string };

  const { error } = await sb
    .from("broadcast_messages")
    .insert({ event_id: team.event_id, team_id: teamId, body });
  if (error) return { error: error.message };

  // Push best-effort naar de ouders.
  try {
    const { data: subs } = await sb
      .from("push_subscriptions")
      .select("endpoint, subscription")
      .eq("event_id", team.event_id)
      .eq("is_ouder", true);
    const result = await sendPush(
      (subs ?? []) as Array<{ endpoint: string; subscription: never }>,
      {
        title: `💬 @${team.name}`,
        body: body.slice(0, 120),
        url: "/ouder/dashboard",
        tag: `team-reply-${teamId}`,
      } as never
    );
    if (result.expired.length > 0) {
      await sb
        .from("push_subscriptions")
        .delete()
        .in("endpoint", result.expired);
    }
  } catch {
    // push best-effort
  }

  revalidatePath("/team/messages");
  revalidatePath("/ouder/dashboard");
  return { ok: true };
}
