"use client";

import { useEffect, useState } from "react";
import {
  isPushSupported,
  getCurrentSubscription,
  subscribeToPush,
} from "@/lib/push-helpers";
import { saveTeamPushSubscriptionAction } from "./actions-push";

type State =
  | "loading"
  | "off"
  | "on"
  | "denied"
  | "ios-needs-install"
  | "unsupported";

const STORAGE_KEY = "vs-team-push-banner-dismissed";

export function PushBanner() {
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
      await saveTeamPushSubscriptionAction({
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

  if (state === "ios-needs-install") {
    return (
      <Banner accent="cyan" onDismiss={dismiss}>
        <p className="font-bold text-cyan">Installeer als app</p>
        <p className="mt-1 text-xs text-fg-muted">
          Tap in Safari de <span className="font-bold">deel-knop</span> →
          &quot;Voeg toe aan beginscherm&quot;. Open daarna via het icoon op je
          beginscherm — dan kun je arrival-meldingen aanzetten.
        </p>
      </Banner>
    );
  }

  if (state === "denied") {
    return (
      <Banner accent="yellow" onDismiss={dismiss}>
        <p className="font-bold text-yellow-300">Meldingen geblokkeerd</p>
        <p className="mt-1 text-xs text-fg-muted">
          Ga naar je telefoon-instellingen om meldingen voor Vlog Squad aan te
          zetten.
        </p>
      </Banner>
    );
  }

  return (
    <Banner accent="pink" onDismiss={dismiss}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold">Zet meldingen aan</p>
          <p className="mt-0.5 text-xs text-fg-muted">
            Mis geen arrivals als je app op de achtergrond zit.
          </p>
        </div>
        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className="rounded-xl bg-pink px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy ? "..." : "Aan"}
        </button>
      </div>
    </Banner>
  );
}

function Banner({
  accent,
  children,
  onDismiss,
}: {
  accent: "pink" | "cyan" | "yellow";
  children: React.ReactNode;
  onDismiss: () => void;
}) {
  const colors =
    accent === "pink"
      ? "border-pink/40 bg-pink/10"
      : accent === "cyan"
        ? "border-cyan/40 bg-cyan/10"
        : "border-yellow-400/40 bg-yellow-400/10";

  return (
    <div className={`relative mx-3 mt-3 rounded-2xl border p-4 pr-10 ${colors}`}>
      {children}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Sluiten"
        className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-bg-elev text-sm text-fg-dim hover:text-fg"
      >
        ×
      </button>
    </div>
  );
}
