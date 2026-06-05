"use server";

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

export type SignedUpload = {
  ok: boolean;
  error?: string;
  signedUrl?: string;
  path?: string;
  token?: string;
};

export async function createTeamPhotoUploadUrl(
  ext: string
): Promise<SignedUpload> {
  const teamId = await getTeamSession();
  if (!teamId) return { ok: false, error: "Niet ingelogd" };

  const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : "jpg";
  const path = `${teamId}/channel-${Date.now()}.${safeExt}`;

  const sb = supabaseService();
  const { data, error } = await sb.storage
    .from("team-photos")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return { ok: false, error: error?.message ?? "kan upload-url niet maken" };
  }
  return { ok: true, signedUrl: data.signedUrl, path: data.path, token: data.token };
}

export async function commitTeamPhotoAction(
  path: string
): Promise<{ ok: boolean; redirect?: string; error?: string }> {
  const teamId = await getTeamSession();
  if (!teamId) return { ok: false, error: "Niet ingelogd" };
  if (!path || typeof path !== "string")
    return { ok: false, error: "Geen pad" };
  if (!path.startsWith(`${teamId}/`))
    return { ok: false, error: "Ongeldig pad" };

  const sb = supabaseService();
  const {
    data: { publicUrl },
  } = sb.storage.from("team-photos").getPublicUrl(path);

  const { error } = await sb
    .from("teams")
    .update({ team_photo_url: publicUrl })
    .eq("id", teamId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/team/map");
  return { ok: true, redirect: "/team/map" };
}
