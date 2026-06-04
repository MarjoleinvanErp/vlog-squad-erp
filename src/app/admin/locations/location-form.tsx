"use client";

import { useActionState } from "react";
import {
  createLocationAction,
  updateLocationAction,
  type LocationFormState,
} from "./actions";
import { Label, buttonPrimary, inputClass } from "../admin-layout";
import { MapPicker } from "./map-picker";

const initial: LocationFormState = { ok: false, error: null };

export type LocationFormValue = {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  radius_meters: number;
  arrival_points: number;
  bonus_first: number;
  bonus_second: number;
  bonus_third: number;
};

export function LocationForm({ location }: { location?: LocationFormValue }) {
  const isEdit = !!location;
  const action = isEdit ? updateLocationAction : createLocationAction;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {isEdit && <input type="hidden" name="id" value={location!.id} />}

      <Label label="Naam">
        <input
          name="name"
          required
          maxLength={60}
          defaultValue={location?.name ?? ""}
          placeholder="bv. Sint-Servatiuskerk"
          className={inputClass}
        />
      </Label>

      <Label
        label="Omschrijving"
        hint="Wordt op kaart en locatie-detail getoond"
      >
        <textarea
          name="description"
          rows={2}
          maxLength={240}
          defaultValue={location?.description ?? ""}
          placeholder="optioneel"
          className={inputClass}
        />
      </Label>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
          Positie op kaart
        </span>
        <MapPicker
          initialLat={location?.lat ?? null}
          initialLng={location?.lng ?? null}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Label label="Radius (meter)" hint="binnen X meter = aangekomen">
          <input
            type="number"
            name="radius_meters"
            min={5}
            max={500}
            defaultValue={location?.radius_meters ?? 30}
            className={inputClass}
          />
        </Label>
        <Label label="Likes bij aankomst">
          <input
            type="number"
            name="arrival_points"
            min={0}
            defaultValue={location?.arrival_points ?? 10}
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
            defaultValue={location?.bonus_first ?? 5}
            className={inputClass}
          />
        </Label>
        <Label label="2e bonus">
          <input
            type="number"
            name="bonus_second"
            min={0}
            defaultValue={location?.bonus_second ?? 3}
            className={inputClass}
          />
        </Label>
        <Label label="3e bonus">
          <input
            type="number"
            name="bonus_third"
            min={0}
            defaultValue={location?.bonus_third ?? 1}
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
          {isEdit ? "Bijgewerkt" : "Locatie toegevoegd"}
        </p>
      )}

      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending
          ? "Bezig..."
          : isEdit
            ? "Wijzigingen opslaan"
            : "Locatie toevoegen"}
      </button>
    </form>
  );
}

export function CreateLocationForm() {
  return <LocationForm />;
}
