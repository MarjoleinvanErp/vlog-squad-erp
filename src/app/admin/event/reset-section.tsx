"use client";

import { useActionState } from "react";
import { resetTestDataAction, type ResetState } from "./actions";

const initial: ResetState = { ok: false, error: null, message: null };

export function ResetSection() {
  const [state, formAction, pending] = useActionState(
    resetTestDataAction,
    initial
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !confirm(
            "Weet je het zeker?\n\nDit wist ALLE posts, visits, GPS-posities en incidents, en reset squad-namen + channel art.\n\nSquads, locaties en challenges blijven staan."
          )
        ) {
          e.preventDefault();
        }
      }}
      className="flex flex-col gap-3"
    >
      <p className="text-sm text-fg-muted">
        Wist alle gameplay-data en zet squads terug op "Squad 1/2/3" zonder
        teamfoto. Handig om opnieuw te kunnen testen.
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
        type="submit"
        disabled={pending}
        className="self-start rounded-xl border border-pink/40 bg-pink/10 px-4 py-2 text-sm font-bold text-pink-soft hover:bg-pink/20 disabled:opacity-50"
      >
        {pending ? "Bezig..." : "Wis test-data"}
      </button>
    </form>
  );
}
