"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth/session";

export type CreateLocationState = { ok?: boolean; error?: string | null };

export async function createLocationAction(
  _prev: CreateLocationState,
  formData: FormData
): Promise<CreateLocationState> {
  const eventId = await getAdminSession();
  if (!eventId) return { error: "Niet ingelogd" };

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const lat = Number(formData.get("lat") ?? NaN);
  const lng = Number(formData.get("lng") ?? NaN);
  const radius = Number(formData.get("radius_meters") ?? 30);
  const arrivalPoints = Number(formData.get("arrival_points") ?? 10);
  const bonusFirst = Number(formData.get("bonus_first") ?? 5);
  const bonusSecond = Number(formData.get("bonus_second") ?? 3);
  const bonusThird = Number(formData.get("bonus_third") ?? 1);

  if (!name) return { error: "Naam is verplicht" };
  if (!isFinite(lat) || !isFinite(lng)) {
    return { error: "Klik een punt op de kaart om coördinaten te kiezen" };
  }

  const sb = supabaseService();
  const { error } = await sb.from("locations").insert({
    event_id: eventId,
    name,
    description: description || null,
    lat,
    lng,
    radius_meters: radius,
    arrival_points: arrivalPoints,
    bonus_first: bonusFirst,
    bonus_second: bonusSecond,
    bonus_third: bonusThird,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/locations");
  return { ok: true };
}

export async function deleteLocationAction(formData: FormData) {
  const eventId = await getAdminSession();
  if (!eventId) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const sb = supabaseService();
  await sb.from("locations").delete().eq("id", id).eq("event_id", eventId);
  revalidatePath("/admin/locations");
}
