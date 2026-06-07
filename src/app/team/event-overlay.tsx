"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { playSosAlarm, vibrateSos } from "@/lib/sound";

export type EventStatus = {
  id: string;
  state: "running" | "paused" | "finished";
  rally_message: string | null;
  rally_lat: number | null;
  rally_lng: number | null;
};

export function EventOverlay({ initial }: { initial: EventStatus | null }) {
  const router = useRouter();
  const [status, setStatus] = useState<EventStatus | null>(initial);

  useEffect(() => {
    if (!status?.id) return;
    const sb = supabaseBrowser();
    const channel = sb
      .channel(`event-${status.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "events",
          filter: `id=eq.${status.id}`,
        },
        (payload) => {
          const newRow = payload.new as {
            id: string;
            state: string;
            rally_message: string | null;
            rally_lat: number | null;
            rally_lng: number | null;
          } | null;
          if (!newRow) return;
          const prev = status?.state;
          const nextState: EventStatus["state"] =
            newRow.state === "paused"
              ? "paused"
              : newRow.state === "finished"
                ? "finished"
                : "running";
          const next: EventStatus = {
            id: newRow.id,
            state: nextState,
            rally_message: newRow.rally_message,
            rally_lat: newRow.rally_lat,
            rally_lng: newRow.rally_lng,
          };
          setStatus(next);
          if (prev !== "paused" && next.state === "paused") {
            playSosAlarm();
            vibrateSos();
          }
          router.refresh();
        }
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.id]);

  const isPaused = status?.state === "paused";

  return (
    <AnimatePresence>
      {isPaused && status && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-6 backdrop-blur-md"
          style={{
            paddingTop: "calc(env(safe-area-inset-top) + 1rem)",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
          }}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-pink/50 bg-bg-card"
          >
            <div className="flex flex-col items-center gap-3 bg-pink/15 p-6 text-center">
              <span className="rounded-full bg-pink px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.3em] text-white">
                spel gestopt
              </span>
              <h2 className="text-3xl font-bold leading-tight">
                <span className="text-gradient">Verzamelen!</span>
              </h2>
            </div>

            <div className="flex flex-col gap-4 p-6">
              <p className="whitespace-pre-line text-base">
                {status.rally_message}
              </p>

              {status.rally_lat != null && status.rally_lng != null ? (
                <a
                  href={`https://www.google.com/maps?q=${status.rally_lat},${status.rally_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-2xl bg-pink px-6 py-4 text-center text-base font-bold text-white active:scale-[0.98]"
                >
                  Open in Maps →
                </a>
              ) : (
                <p className="rounded-xl border border-border bg-bg-elev px-4 py-3 text-center text-sm text-fg-muted">
                  Geen kaartlocatie meegegeven
                </p>
              )}

              <p className="text-center text-xs text-fg-dim">
                Wacht hier op het sein van de ouders. Challenges zijn pas weer
                actief als het spel hervat wordt.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
