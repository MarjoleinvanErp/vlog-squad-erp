"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { getTeamSession } from "@/lib/auth/session";
import { sendPush } from "@/lib/push";

export async function updateTeamLocationAction(
  lat: number,
  lng: number,
  accuracy: number | null
) {
  const teamId = await getTeamSession();
  if (!teamId) return;
  if (!isFinite(lat) || !isFinite(lng)) return;

  const sb = supabaseService();
  await sb.from("team_locations").upsert({
    team_id: teamId,
    lat,
    lng,
    accuracy: accuracy ?? null,
    updated_at: new Date().toISOString(),
  });
}

export type ArrivalResult = {
  ok: boolean;
  order?: number;
  bonus?: number;
  locationName?: string;
};

export async function recordArrivalAction(
  locationId: string
): Promise<ArrivalResult> {
  const teamId = await getTeamSession();
  if (!teamId) return { ok: false };

  const sb = supabaseService();

  const { data: existing } = await sb
    .from("location_visits")
    .select("id")
    .eq("team_id", teamId)
    .eq("location_id", locationId)
    .maybeSingle();
  if (existing) return { ok: false };

  const { data: locData } = await sb
    .from("locations")
    .select("*")
    .eq("id", locationId)
    .maybeSingle();
  if (!locData) return { ok: false };
  const loc = locData as {
    name: string;
    arrival_points: number;
    bonus_first: number;
    bonus_second: number;
    bonus_third: number;
  };

  const { count } = await sb
    .from("location_visits")
    .select("id", { count: "exact", head: true })
    .eq("location_id", locationId);
  const order = (count ?? 0) + 1;

  let bonus = loc.arrival_points;
  if (order === 1) bonus += loc.bonus_first;
  else if (order === 2) bonus += loc.bonus_second;
  else if (order === 3) bonus += loc.bonus_third;

  const { error } = await sb.from("location_visits").insert({
    team_id: teamId,
    location_id: locationId,
    order_position: order,
    bonus_awarded: bonus,
  });
  if (error) return { ok: false };

  revalidatePath("/team/map");
  revalidatePath("/team/feed");
  revalidatePath("/team/ranking");
  revalidatePath(`/team/location/${locationId}`);
  revalidatePath("/ouder/dashboard");

  // Push naar squad (alleen tonen als app niet zichtbaar is)
  // en naar ouders (altijd tonen).
  try {
    const { data: teamRow } = await sb
      .from("teams")
      .select("name, event_id")
      .eq("id", teamId)
      .maybeSingle();
    const team = teamRow as { name: string; event_id: string } | null;

    if (team) {
      const ordinal =
        order === 1 ? "1e team!" : order === 2 ? "2e team" : `${order}e team`;

      const { data: teamSubs } = await sb
        .from("push_subscriptions")
        .select("endpoint, subscription")
        .eq("team_id", teamId);

      const { data: ouderSubs } = await sb
        .from("push_subscriptions")
        .select("endpoint, subscription")
        .eq("event_id", team.event_id)
        .eq("is_ouder", true);

      const teamResults = await sendPush(
        (teamSubs ?? []) as Array<{ endpoint: string; subscription: never }>,
        {
          title: `${ordinal} bij ${loc.name}`,
          body: `+${bonus} likes`,
          url: "/team/map",
          tag: `arrival-${locationId}`,
          skipIfFocused: true,
        } as never
      );
      const ouderResults = await sendPush(
        (ouderSubs ?? []) as Array<{ endpoint: string; subscription: never }>,
        {
          title: `@${team.name} bij ${loc.name}`,
          body: `${ordinal} · +${bonus} likes`,
          url: "/ouder/dashboard",
          tag: `arrival-${locationId}-${teamId}`,
        } as never
      );

      const expired = [...teamResults.expired, ...ouderResults.expired];
      if (expired.length > 0) {
        await sb
          .from("push_subscriptions")
          .delete()
          .in("endpoint", expired);
      }
    }
  } catch {
    // push is best-effort, niet kritiek
  }

  return { ok: true, order, bonus, locationName: loc.name };
}
