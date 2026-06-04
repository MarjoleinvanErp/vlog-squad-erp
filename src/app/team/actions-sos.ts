"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { getTeamSession } from "@/lib/auth/session";

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
  return { ok: true };
}
