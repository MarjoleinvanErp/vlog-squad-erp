"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { getTeamSession } from "@/lib/auth/session";

export type SubmitState = {
  ok?: boolean;
  error?: string | null;
  redirect?: string | null;
};

export type SignedUpload = {
  ok: boolean;
  error?: string;
  signedUrl?: string;
  path?: string;
  token?: string;
};

function randomSuffix(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createSubmissionUploadUrl(
  taskId: string,
  ext: string
): Promise<SignedUpload> {
  const teamId = await getTeamSession();
  if (!teamId) return { ok: false, error: "Niet ingelogd" };
  if (!taskId) return { ok: false, error: "Geen challenge" };

  const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : "jpg";
  const path = `${teamId}/${taskId}-${Date.now()}-${randomSuffix()}.${safeExt}`;

  const sb = supabaseService();
  const { data, error } = await sb.storage
    .from("submission-photos")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return { ok: false, error: error?.message ?? "kan upload-url niet maken" };
  }
  return { ok: true, signedUrl: data.signedUrl, path: data.path, token: data.token };
}

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
    .select("*, events!inner(state)")
    .eq("id", taskId)
    .maybeSingle();
  if (!taskData) return { error: "Challenge niet gevonden" };
  const task = taskData as {
    id: string;
    type: "photo" | "video" | "text" | "multiple_choice" | "arrival";
    max_points: number;
    options: { choices: string[]; correct: number } | null;
    min_photos: number | null;
    max_photos: number | null;
    min_seconds: number | null;
    max_seconds: number | null;
    location_id: string | null;
    events:
      | { state: string }
      | { state: string }[];
  };
  const eventState = Array.isArray(task.events)
    ? task.events[0]?.state
    : task.events?.state;
  if (eventState === "paused") {
    return { error: "Het spel is gestopt — wacht op de ouders" };
  }
  if (eventState === "finished") {
    return { error: "Het spel is afgelopen" };
  }

  const { data: existing } = await sb
    .from("submissions")
    .select("id")
    .eq("team_id", teamId)
    .eq("task_id", taskId)
    .maybeSingle();
  if (existing) return { error: "Je hebt deze challenge al ingediend" };

  // Anti-cheat: challenges met een locatie kunnen alleen ingediend worden
  // nadat de squad daar daadwerkelijk via GPS is aangekomen.
  if (task.location_id) {
    const { data: visit } = await sb
      .from("location_visits")
      .select("id")
      .eq("team_id", teamId)
      .eq("location_id", task.location_id)
      .maybeSingle();
    if (!visit) {
      return {
        error: "Je moet eerst op deze locatie aankomen (loop er heen)",
      };
    }
  }

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
  } else if (task.type === "photo" || task.type === "video") {
    const rawPaths = formData.getAll("photo_paths").map((v) => String(v));
    const paths = rawPaths.filter(
      (p) => p && p.startsWith(`${teamId}/`)
    );
    if (paths.length === 0) {
      return {
        error:
          task.type === "video"
            ? "Upload eerst een video"
            : "Upload eerst je foto's",
      };
    }

    if (task.type === "photo") {
      const max = task.max_photos ?? 1;
      const min = task.min_photos ?? max;
      if (paths.length < min) {
        return { error: `Te weinig foto's (min ${min})` };
      }
      if (paths.length > max) {
        return { error: `Te veel foto's (max ${max})` };
      }
    } else {
      if (paths.length !== 1) {
        return { error: "Video-opdracht heeft precies één bestand nodig" };
      }
    }

    const photoUrls = paths.map(
      (p) => sb.storage.from("submission-photos").getPublicUrl(p).data.publicUrl
    );

    const { error } = await sb.from("submissions").insert({
      team_id: teamId,
      task_id: taskId,
      photo_urls: photoUrls,
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
  revalidatePath("/team/quests");

  return {
    ok: true,
    error: null,
    redirect: task.location_id
      ? `/team/location/${task.location_id}`
      : "/team/quests",
  };
}
