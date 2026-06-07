"use client";

import { useEffect, useState } from "react";
import {
  isPushSupported,
  getCurrentSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push-helpers";
import {
  saveOuderPushSubscriptionAction,
  deleteOuderPushSubscriptionAction,
  sendOuderTestPushAction,
} from "./actions-push";

type State = "checking" | "unsupported" | "off" | "on" | "denied";

export function OuderPushToggle() {
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
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
        setState(Notification.permission === "denied" ? "denied" : "off");
        return;
      }
      const json = sub.toJSON() as PushSubscriptionJSON;
      await saveOuderPushSubscriptionAction({
        endpoint: sub.endpoint,
        subscription: json,
      });
      setState("on");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) {
        await deleteOuderPushSubscriptionAction(endpoint);
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setTestStatus(null);
    setTestError(null);
    try {
      const res = await sendOuderTestPushAction();
      if (res.ok) {
        setTestStatus(`Verstuurd naar ${res.sent} device(s).`);
      } else {
        setTestError(res.error ?? "Onbekende fout");
      }
    } catch (e) {
      setTestError(e instanceof Error ? e.message : "Verzenden mislukt");
    } finally {
      setBusy(false);
    }
  }

  if (state === "checking" || state === "unsupported") return null;

  if (state === "denied") {
    return (
      <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-4 text-sm">
        <p className="font-bold text-yellow-300">Meldingen geblokkeerd</p>
        <p className="mt-1 text-fg-muted">
          Zet meldingen aan via je browser-/telefoon-instellingen om SOS-
          meldingen te krijgen ook als deze pagina dicht is.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={state === "on" ? disable : enable}
        disabled={busy}
        className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-widest transition disabled:opacity-50 ${
          state === "on"
            ? "border-cyan/40 bg-cyan/10 text-cyan hover:bg-cyan/20"
            : "border-pink/40 bg-pink/10 text-pink-soft hover:bg-pink/20"
        }`}
      >
        {busy ? "..." : state === "on" ? "Meldingen aan" : "Meldingen aan zetten"}
      </button>
      {state === "on" && (
        <>
          <button
            type="button"
            onClick={sendTest}
            disabled={busy}
            className="rounded-full border border-border-strong bg-bg-elev px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-fg-muted hover:text-fg disabled:opacity-50"
          >
            Test push
          </button>
          {testStatus && (
            <p className="rounded-lg border border-cyan/30 bg-cyan/5 px-2 py-1 text-[10px] text-cyan">
              {testStatus}
            </p>
          )}
          {testError && (
            <p className="max-w-[200px] rounded-lg border border-pink/30 bg-pink/10 px-2 py-1 text-[10px] text-pink-soft">
              {testError}
            </p>
          )}
        </>
      )}
    </div>
  );
}
