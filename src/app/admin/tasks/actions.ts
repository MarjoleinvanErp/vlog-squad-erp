"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

type ParsedTask = {
  title: string;
  description: string;
  type: TaskType;
  max_points: number;
  location_id: string | null;
  options: { choices: string[]; correct: number } | null;
  min_photos: number | null;
  max_photos: number | null;
  min_seconds: number | null;
  max_seconds: number | null;
};

function parseTaskFields(
  formData: FormData
): { ok: true; value: ParsedTask } | { ok: false; error: string } {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "");
  const maxPoints = Number(formData.get("max_points") ?? 10);
  const locationIdRaw = String(formData.get("location_id") ?? "");
  const locationId = locationIdRaw === "" ? null : locationIdRaw;
  const optionsRaw = String(formData.get("options") ?? "").trim();
  const correctIndexRaw = Number(formData.get("correct_index") ?? 0);

  if (!title) return { ok: false, error: "Titel is verplicht" };
  if (!description) return { ok: false, error: "Beschrijving is verplicht" };
  if (!isTaskType(typeRaw)) return { ok: false, error: "Ongeldig type" };

  let options: { choices: string[]; correct: number } | null = null;
  if (typeRaw === "multiple_choice") {
    const choices = optionsRaw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (choices.length < 2) {
      return {
        ok: false,
        error: "Meerkeuze heeft minimaal 2 opties (één per regel)",
      };
    }
    if (correctIndexRaw < 0 || correctIndexRaw >= choices.length) {
      return {
        ok: false,
        error: "Index van juiste antwoord ligt buiten bereik",
      };
    }
    options = { choices, correct: correctIndexRaw };
  }

  if (typeRaw === "arrival" && !locationId) {
    return { ok: false, error: "Arrival-challenge heeft een locatie nodig" };
  }

  let minPhotos: number | null = null;
  let maxPhotos: number | null = null;
  let minSeconds: number | null = null;
  let maxSeconds: number | null = null;

  if (typeRaw === "photo") {
    const max = Number(formData.get("max_photos") ?? 1);
    if (!Number.isInteger(max) || max < 1 || max > 10) {
      return { ok: false, error: "Aantal foto's moet tussen 1 en 10 zijn" };
    }
    const minRaw = formData.get("min_photos");
    const min = minRaw == null ? max : Number(minRaw);
    if (!Number.isInteger(min) || min < 1 || min > max) {
      return {
        ok: false,
        error: "Min foto's moet ≥ 1 en ≤ max foto's zijn",
      };
    }
    minPhotos = min;
    maxPhotos = max;
  }

  if (typeRaw === "video") {
    const max = Number(formData.get("max_seconds") ?? 10);
    if (!Number.isInteger(max) || max < 1 || max > 60) {
      return { ok: false, error: "Max seconden moet tussen 1 en 60 zijn" };
    }
    const minRaw = formData.get("min_seconds");
    const min = minRaw == null ? 1 : Number(minRaw);
    if (!Number.isInteger(min) || min < 1 || min > max) {
      return {
        ok: false,
        error: "Min seconden moet ≥ 1 en ≤ max seconden zijn",
      };
    }
    minSeconds = min;
    maxSeconds = max;
  }

  return {
    ok: true,
    value: {
      title,
      description,
      type: typeRaw,
      max_points: maxPoints,
      location_id: locationId,
      options,
      min_photos: minPhotos,
      max_photos: maxPhotos,
      min_seconds: minSeconds,
      max_seconds: maxSeconds,
    },
  };
}

export async function createTaskAction(
  _prev: CreateTaskState,
  formData: FormData
): Promise<CreateTaskState> {
  const eventId = await getAdminSession();
  if (!eventId) return { error: "Niet ingelogd" };

  const parsed = parseTaskFields(formData);
  if (!parsed.ok) return { error: parsed.error };
  const f = parsed.value;

  const sb = supabaseService();
  const { error } = await sb.from("tasks").insert({
    event_id: eventId,
    location_id: f.location_id,
    title: f.title,
    description: f.description,
    type: f.type,
    max_points: f.max_points,
    options: f.options,
    min_photos: f.min_photos,
    max_photos: f.max_photos,
    min_seconds: f.min_seconds,
    max_seconds: f.max_seconds,
    requires_approval:
      f.type !== "multiple_choice" && f.type !== "arrival",
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/tasks");
  return { ok: true };
}

export async function updateTaskAction(
  _prev: CreateTaskState,
  formData: FormData
): Promise<CreateTaskState> {
  const eventId = await getAdminSession();
  if (!eventId) return { error: "Niet ingelogd" };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Geen challenge-ID" };

  const parsed = parseTaskFields(formData);
  if (!parsed.ok) return { error: parsed.error };
  const f = parsed.value;

  const sb = supabaseService();
  const { error } = await sb
    .from("tasks")
    .update({
      location_id: f.location_id,
      title: f.title,
      description: f.description,
      type: f.type,
      max_points: f.max_points,
      options: f.options,
      min_photos: f.min_photos,
      max_photos: f.max_photos,
      min_seconds: f.min_seconds,
      max_seconds: f.max_seconds,
      requires_approval:
        f.type !== "multiple_choice" && f.type !== "arrival",
    })
    .eq("id", id)
    .eq("event_id", eventId);

  if (error) return { error: error.message };
  revalidatePath("/admin/tasks");
  revalidatePath(`/admin/tasks/${id}`);
  revalidatePath("/team/quests");
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
  redirect("/admin/tasks");
}
