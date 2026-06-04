"use client";

import { useActionState, useState } from "react";
import { createTeamAction, type CreateTeamState } from "./actions";
import {
  Label,
  buttonPrimary,
  inputClass,
} from "../admin-layout";

const COLORS = [
  "#fe2c55", // pink
  "#25f4ee", // cyan
  "#a855f7", // purple
  "#facc15", // yellow
  "#22c55e", // green
  "#fb923c", // orange
];

const initial: CreateTeamState = { ok: false, error: null };

export function CreateTeamForm() {
  const [state, formAction, pending] = useActionState(
    createTeamAction,
    initial
  );
  const [color, setColor] = useState(COLORS[0]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Label label="Squad-naam">
        <input
          name="name"
          required
          maxLength={20}
          placeholder="bv. Glow Girls"
          className={inputClass}
        />
      </Label>

      <Label label="Code" hint="4 letters, leeg laten = auto-gegenereerd">
        <input
          name="code"
          maxLength={8}
          placeholder="auto"
          autoCapitalize="characters"
          className={`${inputClass} font-mono uppercase tracking-widest`}
        />
      </Label>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
          Kleur
        </span>
        <input type="hidden" name="color" value={color} />
        <div className="flex flex-wrap gap-3">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-10 w-10 rounded-full transition ${
                c === color
                  ? "ring-2 ring-white ring-offset-2 ring-offset-bg-card"
                  : "opacity-60 hover:opacity-100"
              }`}
              style={{ background: c }}
              aria-label={`Kies kleur ${c}`}
            />
          ))}
        </div>
      </div>

      {state.error && (
        <p className="rounded-xl border border-pink/30 bg-pink/10 px-4 py-3 text-sm text-pink-soft">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm text-cyan-soft">
          Toegevoegd
        </p>
      )}

      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending ? "Bezig..." : "Squad toevoegen"}
      </button>
    </form>
  );
}
