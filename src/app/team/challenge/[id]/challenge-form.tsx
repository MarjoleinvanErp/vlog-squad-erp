"use client";

import { useActionState, useRef, useState } from "react";
import { submitChallengeAction, type SubmitState } from "../actions";

const initial: SubmitState = { ok: false, error: null };

type Task = {
  id: string;
  type: "photo" | "text" | "multiple_choice" | "arrival";
  max_points: number;
  options: { choices: string[]; correct: number } | null;
};

export function ChallengeForm({ task }: { task: Task }) {
  const [state, formAction, pending] = useActionState(
    submitChallengeAction,
    initial
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="task_id" value={task.id} />
      {task.type === "photo" && <PhotoField />}
      {task.type === "text" && <TextField />}
      {task.type === "multiple_choice" && task.options && (
        <MultipleChoiceField choices={task.options.choices} />
      )}

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
        {pending ? "Posting..." : "Drop post"}
      </button>
    </form>
  );
}

function PhotoField() {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setPreview(r.result as string);
    r.readAsDataURL(f);
  }

  return (
    <label className="relative block aspect-square cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed border-border-strong bg-bg-card hover:border-pink">
      <input
        ref={inputRef}
        type="file"
        name="photo"
        accept="image/*,video/*"
        capture="environment"
        required
        onChange={onChange}
        className="absolute inset-0 z-10 cursor-pointer opacity-0"
      />
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-fg-muted">
          <div className="h-16 w-16 rounded-full border-2 border-border-strong" />
          <span className="text-sm font-semibold">Tap voor foto/video</span>
        </div>
      )}
    </label>
  );
}

function TextField() {
  return (
    <textarea
      name="text_answer"
      rows={5}
      required
      maxLength={500}
      placeholder="Schrijf je hot take..."
      className="rounded-2xl border-2 border-border-strong bg-bg-card px-4 py-4 text-fg placeholder:text-fg-dim focus:border-pink focus:outline-none"
    />
  );
}

function MultipleChoiceField({ choices }: { choices: string[] }) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="choice_index" value={selected ?? -1} />
      {choices.map((c, i) => (
        <button
          key={i}
          type="button"
          onClick={() => setSelected(i)}
          className={`rounded-2xl border-2 px-4 py-4 text-left text-lg font-bold transition ${
            selected === i
              ? "border-pink bg-pink/20 text-fg glow-pink"
              : "border-border-strong bg-bg-card text-fg hover:border-cyan"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
