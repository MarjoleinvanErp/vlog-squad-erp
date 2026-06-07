"use server";

import { supabaseService } from "@/lib/supabase/server";
import { getTeamSession } from "@/lib/auth/session";
import { sendPush } from "@/lib/push";

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

export async function sendTeamTestPushAction(): Promise<{
  ok: boolean;
  error?: string;
  sent?: number;
}> {
  const teamId = await getTeamSession();
  if (!teamId) return { ok: false, error: "Niet ingelogd" };

  const sb = supabaseService();
  const { data: subs } = await sb
    .from("push_subscriptions")
    .select("endpoint, subscription")
    .eq("team_id", teamId);

  if (!subs || subs.length === 0) {
    return {
      ok: false,
      error:
        "Geen subscription voor deze squad gevonden — zet meldingen eerst aan.",
    };
  }

  const result = await sendPush(
    subs as Array<{ endpoint: string; subscription: never }>,
    {
      title: "Test melding",
      body: "Het werkt! Squad-meldingen komen door.",
      url: "/team/squad",
      tag: "test-team-push",
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
