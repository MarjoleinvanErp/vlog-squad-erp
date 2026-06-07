import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? "mailto:noreply@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

console.log("env check:");
console.log(
  "  NEXT_PUBLIC_VAPID_PUBLIC_KEY length:",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.length
);
console.log(
  "  VAPID_PRIVATE_KEY length:",
  process.env.VAPID_PRIVATE_KEY?.length
);
console.log("  VAPID_SUBJECT:", process.env.VAPID_SUBJECT);
console.log();

const { data: subs, error } = await supabase
  .from("push_subscriptions")
  .select("endpoint, subscription, team_id, event_id, is_ouder, created_at")
  .order("created_at", { ascending: false });

if (error) {
  console.error("Kon push_subscriptions niet ophalen:", error.message);
  process.exit(1);
}

if (!subs || subs.length === 0) {
  console.log("⚠️  Geen subscriptions gevonden in DB.");
  console.log(
    "    Dat betekent dat geen enkele device 'Zet meldingen aan' heeft afgerond."
  );
  process.exit(0);
}

console.log(`Found ${subs.length} subscription(s) in DB:\n`);
subs.forEach((s, i) => {
  const who = s.is_ouder
    ? `OUDER (event ${s.event_id?.slice(0, 8)}…)`
    : `SQUAD (team ${s.team_id?.slice(0, 8)}…)`;
  console.log(
    `  ${i + 1}. ${who} · endpoint: ${s.endpoint.substring(0, 60)}… · created ${s.created_at}`
  );
});
console.log();

let sent = 0;
let failed = 0;
for (const s of subs) {
  const who = s.is_ouder ? "ouder" : "squad";
  try {
    await webpush.sendNotification(
      s.subscription,
      JSON.stringify({
        title: "Test van laptop",
        body: `Test push naar ${who} via web-push lib + VAPID — als je deze ziet werkt alles!`,
        url: s.is_ouder ? "/ouder/dashboard" : "/team/map",
        tag: "laptop-test-push",
      })
    );
    console.log(`✓ Sent to ${who}: ${s.endpoint.substring(0, 50)}…`);
    sent++;
  } catch (err) {
    const status = err.statusCode;
    const body = err.body || err.message;
    console.error(`✗ Failed for ${who}: status ${status}, body: ${body}`);
    failed++;
  }
}

console.log();
console.log(`Result: ${sent} sent, ${failed} failed.`);
console.log(
  "Als 'sent' > 0 maar je telefoon krijgt niets: probleem ligt bij iOS/OS-instellingen,"
);
console.log("niet bij VAPID of code.");
