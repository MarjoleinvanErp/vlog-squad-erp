"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { getTeamSession } from "@/lib/auth/session";

export type PickNameState = { ok?: boolean; error?: string | null };

const NAME_MIN = 2;
const NAME_MAX = 24;

export async function pickSquadNameAction(
  _prev: PickNameState,
  formData: FormData
): Promise<PickNameState> {
  const teamId = await getTeamSession();
  if (!teamId) return { error: "Niet ingelogd" };

  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  if (name.length < NAME_MIN) return { error: `Minimaal ${NAME_MIN} tekens` };
  if (name.length > NAME_MAX) return { error: `Max ${NAME_MAX} tekens` };

  const sb = supabaseService();

  const { data: current } = await sb
    .from("teams")
    .select("event_id")
    .eq("id", teamId)
    .maybeSingle();
  if (!current) return { error: "Squad niet gevonden" };

  const c = current as { event_id: string };

  const { data: existing } = await sb
    .from("teams")
    .select("id")
    .eq("event_id", c.event_id)
    .eq("name", name)
    .neq("id", teamId)
    .maybeSingle();
  if (existing) return { error: "Die naam is al door een andere squad gekozen" };

  const { error } = await sb
    .from("teams")
    .update({ name })
    .eq("id", teamId);
  if (error) return { error: error.message };

  revalidatePath("/team/onboard");
  revalidatePath("/team/map");
  return { ok: true };
}

export async function uploadTeamPhotoAction(formData: FormData) {
  const teamId = await getTeamSession();
  if (!teamId) return;

  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return;

  const sb = supabaseService();

  const ext = photo.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${teamId}/channel-${Date.now()}.${ext}`;

  const { error: uploadError } = await sb.storage
    .from("team-photos")
    .upload(path, photo, {
      contentType: photo.type || "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const {
    data: { publicUrl },
  } = sb.storage.from("team-photos").getPublicUrl(path);

  const { error: updateError } = await sb
    .from("teams")
    .update({ team_photo_url: publicUrl })
    .eq("id", teamId);

  if (updateError) {
    throw new Error(`Save failed: ${updateError.message}`);
  }

  revalidatePath("/team/map");
  redirect("/team/map");
}
