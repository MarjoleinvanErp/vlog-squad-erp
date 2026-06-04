"use client";

import { useActionState } from "react";
import {
  updateEventAction,
  type UpdateEventState,
} from "./actions";
import {
  Label,
  buttonPrimary,
  inputClass,
} from "../admin-layout";

const initial: UpdateEventState = { ok: false, error: null };

function toLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventForm({
  event,
}: {
  event: {
    name: string;
    starts_at: string;
    ends_at: string;
    admin_code: string;
    active: boolean;
    start_lat: number | null;
    start_lng: number | null;
  };
}) {
  const [state, formAction, pending] = useActionState(
    updateEventAction,
    initial
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Label label="Event naam">
        <input
          name="name"
          defaultValue={event.name}
          required
          className={inputClass}
        />
      </Label>

      <div className="grid grid-cols-2 gap-4">
        <Label label="Start">
          <input
            type="datetime-local"
            name="starts_at"
            defaultValue={toLocal(event.starts_at)}
            required
            className={inputClass}
          />
        </Label>
        <Label label="Einde">
          <input
            type="datetime-local"
            name="ends_at"
            defaultValue={toLocal(event.ends_at)}
            required
            className={inputClass}
          />
        </Label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Label label="Vertrek lat" hint="bv. 51.5957">
          <input
            name="start_lat"
            type="number"
            step="0.0000001"
            defaultValue={event.start_lat ?? ""}
            className={inputClass}
          />
        </Label>
        <Label label="Vertrek lng" hint="bv. 5.6017">
          <input
            name="start_lng"
            type="number"
            step="0.0000001"
            defaultValue={event.start_lng ?? ""}
            className={inputClass}
          />
        </Label>
      </div>

      <Label label="Admincode" hint="Read-only. Verander via SQL als nodig.">
        <input
          value={event.admin_code}
          disabled
          className={`${inputClass} cursor-not-allowed opacity-60`}
        />
      </Label>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          name="active"
          defaultChecked={event.active}
          className="h-5 w-5 accent-pink"
        />
        <span className="text-sm">Event is actief (squads kunnen inloggen)</span>
      </label>

      {state.error && (
        <p className="rounded-xl border border-pink/30 bg-pink/10 px-4 py-3 text-sm text-pink-soft">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm text-cyan-soft">
          Opgeslagen
        </p>
      )}

      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending ? "Bezig..." : "Opslaan"}
      </button>
    </form>
  );
}
