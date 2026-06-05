"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { getTeamSession } from "@/lib/auth/session";
import { sendPush } from "@/lib/push";

export type SOSResult = { ok: boolean; error?: string };

export async function reportSOSAction(
  lat: number | null,
  lng: number | null
): Promise<SOSResult> {
  const teamId = await getTeamSession();
  if (!teamId) return { ok: false, error: "Niet ingelogd" };

  const sb = supabaseService();
  const { error } = await sb.from("incidents").insert({
    team_id: teamId,
    type: "sos",
    lat: lat != null && isFinite(lat) ? lat : null,
    lng: lng != null && isFinite(lng) ? lng : null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/ouder/dashboard");
  revalidatePath("/ouder/map");

  // Push naar alle ouder-subscriptions van dit event
  try {
    const { data: teamRow } = await sb
      .from("teams")
      .select("name, event_id")
      .eq("id", teamId)
      .maybeSingle();
    const team = teamRow as { name: string; event_id: string } | null;
    if (team) {
      const { data: subs } = await sb
        .from("push_subscriptions")
        .select("endpoint, subscription")
        .eq("event_id", team.event_id)
        .eq("is_ouder", true);

      const result = await sendPush(
        (subs ?? []) as Array<{ endpoint: string; subscription: never }>,
        {
          title: `SOS van @${team.name}`,
          body: "Ze hebben hulp nodig — bekijk dashboard",
          url: "/ouder/dashboard",
          tag: `sos-${teamId}-${Date.now()}`,
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

  return { ok: true };
}
