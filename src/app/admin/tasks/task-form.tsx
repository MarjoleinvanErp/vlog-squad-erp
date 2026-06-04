"use client";

import { useActionState, useState } from "react";
import { createTaskAction, type CreateTaskState } from "./actions";
import { Label, buttonPrimary, inputClass } from "../admin-layout";

const initial: CreateTaskState = { ok: false, error: null };

const TYPE_OPTIONS: {
  value: "photo" | "text" | "multiple_choice" | "arrival";
  label: string;
  hint: string;
}[] = [
  { value: "photo", label: "Photo / Video Drop", hint: "Foto- of videopost" },
  { value: "text", label: "Hot Take / Text", hint: "Open antwoord" },
  { value: "multiple_choice", label: "Quiz", hint: "Meerkeuze, auto-check" },
  { value: "arrival", label: "Arrival", hint: "Auto bij GPS-aankomst" },
];

export function CreateTaskForm({
  locations,
}: {
  locations: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    createTaskAction,
    initial
  );
  const [type, setType] = useState<typeof TYPE_OPTIONS[number]["value"]>("photo");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
          Type
        </span>
        <input type="hidden" name="type" value={type} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                type === opt.value
                  ? "border-pink bg-pink/10 text-fg"
                  : "border-border-strong bg-bg-elev text-fg-muted hover:border-cyan"
              }`}
            >
              <span className="block font-bold">{opt.label}</span>
              <span className="block text-xs text-fg-dim">{opt.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <Label label="Titel">
        <input
          name="title"
          required
          maxLength={60}
          placeholder="bv. Dance bij de kerk"
          className={inputClass}
        />
      </Label>

      <Label label="Beschrijving" hint="Wat moet de squad doen?">
        <textarea
          name="description"
          rows={3}
          required
          maxLength={500}
          className={inputClass}
        />
      </Label>

      <div className="grid grid-cols-2 gap-4">
        <Label
          label="Locatie"
          hint={type === "arrival" ? "verplicht" : "optioneel"}
        >
          <select
            name="location_id"
            defaultValue=""
            required={type === "arrival"}
            className={inputClass}
          >
            <option value="">— geen locatie —</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Label>
        <Label label="Max likes">
          <input
            type="number"
            name="max_points"
            min={1}
            defaultValue={10}
            className={inputClass}
          />
        </Label>
      </div>

      {type === "multiple_choice" && (
        <>
          <Label
            label="Opties"
            hint="Eén per regel, eerste = index 0"
          >
            <textarea
              name="options"
              rows={4}
              placeholder={"1880\n1905\n1936"}
              className={`${inputClass} font-mono`}
            />
          </Label>
          <Label label="Index juiste antwoord" hint="0 = eerste optie, 1 = tweede, etc.">
            <input
              type="number"
              name="correct_index"
              min={0}
              defaultValue={0}
              className={inputClass}
            />
          </Label>
        </>
      )}

      {state.error && (
        <p className="rounded-xl border border-pink/30 bg-pink/10 px-4 py-3 text-sm text-pink-soft">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm text-cyan-soft">
          Challenge toegevoegd
        </p>
      )}

      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending ? "Bezig..." : "Challenge toevoegen"}
      </button>
    </form>
  );
}
