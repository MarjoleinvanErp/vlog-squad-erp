"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth/session";
import { sendPush } from "@/lib/push";

export type PauseState = { ok?: boolean; error?: string | null };

export async function pauseEventAction(
  _prev: PauseState,
  formData: FormData
): Promise<PauseState> {
  const eventId = await getAdminSession();
  if (!eventId) return { error: "Niet ingelogd" };

  const message = String(formData.get("message") ?? "")
    .trim()
    .slice(0, 200);
  const latRaw = formData.get("lat");
  const lngRaw = formData.get("lng");
  const lat = latRaw ? Number(latRaw) : NaN;
  const lng = lngRaw ? Number(lngRaw) : NaN;
  const hasLoc = isFinite(lat) && isFinite(lng);

  if (!message) return { error: "Vul een bericht in" };

  const sb = supabaseService();
  const { error } = await sb
    .from("events")
    .update({
      state: "paused",
      rally_message: message,
      rally_lat: hasLoc ? lat : null,
      rally_lng: hasLoc ? lng : null,
      paused_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  if (error) return { error: error.message };

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
          title: "SPEL GESTOPT",
          body: message,
          url: "/team/map",
          tag: "event-pause",
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
  revalidatePath("/team/map");
  revalidatePath("/team/quests");
  revalidatePath("/team/feed");
  return { ok: true };
}

export async function resumeEventAction(
  _prev: PauseState,
  _formData: FormData
): Promise<PauseState> {
  const eventId = await getAdminSession();
  if (!eventId) return { error: "Niet ingelogd" };

  const sb = supabaseService();
  const { error } = await sb
    .from("events")
    .update({
      state: "running",
      rally_message: null,
      rally_lat: null,
      rally_lng: null,
      paused_at: null,
    })
    .eq("id", eventId);

  if (error) return { error: error.message };

  revalidatePath("/ouder/dashboard");
  revalidatePath("/team/map");
  revalidatePath("/team/quests");
  revalidatePath("/team/feed");
  return { ok: true };
}
