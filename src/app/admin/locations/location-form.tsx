"use client";

import { useActionState } from "react";
import {
  createLocationAction,
  type CreateLocationState,
} from "./actions";
import { Label, buttonPrimary, inputClass } from "../admin-layout";
import { MapPicker } from "./map-picker";

const initial: CreateLocationState = { ok: false, error: null };

export function CreateLocationForm() {
  const [state, formAction, pending] = useActionState(
    createLocationAction,
    initial
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Label label="Naam">
        <input
          name="name"
          required
          maxLength={60}
          placeholder="bv. Sint-Servatiuskerk"
          className={inputClass}
        />
      </Label>

      <Label label="Omschrijving" hint="Wordt op kaart en locatie-detail getoond">
        <textarea
          name="description"
          rows={2}
          maxLength={240}
          placeholder="optioneel"
          className={inputClass}
        />
      </Label>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
          Positie op kaart
        </span>
        <MapPicker />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Label label="Radius (meter)" hint="binnen X meter = aangekomen">
          <input
            type="number"
            name="radius_meters"
            min={5}
            max={500}
            defaultValue={30}
            className={inputClass}
          />
        </Label>
        <Label label="Likes bij aankomst">
          <input
            type="number"
            name="arrival_points"
            min={0}
            defaultValue={10}
            className={inputClass}
          />
        </Label>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Label label="1e bonus">
          <input
            type="number"
            name="bonus_first"
            min={0}
            defaultValue={5}
            className={inputClass}
          />
        </Label>
        <Label label="2e bonus">
          <input
            type="number"
            name="bonus_second"
            min={0}
            defaultValue={3}
            className={inputClass}
          />
        </Label>
        <Label label="3e bonus">
          <input
            type="number"
            name="bonus_third"
            min={0}
            defaultValue={1}
            className={inputClass}
          />
        </Label>
      </div>

      {state.error && (
        <p className="rounded-xl border border-pink/30 bg-pink/10 px-4 py-3 text-sm text-pink-soft">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm text-cyan-soft">
          Locatie toegevoegd
        </p>
      )}

      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending ? "Bezig..." : "Locatie toevoegen"}
      </button>
    </form>
  );
}
