"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth/session";

export type CreateTaskState = { ok?: boolean; error?: string | null };

const VALID_TYPES = ["photo", "text", "multiple_choice", "arrival"] as const;
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

  const sb = supabaseService();
  const { error } = await sb.from("tasks").insert({
    event_id: eventId,
    location_id: locationId,
    title,
    description,
    type: typeRaw,
    max_points: maxPoints,
    options,
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
