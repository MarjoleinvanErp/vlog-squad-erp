"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth/session";

export async function acknowledgeIncidentAction(formData: FormData) {
  const eventId = await getAdminSession();
  if (!eventId) return;

  const id = String(formData.get("id") ?? "");
  const who = String(formData.get("reviewer") ?? "ouder").trim() || "ouder";
  if (!id) return;

  const sb = supabaseService();

  const { data: inc } = await sb
    .from("incidents")
    .select("id, team_id, teams!inner(event_id)")
    .eq("id", id)
    .maybeSingle();
  if (!inc) return;
  const row = inc as unknown as {
    id: string;
    teams: { event_id: string } | { event_id: string }[];
  };
  const teamEvent = Array.isArray(row.teams)
    ? row.teams[0]?.event_id
    : row.teams?.event_id;
  if (teamEvent !== eventId) return;

  await sb
    .from("incidents")
    .update({
      acknowledged_by: who,
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/ouder/dashboard");
  revalidatePath("/ouder/map");
}
