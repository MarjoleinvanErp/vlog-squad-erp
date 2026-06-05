"use server";

import { supabaseService } from "@/lib/supabase/server";
import { getTeamSession } from "@/lib/auth/session";

export async function saveTeamPushSubscriptionAction(input: {
  endpoint: string;
  subscription: PushSubscriptionJSON;
}) {
  const teamId = await getTeamSession();
  if (!teamId) return { ok: false };
  if (!input.endpoint || !input.subscription) return { ok: false };

  const sb = supabaseService();

  await sb.from("push_subscriptions").upsert(
    {
      endpoint: input.endpoint,
      team_id: teamId,
      event_id: null,
      is_ouder: false,
      subscription: input.subscription,
    },
    { onConflict: "endpoint" }
  );

  return { ok: true };
}

export async function deleteTeamPushSubscriptionAction(endpoint: string) {
  const teamId = await getTeamSession();
  if (!teamId) return;
  if (!endpoint) return;

  const sb = supabaseService();
  await sb
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("team_id", teamId);
}
