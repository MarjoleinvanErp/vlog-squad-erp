"use client";

import { useActionState, useEffect, useState } from "react";
import { teamLoginAction, type TeamLoginState } from "./actions";

const initialState: TeamLoginState = { error: null };
const STORAGE_KEY = "vs-team-code";

export function TeamLoginForm() {
  const [state, formAction, pending] = useActionState(
    teamLoginAction,
    initialState
  );
  const [code, setCode] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setCode(saved);
  }, []);

  function handleSubmit() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed && typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, trimmed);
    }
  }

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
    >
      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
          Squad-code
        </span>
        <input
          name="code"
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={8}
          required
          placeholder="ABCD"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="rounded-2xl border-2 border-border-strong bg-bg-card px-4 py-5 text-center text-3xl font-bold tracking-[0.5em] uppercase text-fg placeholder:text-fg-dim focus:border-pink focus:outline-none focus:glow-pink"
        />
      </label>
      {state.error && (
        <p className="rounded-xl border border-pink/30 bg-pink/10 px-4 py-3 text-sm text-pink-soft">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-2xl bg-pink px-6 py-5 text-lg font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? "Bezig..." : "Go live"}
      </button>
    </form>
  );
}
