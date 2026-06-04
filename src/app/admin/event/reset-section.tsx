"use client";

import { useActionState, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { resetTestDataAction, type ResetState } from "./actions";

const initial: ResetState = { ok: false, error: null, message: null };

export function ResetSection() {
  const [state, formAction] = useActionState(resetTestDataAction, initial);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    setOpen(false);
    startTransition(() => {
      formAction(new FormData());
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-fg-muted">
        Wist alle gameplay-data en zet squads terug op &quot;Squad 1/2/3&quot;
        zonder teamfoto. Handig om opnieuw te kunnen testen.
      </p>
      <ul className="ml-4 list-disc text-xs text-fg-dim">
        <li>Wist: posts, location-visits, GPS-pings, incidents</li>
        <li>Reset: squad-namen + channel art</li>
        <li>Blijft staan: squads + codes, locaties, challenges, event</li>
      </ul>
      {state.error && (
        <p className="rounded-xl border border-pink/30 bg-pink/10 px-4 py-3 text-sm text-pink-soft">
          {state.error}
        </p>
      )}
      {state.ok && state.message && (
        <p className="rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm text-cyan-soft">
          {state.message}
        </p>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className="self-start rounded-xl border border-pink/40 bg-pink/10 px-4 py-2 text-sm font-bold text-pink-soft hover:bg-pink/20 disabled:opacity-50"
      >
        {pending ? "Bezig..." : "Wis test-data"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl border border-pink/40 bg-bg-card p-6"
            >
              <h2 className="text-xl font-bold">Weet je het zeker?</h2>
              <p className="mt-2 text-sm text-fg-muted">
                Wist ALLE posts, visits, GPS-posities en incidents. Reset
                squad-namen + channel art. Squads, locaties en challenges
                blijven staan.
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-xl border border-border-strong bg-bg-elev px-4 py-3 text-sm font-bold text-fg-muted hover:text-fg"
                >
                  Annuleren
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 rounded-xl bg-pink px-4 py-3 text-sm font-bold text-white active:scale-[0.98]"
                >
                  Wis alles
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
