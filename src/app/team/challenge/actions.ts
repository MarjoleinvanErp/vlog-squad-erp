"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { getTeamSession } from "@/lib/auth/session";

export type SubmitState = { ok?: boolean; error?: string | null };

export async function submitChallengeAction(
  _prev: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const teamId = await getTeamSession();
  if (!teamId) return { error: "Niet ingelogd" };

  const taskId = String(formData.get("task_id") ?? "");
  if (!taskId) return { error: "Geen challenge" };

  const sb = supabaseService();

  const { data: taskData } = await sb
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();
  if (!taskData) return { error: "Challenge niet gevonden" };
  const task = taskData as {
    id: string;
    type: "photo" | "text" | "multiple_choice" | "arrival";
    max_points: number;
    options: { choices: string[]; correct: number } | null;
    location_id: string | null;
  };

  const { data: existing } = await sb
    .from("submissions")
    .select("id")
    .eq("team_id", teamId)
    .eq("task_id", taskId)
    .maybeSingle();
  if (existing) return { error: "Je hebt deze challenge al ingediend" };

  if (task.type === "multiple_choice") {
    const choiceIndex = Number(formData.get("choice_index") ?? -1);
    if (!task.options || choiceIndex < 0 || choiceIndex >= task.options.choices.length) {
      return { error: "Maak een keuze" };
    }
    const correct = choiceIndex === task.options.correct;
    const { error } = await sb.from("submissions").insert({
      team_id: teamId,
      task_id: taskId,
      choice_index: choiceIndex,
      status: correct ? "approved" : "rejected",
      awarded_points: correct ? task.max_points : 0,
      reviewed_by: "auto",
      reviewed_at: new Date().toISOString(),
    });
    if (error) return { error: error.message };
  } else if (task.type === "text") {
    const text = String(formData.get("text_answer") ?? "").trim();
    if (!text) return { error: "Vul een antwoord in" };
    const { error } = await sb.from("submissions").insert({
      team_id: teamId,
      task_id: taskId,
      text_answer: text,
      status: "pending",
    });
    if (error) return { error: error.message };
  } else if (task.type === "photo") {
    const photo = formData.get("photo");
    if (!(photo instanceof File) || photo.size === 0) {
      return { error: "Voeg een foto/video toe" };
    }
    const ext = photo.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${teamId}/${taskId}-${Date.now()}.${ext}`;
    const { error: uploadError } = await sb.storage
      .from("submission-photos")
      .upload(path, photo, {
        contentType: photo.type || "image/jpeg",
        upsert: false,
      });
    if (uploadError) return { error: `Upload mislukt: ${uploadError.message}` };
    const {
      data: { publicUrl },
    } = sb.storage.from("submission-photos").getPublicUrl(path);
    const { error } = await sb.from("submissions").insert({
      team_id: teamId,
      task_id: taskId,
      photo_url: publicUrl,
      status: "pending",
    });
    if (error) return { error: error.message };
  } else {
    return { error: "Dit type challenge submit je niet handmatig" };
  }

  if (task.location_id) {
    revalidatePath(`/team/location/${task.location_id}`);
  }
  revalidatePath("/team/feed");
  revalidatePath("/team/ranking");

  if (task.location_id) {
    redirect(`/team/location/${task.location_id}`);
  }
  redirect("/team/feed");
}
