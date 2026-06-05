"use server";

import { supabaseService } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth/session";

export async function saveOuderPushSubscriptionAction(input: {
  endpoint: string;
  subscription: PushSubscriptionJSON;
}) {
  const eventId = await getAdminSession();
  if (!eventId) return { ok: false };
  if (!input.endpoint || !input.subscription) return { ok: false };

  const sb = supabaseService();
  await sb.from("push_subscriptions").upsert(
    {
      endpoint: input.endpoint,
      event_id: eventId,
      team_id: null,
      is_ouder: true,
      subscription: input.subscription,
    },
    { onConflict: "endpoint" }
  );

  return { ok: true };
}

export async function deleteOuderPushSubscriptionAction(endpoint: string) {
  const eventId = await getAdminSession();
  if (!eventId) return;
  if (!endpoint) return;

  const sb = supabaseService();
  await sb
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("event_id", eventId)
    .eq("is_ouder", true);
}
