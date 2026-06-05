/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

type PushPayload = {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
};

type PushPayloadExt = PushPayload & {
  skipIfFocused?: boolean;
};

self.addEventListener("push", (event: PushEvent) => {
  let data: PushPayloadExt = {};
  try {
    data = event.data ? (event.data.json() as PushPayloadExt) : {};
  } catch {
    data = { body: event.data?.text() ?? "" };
  }

  event.waitUntil(
    (async () => {
      if (data.skipIfFocused) {
        const clientsList = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        const hasVisible = clientsList.some((c) =>
          "visibilityState" in c &&
          (c as WindowClient).visibilityState === "visible"
        );
        if (hasVisible) return;
      }

      await self.registration.showNotification(data.title ?? "Vlog Squad", {
        body: data.body ?? "",
        icon: "/icon",
        badge: "/icon",
        tag: data.tag,
        data: { url: data.url ?? "/" },
      });
    })()
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | null)?.url ?? "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientsList) => {
        for (const c of clientsList) {
          if (c.url.includes(url)) {
            return c.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
