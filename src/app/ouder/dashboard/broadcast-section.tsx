"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  sendBroadcastAction,
  type BroadcastState,
} from "./broadcast-actions";

const initial: BroadcastState = { ok: false, error: null };

export type RecentBroadcast = {
  id: string;
  body: string;
  created_at: string;
  // null = door de ouders verstuurd; anders het team dat antwoordde.
  sender: { name: string; color: string } | null;
};

export function BroadcastSection({
  recent,
}: {
  recent: RecentBroadcast[];
}) {
  const [state, formAction, pending] = useActionState(
    sendBroadcastAction,
    initial
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [body, setBody] = useState("");

  useEffect(() => {
    if (state.ok && formRef.current) {
      formRef.current.reset();
      setBody("");
    }
  }, [state.ok]);

  return (
    <section className="rounded-3xl border border-border bg-bg-card p-5">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-cyan">
        Bericht aan squads
      </h2>
      <form ref={formRef} action={formAction} className="mt-3 flex flex-col gap-3">
        <label className="flex flex-col gap-2">
          <textarea
            name="body"
            rows={3}
            maxLength={280}
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="bv. Vergeet niet om een groepsfoto bij De Brink te maken!"
            className="rounded-xl border-2 border-border-strong bg-bg-elev px-4 py-3 text-fg placeholder:text-fg-dim focus:border-pink focus:outline-none"
          />
          <span className="self-end text-[10px] uppercase tracking-widest text-fg-muted">
            {body.length}/280
          </span>
        </label>
        {state.error && (
          <p className="rounded-xl border border-pink/30 bg-pink/10 px-4 py-3 text-sm text-pink-soft">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || body.trim().length === 0}
          className="self-end rounded-xl bg-pink px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {pending ? "Versturen..." : "Verstuur"}
        </button>
      </form>

      {recent.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-[10px] uppercase tracking-widest text-fg-muted">
            Laatste berichten
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {recent.map((m) => (
              <li
                key={m.id}
                className={`rounded-xl border px-3 py-2 ${
                  m.sender
                    ? "border-border-strong bg-bg-card"
                    : "border-border bg-bg-elev"
                }`}
              >
                <p className="flex items-center gap-2 text-xs text-fg-muted">
                  {m.sender ? (
                    <span
                      className="font-bold"
                      style={{ color: m.sender.color }}
                    >
                      @{m.sender.name}
                    </span>
                  ) : (
                    <span className="font-bold text-cyan">ouders</span>
                  )}
                  {new Date(m.created_at).toLocaleTimeString("nl-NL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-sm">{m.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
