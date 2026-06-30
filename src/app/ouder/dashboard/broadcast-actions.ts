"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth/session";
import { sendPush } from "@/lib/push";

export type BroadcastState = { ok?: boolean; error?: string | null };

export async function sendBroadcastAction(
  _prev: BroadcastState,
  formData: FormData
): Promise<BroadcastState> {
  const eventId = await getAdminSession();
  if (!eventId) return { error: "Niet ingelogd" };

  const body = String(formData.get("body") ?? "").trim().slice(0, 280);
  if (!body) return { error: "Bericht is leeg" };

  const sb = supabaseService();
  const { error } = await sb
    .from("broadcast_messages")
    .insert({ event_id: eventId, body });
  if (error) return { error: error.message };

  // Push best-effort naar alle squads van dit event.
  try {
    const { data: teams } = await sb
      .from("teams")
      .select("id")
      .eq("event_id", eventId);
    const teamIds = ((teams ?? []) as Array<{ id: string }>).map((t) => t.id);
    if (teamIds.length > 0) {
      const { data: subs } = await sb
        .from("push_subscriptions")
        .select("endpoint, subscription")
        .in("team_id", teamIds);
      const result = await sendPush(
        (subs ?? []) as Array<{ endpoint: string; subscription: never }>,
        {
          title: "📣 Bericht van de ouders",
          body: body.slice(0, 120),
          url: "/team/messages",
          tag: "broadcast",
        } as never
      );
      if (result.expired.length > 0) {
        await sb
          .from("push_subscriptions")
          .delete()
          .in("endpoint", result.expired);
      }
    }
  } catch {
    // push best-effort
  }

  revalidatePath("/ouder/dashboard");
  revalidatePath("/team/messages");
  return { ok: true };
}
