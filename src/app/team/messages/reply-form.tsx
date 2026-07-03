"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { sendTeamMessageAction, type ReplyState } from "./actions";

const initial: ReplyState = { ok: false, error: null };

export function ReplyForm() {
  const [state, formAction, pending] = useActionState(
    sendTeamMessageAction,
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
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-2 rounded-3xl border border-border bg-bg-card p-4"
    >
      <div className="flex items-end gap-2">
        <textarea
          name="body"
          rows={2}
          maxLength={280}
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Stuur een bericht naar de ouders..."
          className="min-w-0 flex-1 resize-none rounded-xl border-2 border-border-strong bg-bg-elev px-4 py-3 text-fg placeholder:text-fg-dim focus:border-pink focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || body.trim().length === 0}
          aria-label="Verstuur bericht"
          className="rounded-xl bg-pink px-4 py-3 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          {pending ? "..." : "➤"}
        </button>
      </div>
      {state.error && (
        <p className="rounded-xl border border-pink/30 bg-pink/10 px-4 py-2 text-sm text-pink-soft">
          {state.error}
        </p>
      )}
    </form>
  );
}
