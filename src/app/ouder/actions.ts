"use server";

import { redirect } from "next/navigation";
import { supabaseService } from "@/lib/supabase/server";
import { normalizeCode } from "@/lib/auth/codes";
import { setAdminSession, clearAdminSession } from "@/lib/auth/session";

export type OuderLoginState = { error: string | null };

export async function ouderLoginAction(
  _prev: OuderLoginState,
  formData: FormData
): Promise<OuderLoginState> {
  const code = normalizeCode(String(formData.get("code") ?? ""));
  if (!code) return { error: "Vul een admincode in" };

  const sb = supabaseService();
  const { data: event, error } = await sb
    .from("events")
    .select("id")
    .eq("admin_code", code)
    .maybeSingle();

  if (error) return { error: "Er ging iets mis. Probeer opnieuw." };
  if (!event) return { error: "Onbekende admincode" };

  await setAdminSession(event.id);
  redirect("/ouder/dashboard");
}

export async function ouderLogoutAction() {
  await clearAdminSession();
  redirect("/ouder");
}
