"use server";

import { redirect } from "next/navigation";
import { supabaseService } from "@/lib/supabase/server";
import { normalizeCode } from "@/lib/auth/codes";
import { setTeamSession, clearTeamSession } from "@/lib/auth/session";

export type TeamLoginState = { error: string | null };

export async function teamLoginAction(
  _prev: TeamLoginState,
  formData: FormData
): Promise<TeamLoginState> {
  const code = normalizeCode(String(formData.get("code") ?? ""));
  if (!code) return { error: "Vul een teamcode in" };

  const sb = supabaseService();
  const { data: team, error } = await sb
    .from("teams")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  if (error) return { error: "Er ging iets mis. Probeer opnieuw." };
  if (!team) return { error: "Onbekende teamcode" };

  await setTeamSession(team.id);
  redirect("/team/map");
}

export async function teamLogoutAction() {
  await clearTeamSession();
  redirect("/team");
}
