"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth/session";

export type CreateTaskState = { ok?: boolean; error?: string | null };

const VALID_TYPES = [
  "photo",
  "video",
  "text",
  "multiple_choice",
  "arrival",
] as const;
type TaskType = (typeof VALID_TYPES)[number];

function isTaskType(v: string): v is TaskType {
  return (VALID_TYPES as readonly string[]).includes(v);
}

export async function createTaskAction(
  _prev: CreateTaskState,
  formData: FormData
): Promise<CreateTaskState> {
  const eventId = await getAdminSession();
  if (!eventId) return { error: "Niet ingelogd" };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "");
  const maxPoints = Number(formData.get("max_points") ?? 10);
  const locationIdRaw = String(formData.get("location_id") ?? "");
  const locationId = locationIdRaw === "" ? null : locationIdRaw;
  const optionsRaw = String(formData.get("options") ?? "").trim();
  const correctIndexRaw = Number(formData.get("correct_index") ?? 0);

  if (!title) return { error: "Titel is verplicht" };
  if (!description) return { error: "Beschrijving is verplicht" };
  if (!isTaskType(typeRaw)) return { error: "Ongeldig type" };

  let options: { choices: string[]; correct: number } | null = null;
  if (typeRaw === "multiple_choice") {
    const choices = optionsRaw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (choices.length < 2) {
      return { error: "Meerkeuze heeft minimaal 2 opties (één per regel)" };
    }
    if (correctIndexRaw < 0 || correctIndexRaw >= choices.length) {
      return { error: "Index van juiste antwoord ligt buiten bereik" };
    }
    options = { choices, correct: correctIndexRaw };
  }

  if (typeRaw === "arrival" && !locationId) {
    return { error: "Arrival-challenge heeft een locatie nodig" };
  }

  let minPhotos: number | null = null;
  let maxPhotos: number | null = null;
  let minSeconds: number | null = null;
  let maxSeconds: number | null = null;

  if (typeRaw === "photo") {
    const max = Number(formData.get("max_photos") ?? 1);
    if (!Number.isInteger(max) || max < 1 || max > 10) {
      return { error: "Aantal foto's moet tussen 1 en 10 zijn" };
    }
    const minRaw = formData.get("min_photos");
    const min = minRaw == null ? max : Number(minRaw);
    if (!Number.isInteger(min) || min < 1 || min > max) {
      return { error: "Min foto's moet ≥ 1 en ≤ max foto's zijn" };
    }
    minPhotos = min;
    maxPhotos = max;
  }

  if (typeRaw === "video") {
    const max = Number(formData.get("max_seconds") ?? 10);
    if (!Number.isInteger(max) || max < 1 || max > 60) {
      return { error: "Max seconden moet tussen 1 en 60 zijn" };
    }
    const minRaw = formData.get("min_seconds");
    const min = minRaw == null ? 1 : Number(minRaw);
    if (!Number.isInteger(min) || min < 1 || min > max) {
      return { error: "Min seconden moet ≥ 1 en ≤ max seconden zijn" };
    }
    minSeconds = min;
    maxSeconds = max;
  }

  const sb = supabaseService();
  const { error } = await sb.from("tasks").insert({
    event_id: eventId,
    location_id: locationId,
    title,
    description,
    type: typeRaw,
    max_points: maxPoints,
    options,
    min_photos: minPhotos,
    max_photos: maxPhotos,
    min_seconds: minSeconds,
    max_seconds: maxSeconds,
    requires_approval: typeRaw !== "multiple_choice" && typeRaw !== "arrival",
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/tasks");
  return { ok: true };
}

export async function deleteTaskAction(formData: FormData) {
  const eventId = await getAdminSession();
  if (!eventId) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const sb = supabaseService();
  await sb.from("tasks").delete().eq("id", id).eq("event_id", eventId);
  revalidatePath("/admin/tasks");
}
