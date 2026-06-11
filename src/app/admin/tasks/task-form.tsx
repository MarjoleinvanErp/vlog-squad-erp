"use client";

import { useActionState, useState } from "react";
import {
  createTaskAction,
  updateTaskAction,
  type CreateTaskState,
} from "./actions";
import { Label, buttonPrimary, inputClass } from "../admin-layout";

const initial: CreateTaskState = { ok: false, error: null };

type TaskTypeValue = "photo" | "video" | "text" | "multiple_choice" | "arrival";

const TYPE_OPTIONS: {
  value: TaskTypeValue;
  label: string;
  hint: string;
}[] = [
  { value: "photo", label: "Photo Drop", hint: "1+ foto's insturen" },
  { value: "video", label: "Video Drop", hint: "Korte video opnemen" },
  { value: "text", label: "Hot Take", hint: "Open antwoord" },
  { value: "multiple_choice", label: "Quiz", hint: "Meerkeuze, auto-check" },
  { value: "arrival", label: "Arrival", hint: "Auto bij GPS-aankomst" },
];

export type TaskFormValue = {
  id: string;
  type: TaskTypeValue;
  title: string;
  description: string;
  location_id: string | null;
  max_points: number;
  options: { choices: string[]; correct: number } | null;
  min_photos: number | null;
  max_photos: number | null;
  min_seconds: number | null;
  max_seconds: number | null;
};

export function TaskForm({
  task,
  locations,
}: {
  task?: TaskFormValue;
  locations: { id: string; name: string }[];
}) {
  const isEdit = !!task;
  const action = isEdit ? updateTaskAction : createTaskAction;
  const [state, formAction, pending] = useActionState(action, initial);
  const [type, setType] = useState<TaskTypeValue>(task?.type ?? "photo");

  const initialPhotoRange =
    !!task &&
    task.type === "photo" &&
    (task.min_photos ?? 1) !== (task.max_photos ?? 1);
  const initialVideoRange =
    !!task &&
    task.type === "video" &&
    (task.min_seconds ?? 1) !== (task.max_seconds ?? 10);
  const [rangeMode, setRangeMode] = useState<boolean>(
    initialPhotoRange || initialVideoRange
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {isEdit && <input type="hidden" name="id" value={task!.id} />}

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
          Type
        </span>
        <input type="hidden" name="type" value={type} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setType(opt.value);
                setRangeMode(false);
              }}
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
          defaultValue={task?.title ?? ""}
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
          defaultValue={task?.description ?? ""}
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
            defaultValue={task?.location_id ?? ""}
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
            defaultValue={task?.max_points ?? 10}
            className={inputClass}
          />
        </Label>
      </div>

      {type === "photo" && (
        <PhotoCountFields
          rangeMode={rangeMode}
          onToggleRange={() => setRangeMode((v) => !v)}
          defaultMax={task?.max_photos ?? 1}
          defaultMin={task?.min_photos ?? task?.max_photos ?? 1}
        />
      )}

      {type === "video" && (
        <VideoDurationFields
          rangeMode={rangeMode}
          onToggleRange={() => setRangeMode((v) => !v)}
          defaultMax={task?.max_seconds ?? 10}
          defaultMin={task?.min_seconds ?? 1}
        />
      )}

      {type === "multiple_choice" && (
        <>
          <Label
            label="Opties"
            hint="Eén per regel, eerste = index 0"
          >
            <textarea
              name="options"
              rows={4}
              defaultValue={task?.options?.choices.join("\n") ?? ""}
              placeholder={"1880\n1905\n1936"}
              className={`${inputClass} font-mono`}
            />
          </Label>
          <Label label="Index juiste antwoord" hint="0 = eerste optie, 1 = tweede, etc.">
            <input
              type="number"
              name="correct_index"
              min={0}
              defaultValue={task?.options?.correct ?? 0}
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
          {isEdit ? "Bijgewerkt" : "Challenge toegevoegd"}
        </p>
      )}

      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending
          ? "Bezig..."
          : isEdit
            ? "Wijzigingen opslaan"
            : "Challenge toevoegen"}
      </button>
    </form>
  );
}

export function CreateTaskForm({
  locations,
}: {
  locations: { id: string; name: string }[];
}) {
  return <TaskForm locations={locations} />;
}

function PhotoCountFields({
  rangeMode,
  onToggleRange,
  defaultMax,
  defaultMin,
}: {
  rangeMode: boolean;
  onToggleRange: () => void;
  defaultMax: number;
  defaultMin: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-4">
        <Label
          label="Aantal foto's"
          hint={rangeMode ? "maximum" : "precies dit aantal"}
        >
          <input
            type="number"
            name="max_photos"
            min={1}
            max={10}
            defaultValue={defaultMax}
            required
            className={inputClass}
          />
        </Label>
        {rangeMode && (
          <Label label="Min foto's" hint="minimaal vereist">
            <input
              type="number"
              name="min_photos"
              min={1}
              max={10}
              defaultValue={defaultMin}
              required
              className={inputClass}
            />
          </Label>
        )}
      </div>
      <button
        type="button"
        onClick={onToggleRange}
        className="self-start text-xs font-bold uppercase tracking-widest text-cyan hover:text-pink"
      >
        {rangeMode ? "— vast aantal" : "+ ook minder toestaan"}
      </button>
    </div>
  );
}

function VideoDurationFields({
  rangeMode,
  onToggleRange,
  defaultMax,
  defaultMin,
}: {
  rangeMode: boolean;
  onToggleRange: () => void;
  defaultMax: number;
  defaultMin: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-4">
        <Label label="Max seconden" hint="harde stop bij opname">
          <input
            type="number"
            name="max_seconds"
            min={1}
            max={60}
            defaultValue={defaultMax}
            required
            className={inputClass}
          />
        </Label>
        {rangeMode && (
          <Label label="Min seconden" hint="korter wordt afgewezen">
            <input
              type="number"
              name="min_seconds"
              min={1}
              max={60}
              defaultValue={defaultMin}
              required
              className={inputClass}
            />
          </Label>
        )}
      </div>
      <button
        type="button"
        onClick={onToggleRange}
        className="self-start text-xs font-bold uppercase tracking-widest text-cyan hover:text-pink"
      >
        {rangeMode ? "— alleen max" : "+ ook min-duur"}
      </button>
    </div>
  );
}
