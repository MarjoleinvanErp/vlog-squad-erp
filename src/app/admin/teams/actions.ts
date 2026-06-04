"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth/session";
import { generateTeamCode, normalizeCode } from "@/lib/auth/codes";

export type CreateTeamState = { ok?: boolean; error?: string | null };

export async function createTeamAction(
  _prev: CreateTeamState,
  formData: FormData
): Promise<CreateTeamState> {
  const eventId = await getAdminSession();
  if (!eventId) return { error: "Niet ingelogd" };

  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "#fe2c55").trim();
  const codeInput = normalizeCode(String(formData.get("code") ?? ""));

  if (!name) return { error: "Squad-naam is verplicht" };

  const sb = supabaseService();

  let code = codeInput || generateTeamCode();

  for (let i = 0; i < 5; i++) {
    const { data: existing } = await sb
      .from("teams")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!existing) break;
    code = generateTeamCode();
  }

  const { error } = await sb.from("teams").insert({
    event_id: eventId,
    name,
    code,
    color,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/teams");
  return { ok: true };
}

export async function deleteTeamAction(formData: FormData) {
  const eventId = await getAdminSession();
  if (!eventId) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const sb = supabaseService();
  await sb.from("teams").delete().eq("id", id).eq("event_id", eventId);
  revalidatePath("/admin/teams");
}
