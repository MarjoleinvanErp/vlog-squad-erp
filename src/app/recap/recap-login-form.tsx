"use client";

import { useActionState } from "react";
import { recapLoginAction, type RecapLoginState } from "./actions";

const initial: RecapLoginState = { error: null };

export function RecapLoginForm() {
  const [state, formAction, pending] = useActionState(recapLoginAction, initial);

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <input
        type="text"
        name="code"
        required
        autoCapitalize="characters"
        autoComplete="off"
        placeholder="Codewoord"
        className="rounded-2xl border-2 border-border-strong bg-bg-card px-4 py-4 text-center text-xl font-bold uppercase tracking-[0.3em] text-fg placeholder:normal-case placeholder:tracking-normal placeholder:text-fg-dim focus:border-pink focus:outline-none"
      />

      {state.error && (
        <p className="rounded-xl border border-pink/30 bg-pink/10 px-4 py-3 text-sm text-pink-soft">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-2xl bg-pink px-6 py-4 text-lg font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? "Checken..." : "Bekijk de resultaten"}
      </button>
    </form>
  );
}
