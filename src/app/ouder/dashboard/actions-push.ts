"use server";

import { supabaseService } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth/session";
import { sendPush } from "@/lib/push";

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

export async function sendOuderTestPushAction(): Promise<{
  ok: boolean;
  error?: string;
  sent?: number;
}> {
  const eventId = await getAdminSession();
  if (!eventId) return { ok: false, error: "Niet ingelogd" };

  const sb = supabaseService();
  const { data: subs } = await sb
    .from("push_subscriptions")
    .select("endpoint, subscription")
    .eq("event_id", eventId)
    .eq("is_ouder", true);

  if (!subs || subs.length === 0) {
    return {
      ok: false,
      error:
        "Geen ouder-subscription gevonden — zet meldingen eerst aan.",
    };
  }

  const result = await sendPush(
    subs as Array<{ endpoint: string; subscription: never }>,
    {
      title: "Test melding",
      body: "Het werkt! Ouder-meldingen komen door.",
      url: "/ouder/dashboard",
      tag: "test-ouder-push",
    } as never
  );

  if (result.expired.length > 0) {
    await sb
      .from("push_subscriptions")
      .delete()
      .in("endpoint", result.expired);
  }

  if (result.sent === 0) {
    return {
      ok: false,
      error:
        "Push API gaf 0 succesvolle verzendingen — check Vercel env vars (VAPID keys + redeploy).",
    };
  }

  return { ok: true, sent: result.sent };
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
