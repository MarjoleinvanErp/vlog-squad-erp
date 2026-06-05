import webpush from "web-push";

let configured = false;

function configure() {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:noreply@example.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

type SubscriptionRow = {
  endpoint: string;
  subscription: webpush.PushSubscription;
};

export type SendResult = {
  sent: number;
  expired: string[];
};

export async function sendPush(
  subscriptions: SubscriptionRow[],
  payload: PushPayload
): Promise<SendResult> {
  if (!configure()) return { sent: 0, expired: [] };
  if (subscriptions.length === 0) return { sent: 0, expired: [] };

  const body = JSON.stringify(payload);
  let sent = 0;
  const expired: string[] = [];

  await Promise.all(
    subscriptions.map(async (s) => {
      try {
        await webpush.sendNotification(s.subscription, body);
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          expired.push(s.endpoint);
        }
      }
    })
  );

  return { sent, expired };
}
