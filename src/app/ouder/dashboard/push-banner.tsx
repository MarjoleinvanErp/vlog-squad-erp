"use client";

import { useEffect, useState } from "react";
import {
  isPushSupported,
  getCurrentSubscription,
  subscribeToPush,
} from "@/lib/push-helpers";
import { saveOuderPushSubscriptionAction } from "./actions-push";

type State =
  | "loading"
  | "off"
  | "on"
  | "denied"
  | "ios-needs-install"
  | "unsupported";

const STORAGE_KEY = "vs-ouder-push-banner-dismissed";

export function OuderPushBanner() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (localStorage.getItem(STORAGE_KEY) === "1") {
      setDismissed(true);
    }

    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isStandalone =
      "standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isIOS && !isStandalone) {
      setState("ios-needs-install");
      return;
    }

    if (!isPushSupported()) {
      setState("unsupported");
      return;
    }

    if (typeof Notification !== "undefined" && Notification.permission === "denied") {
      setState("denied");
      return;
    }

    getCurrentSubscription()
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const sub = await subscribeToPush();
      if (!sub) {
        if (typeof Notification !== "undefined" && Notification.permission === "denied") {
          setState("denied");
        } else {
          setState("off");
        }
        return;
      }
      await saveOuderPushSubscriptionAction({
        endpoint: sub.endpoint,
        subscription: sub.toJSON() as PushSubscriptionJSON,
      });
      setState("on");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "1");
    }
    setDismissed(true);
  }

  if (
    dismissed ||
    state === "loading" ||
    state === "on" ||
    state === "unsupported"
  ) {
    return null;
  }

  const accentClass =
    state === "ios-needs-install"
      ? "border-cyan/40 bg-cyan/10"
      : state === "denied"
        ? "border-yellow-400/40 bg-yellow-400/10"
        : "border-pink/40 bg-pink/10";

  return (
    <section
      className={`relative rounded-3xl border p-5 pr-12 ${accentClass}`}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Sluiten"
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-bg-elev text-base text-fg-dim hover:text-fg"
      >
        ×
      </button>

      {state === "ios-needs-install" && (
        <>
          <p className="font-bold text-cyan">Installeer als app voor push</p>
          <p className="mt-1 text-sm text-fg-muted">
            Op iPhone: in Safari deel-knop → &quot;Voeg toe aan beginscherm&quot;.
            Open daarna via het icoon — dan kun je SOS- en arrival-meldingen
            buiten de browser ontvangen.
          </p>
        </>
      )}

      {state === "denied" && (
        <>
          <p className="font-bold text-yellow-300">Meldingen geblokkeerd</p>
          <p className="mt-1 text-sm text-fg-muted">
            Zet meldingen aan in je telefoon- of browser-instellingen om SOS
            buiten de app te ontvangen.
          </p>
        </>
      )}

      {state === "off" && (
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-bold">Zet meldingen aan</p>
            <p className="mt-0.5 text-xs text-fg-muted">
              Krijg SOS en arrival-pings ook als deze pagina dicht is.
            </p>
          </div>
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="rounded-xl bg-pink px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "..." : "Aanzetten"}
          </button>
        </div>
      )}
    </section>
  );
}
