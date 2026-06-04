"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth/session";

export type UpdateEventState = { ok?: boolean; error?: string | null };
export type ResetState = {
  ok?: boolean;
  error?: string | null;
  message?: string | null;
};

export async function updateEventAction(
  _prev: UpdateEventState,
  formData: FormData
): Promise<UpdateEventState> {
  const eventId = await getAdminSession();
  if (!eventId) return { error: "Niet ingelogd" };

  const name = String(formData.get("name") ?? "").trim();
  const startsAt = String(formData.get("starts_at") ?? "").trim();
  const endsAt = String(formData.get("ends_at") ?? "").trim();
  const startLat = Number(formData.get("start_lat") ?? 0);
  const startLng = Number(formData.get("start_lng") ?? 0);
  const active = formData.get("active") === "on";

  if (!name) return { error: "Naam is verplicht" };
  if (!startsAt || !endsAt) return { error: "Start- en eindtijd verplicht" };

  const sb = supabaseService();
  const { error } = await sb
    .from("events")
    .update({
      name,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      start_lat: isFinite(startLat) ? startLat : null,
      start_lng: isFinite(startLng) ? startLng : null,
      active,
    })
    .eq("id", eventId);

  if (error) return { error: error.message };
  revalidatePath("/admin/event");
  revalidatePath("/admin");
  return { ok: true };
}

export async function resetTestDataAction(
  _prev: ResetState,
  _formData: FormData
): Promise<ResetState> {
  const eventId = await getAdminSession();
  if (!eventId) return { error: "Niet ingelogd" };

  const sb = supabaseService();

  const { data: teamsData, error: teamsErr } = await sb
    .from("teams")
    .select("id")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (teamsErr) return { error: teamsErr.message };
  const teams = (teamsData ?? []) as Array<{ id: string }>;
  const teamIds = teams.map((t) => t.id);

  let subCount = 0;
  let visitCount = 0;
  let posCount = 0;
  let incCount = 0;

  if (teamIds.length > 0) {
    const [r1, r2, r3, r4] = await Promise.all([
      sb.from("submissions").delete({ count: "exact" }).in("team_id", teamIds),
      sb
        .from("location_visits")
        .delete({ count: "exact" })
        .in("team_id", teamIds),
      sb
        .from("team_locations")
        .delete({ count: "exact" })
        .in("team_id", teamIds),
      sb.from("incidents").delete({ count: "exact" }).in("team_id", teamIds),
    ]);
    subCount = r1.count ?? 0;
    visitCount = r2.count ?? 0;
    posCount = r3.count ?? 0;
    incCount = r4.count ?? 0;

    // Two-pass team rename om unique-conflicts te vermijden, parallel binnen elke pass.
    const stamp = Date.now();
    await Promise.all(
      teams.map((t, i) =>
        sb
          .from("teams")
          .update({
            name: `__reset_${i}_${stamp}`,
            team_photo_url: null,
          })
          .eq("id", t.id)
      )
    );
    await Promise.all(
      teams.map((t, i) =>
        sb
          .from("teams")
          .update({ name: `Squad ${i + 1}` })
          .eq("id", t.id)
      )
    );
  }

  revalidatePath("/admin/event");
  revalidatePath("/admin/teams");
  revalidatePath("/ouder/dashboard");
  revalidatePath("/ouder/map");
  revalidatePath("/team/map");
  revalidatePath("/team/feed");
  revalidatePath("/team/ranking");
  revalidatePath("/team/quests");

  return {
    ok: true,
    message: `Gewist: ${subCount} posts, ${visitCount} visits, ${posCount} GPS-pings, ${incCount} incidents. ${teams.length} squads gereset.`,
  };
}
