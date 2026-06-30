"use client";

import { useActionState, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  pauseEventAction,
  resumeEventAction,
  finishEventAction,
  type PauseState,
} from "./announce-actions";

const initial: PauseState = { ok: false, error: null };

export type EventRally = {
  state: "running" | "paused" | "finished";
  rally_message: string | null;
  rally_lat: number | null;
  rally_lng: number | null;
  paused_at: string | null;
};

export function AnnounceSection({ event }: { event: EventRally }) {
  if (event.state === "finished") {
    return <FinishedView />;
  }
  if (event.state === "paused") {
    return <PausedView event={event} />;
  }
  return <RunningView />;
}

function RunningView() {
  const [pauseOpen, setPauseOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-cyan">
            spel-status
          </p>
          <p className="text-base font-bold">Spel loopt</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPauseOpen(true)}
            className="rounded-xl border border-pink/40 bg-pink/10 px-4 py-2 text-sm font-bold text-pink-soft hover:bg-pink/20"
          >
            Pauze + verzamel
          </button>
          <button
            type="button"
            onClick={() => setFinishOpen(true)}
            className="rounded-xl border border-cyan/40 bg-cyan/10 px-4 py-2 text-sm font-bold text-cyan hover:bg-cyan/20"
          >
            Eindig spel
          </button>
        </div>
      </div>
      <AnimatePresence>
        {pauseOpen && <PauseModal onClose={() => setPauseOpen(false)} />}
        {finishOpen && (
          <FinishModal onClose={() => setFinishOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

function PauseModal({ onClose }: { onClose: () => void }) {
  const [state, formAction, pending] = useActionState(
    pauseEventAction,
    initial
  );
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);

  if (state.ok) {
    setTimeout(onClose, 100);
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setGpsError("GPS niet beschikbaar");
      return;
    }
    setGpsBusy(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsBusy(false);
      },
      (err) => {
        setGpsError(err.message || "GPS mislukt");
        setGpsBusy(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 p-4 sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 30, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-pink/40 bg-bg-card p-6"
      >
        <h2 className="text-xl font-bold">Stop spel + verzamel</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Squads krijgen een full-screen melding, kunnen geen challenges meer
          indienen, en zien waar ze naartoe moeten.
        </p>

        <form action={formAction} className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
              Bericht voor de squads
            </span>
            <textarea
              name="message"
              rows={3}
              maxLength={200}
              required
              placeholder="bv. Kom terug naar Veghelsedijk 5 voor de prijsuitreiking!"
              className="rounded-xl border-2 border-border-strong bg-bg-elev px-4 py-3 text-fg placeholder:text-fg-dim focus:border-pink focus:outline-none"
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
              Verzamel-locatie
            </span>
            <button
              type="button"
              onClick={useMyLocation}
              disabled={gpsBusy}
              className="rounded-xl border border-cyan/40 bg-cyan/10 px-4 py-3 text-sm font-bold text-cyan hover:bg-cyan/20 disabled:opacity-50"
            >
              {gpsBusy
                ? "GPS lezen..."
                : coords
                  ? "Vernieuw mijn positie"
                  : "Gebruik mijn huidige positie"}
            </button>
            {coords && (
              <p className="font-mono text-xs text-fg-muted">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </p>
            )}
            {gpsError && (
              <p className="text-xs text-pink-soft">{gpsError}</p>
            )}
            <p className="text-xs text-fg-dim">
              Optioneel — als je dit overslaat zien squads alleen het bericht
              zonder kaart-link.
            </p>
            <input type="hidden" name="lat" value={coords?.lat ?? ""} />
            <input type="hidden" name="lng" value={coords?.lng ?? ""} />
          </div>

          {state.error && (
            <p className="rounded-xl border border-pink/30 bg-pink/10 px-4 py-3 text-sm text-pink-soft">
              {state.error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="flex-1 rounded-xl border border-border-strong bg-bg-elev px-4 py-3 text-sm font-bold text-fg-muted"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-xl bg-pink px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {pending ? "Versturen..." : "Stop spel"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function FinishModal({ onClose }: { onClose: () => void }) {
  const [state, formAction, pending] = useActionState(
    finishEventAction,
    initial
  );

  if (state.ok) {
    setTimeout(onClose, 100);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 p-4 sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 30, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-cyan/40 bg-bg-card p-6"
      >
        <h2 className="text-xl font-bold">Spel eindigen?</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Squads kunnen niets meer indienen. De eindstand wordt nu zichtbaar op{" "}
          <span className="font-bold text-pink">/team/ranking</span>, en de feed
          opent zodat ze elkaars posts kunnen zien. Iedereen krijgt een push.
        </p>
        <p className="mt-2 text-xs text-fg-dim">
          Je kunt het later eventueel weer heropenen (state → loopt).
        </p>

        {state.error && (
          <p className="mt-4 rounded-xl border border-pink/30 bg-pink/10 px-4 py-3 text-sm text-pink-soft">
            {state.error}
          </p>
        )}

        <form action={formAction} className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="flex-1 rounded-xl border border-border-strong bg-bg-elev px-4 py-3 text-sm font-bold text-fg-muted"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 rounded-xl bg-cyan px-4 py-3 text-sm font-bold text-bg disabled:opacity-50"
          >
            {pending ? "Eindigen..." : "Eindig spel"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function PausedView({ event }: { event: EventRally }) {
  const [state, formAction, pending] = useActionState(
    resumeEventAction,
    initial
  );
  const [finishOpen, setFinishOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-pink px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-white">
          gestopt
        </span>
        <p className="text-xs uppercase tracking-widest text-fg-muted">
          {event.paused_at
            ? new Date(event.paused_at).toLocaleTimeString("nl-NL", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : ""}
        </p>
      </div>
      <p className="rounded-xl border border-border-strong bg-bg-elev px-4 py-3 text-sm">
        {event.rally_message}
      </p>
      {event.rally_lat != null && event.rally_lng != null && (
        <p className="font-mono text-xs text-fg-muted">
          {event.rally_lat.toFixed(5)}, {event.rally_lng.toFixed(5)}
        </p>
      )}
      {state.error && (
        <p className="rounded-xl border border-pink/30 bg-pink/10 px-4 py-3 text-sm text-pink-soft">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <form action={formAction} className="flex-1">
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl border border-cyan/40 bg-cyan/10 px-4 py-3 text-sm font-bold text-cyan hover:bg-cyan/20 disabled:opacity-50"
          >
            {pending ? "Hervatten..." : "Hervat spel"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setFinishOpen(true)}
          className="rounded-xl border border-border-strong bg-bg-elev px-4 py-3 text-sm font-bold text-fg-muted hover:text-fg"
        >
          Eindig spel
        </button>
      </div>
      <AnimatePresence>
        {finishOpen && <FinishModal onClose={() => setFinishOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

function FinishedView() {
  const [state, formAction, pending] = useActionState(
    resumeEventAction,
    initial
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-gradient-tiktok px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-white">
          afgelopen
        </span>
      </div>
      <p className="text-sm">
        Het spel is afgelopen. Squads zien de eindstand op{" "}
        <span className="font-bold text-pink">/team/ranking</span> en elkaars
        approved posts op <span className="font-bold text-pink">/team/feed</span>.
      </p>
      {state.error && (
        <p className="rounded-xl border border-pink/30 bg-pink/10 px-4 py-3 text-sm text-pink-soft">
          {state.error}
        </p>
      )}
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl border border-cyan/40 bg-cyan/10 px-4 py-3 text-sm font-bold text-cyan hover:bg-cyan/20 disabled:opacity-50"
        >
          {pending ? "Heropen..." : "Heropen spel"}
        </button>
      </form>
    </div>
  );
}
