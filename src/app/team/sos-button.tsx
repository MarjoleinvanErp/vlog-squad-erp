"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { reportSOSAction } from "./actions-sos";

type Stage = "idle" | "confirm" | "sending" | "done" | "error";

function currentPositionAsync(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 5_000 }
    );
  });
}

export function SOSButton() {
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setStage("sending");
    const pos = await currentPositionAsync();
    const res = await reportSOSAction(
      pos?.coords.latitude ?? null,
      pos?.coords.longitude ?? null
    );
    if (res.ok) {
      setStage("done");
      setTimeout(() => setStage("idle"), 4000);
    } else {
      setError(res.error ?? "Versturen mislukt");
      setStage("error");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setStage("confirm")}
        aria-label="SOS"
        className="fixed right-3 z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/80 bg-red-600 text-sm font-extrabold text-white shadow-[0_8px_24px_rgba(220,38,38,0.5)] active:scale-95"
        style={{
          bottom: "calc(5rem + env(safe-area-inset-bottom))",
        }}
      >
        SOS
      </button>

      <AnimatePresence>
        {stage !== "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
            onClick={() => stage !== "sending" && setStage("idle")}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm overflow-hidden rounded-3xl border border-red-500/40 bg-bg-card"
            >
              {(stage === "confirm" || stage === "error") && (
                <div className="flex flex-col gap-5 p-6 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-xl font-extrabold text-white">
                    SOS
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Stuur SOS?</h2>
                    <p className="mt-2 text-fg-muted">
                      Ouders krijgen direct een melding met jullie GPS-locatie.
                      Alleen tappen als er echt iets is.
                    </p>
                  </div>
                  {error && (
                    <p className="rounded-xl border border-pink/30 bg-pink/10 px-3 py-2 text-sm text-pink-soft">
                      {error}
                    </p>
                  )}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={send}
                      className="rounded-2xl bg-red-600 px-6 py-4 text-lg font-bold text-white active:scale-[0.98]"
                    >
                      Ja, stuur SOS
                    </button>
                    <button
                      onClick={() => {
                        setError(null);
                        setStage("idle");
                      }}
                      className="rounded-2xl border border-border-strong bg-bg-elev px-6 py-3 text-sm font-bold text-fg-muted"
                    >
                      Annuleren
                    </button>
                  </div>
                </div>
              )}

              {stage === "sending" && (
                <div className="flex flex-col items-center gap-4 p-8 text-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-red-500" />
                  <p className="font-bold">Versturen...</p>
                </div>
              )}

              {stage === "done" && (
                <div className="flex flex-col gap-4 p-6 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cyan/20 text-3xl text-cyan">
                    ✓
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-cyan">
                      SOS verstuurd
                    </h2>
                    <p className="mt-2 text-fg-muted">
                      Ouders zijn onderweg. Blijf op jullie plek.
                    </p>
                  </div>
                  <button
                    onClick={() => setStage("idle")}
                    className="rounded-2xl border border-border-strong bg-bg-elev px-6 py-3 text-sm font-bold text-fg"
                  >
                    Sluiten
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
