"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth/session";

export type UpdateEventState = { ok?: boolean; error?: string | null };

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
