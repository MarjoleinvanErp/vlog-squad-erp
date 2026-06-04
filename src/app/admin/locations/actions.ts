"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth/session";

export type LocationFormState = { ok?: boolean; error?: string | null };

function parseForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    lat: Number(formData.get("lat") ?? NaN),
    lng: Number(formData.get("lng") ?? NaN),
    radius: Number(formData.get("radius_meters") ?? 30),
    arrivalPoints: Number(formData.get("arrival_points") ?? 10),
    bonusFirst: Number(formData.get("bonus_first") ?? 5),
    bonusSecond: Number(formData.get("bonus_second") ?? 3),
    bonusThird: Number(formData.get("bonus_third") ?? 1),
  };
}

export async function createLocationAction(
  _prev: LocationFormState,
  formData: FormData
): Promise<LocationFormState> {
  const eventId = await getAdminSession();
  if (!eventId) return { error: "Niet ingelogd" };

  const f = parseForm(formData);
  if (!f.name) return { error: "Naam is verplicht" };
  if (!isFinite(f.lat) || !isFinite(f.lng)) {
    return { error: "Klik een punt op de kaart om coördinaten te kiezen" };
  }

  const sb = supabaseService();
  const { error } = await sb.from("locations").insert({
    event_id: eventId,
    name: f.name,
    description: f.description || null,
    lat: f.lat,
    lng: f.lng,
    radius_meters: f.radius,
    arrival_points: f.arrivalPoints,
    bonus_first: f.bonusFirst,
    bonus_second: f.bonusSecond,
    bonus_third: f.bonusThird,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/locations");
  return { ok: true };
}

export async function updateLocationAction(
  _prev: LocationFormState,
  formData: FormData
): Promise<LocationFormState> {
  const eventId = await getAdminSession();
  if (!eventId) return { error: "Niet ingelogd" };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Geen locatie ID" };

  const f = parseForm(formData);
  if (!f.name) return { error: "Naam is verplicht" };
  if (!isFinite(f.lat) || !isFinite(f.lng)) {
    return { error: "Coördinaten ontbreken — klik op de kaart" };
  }

  const sb = supabaseService();
  const { error } = await sb
    .from("locations")
    .update({
      name: f.name,
      description: f.description || null,
      lat: f.lat,
      lng: f.lng,
      radius_meters: f.radius,
      arrival_points: f.arrivalPoints,
      bonus_first: f.bonusFirst,
      bonus_second: f.bonusSecond,
      bonus_third: f.bonusThird,
    })
    .eq("id", id)
    .eq("event_id", eventId);

  if (error) return { error: error.message };
  revalidatePath("/admin/locations");
  revalidatePath(`/admin/locations/${id}`);
  revalidatePath("/team/map");
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
