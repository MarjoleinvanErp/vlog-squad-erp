"use client";

import { useActionState, useRef, useState } from "react";
import {
  pickSquadNameAction,
  uploadTeamPhotoAction,
  type PickNameState,
} from "./actions";

const initial: PickNameState = { ok: false, error: null };

type Stage = "name" | "photo";

const INSPIRATION = [
  "Glow Girls",
  "Erp Era",
  "Vibe Squad",
  "Main Characters",
  "It Girls",
  "Soft Pink",
  "Cyber Crew",
  "Sunset Crew",
];

export function OnboardingWizard({
  teamColor,
  currentName,
}: {
  teamColor: string;
  currentName: string;
}) {
  const [stage, setStage] = useState<Stage>("name");
  const [name, setName] = useState<string>(currentName);
  const [nameState, nameFormAction, namePending] = useActionState(
    pickSquadNameAction,
    initial
  );

  if (nameState.ok && stage === "name") {
    setStage("photo");
  }

  if (stage === "name") {
    return (
      <form action={nameFormAction} className="flex flex-col gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan">
            stap 1 van 2
          </p>
          <h2 className="mt-2 text-3xl font-bold leading-tight">
            Hoe heet je <span className="text-gradient">squad</span>?
          </h2>
          <p className="mt-2 text-fg-muted">
            Bedenk samen iets cools. Max 24 tekens.
          </p>
        </div>

        <label className="flex flex-col gap-2">
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={24}
            autoFocus
            placeholder="bv. Glow Girls"
            className="rounded-2xl border-2 border-border-strong bg-bg-card px-4 py-5 text-center text-2xl font-bold text-fg placeholder:text-fg-dim focus:border-pink focus:outline-none focus:glow-pink"
          />
          <span className="text-right text-xs text-fg-dim">
            {name.length}/24
          </span>
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
            Geen idee? Tap er een
          </span>
          <div className="flex flex-wrap gap-2">
            {INSPIRATION.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setName(s)}
                className="rounded-full border border-border-strong bg-bg-card px-3 py-1.5 text-xs text-fg-muted hover:border-cyan hover:text-cyan"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {nameState.error && (
          <p className="rounded-xl border border-pink/30 bg-pink/10 px-4 py-3 text-sm text-pink-soft">
            {nameState.error}
          </p>
        )}

        <button
          type="submit"
          disabled={name.trim().length < 2 || namePending}
          className="rounded-2xl bg-pink px-6 py-5 text-lg font-bold text-white transition active:scale-[0.98] disabled:opacity-30"
        >
          {namePending ? "Bezig..." : "Volgende"}
        </button>
      </form>
    );
  }

  return <PhotoStage squadName={name} teamColor={teamColor} />;
}

function PhotoStage({
  squadName,
  teamColor,
}: {
  squadName: string;
  teamColor: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <form
      action={async (fd) => {
        setPending(true);
        await uploadTeamPhotoAction(fd);
      }}
      className="flex flex-col gap-6"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan">
          stap 2 van 2
        </p>
        <h2 className="mt-2 text-3xl font-bold leading-tight">
          Maak je <span className="text-gradient">channel art</span>
        </h2>
        <p className="mt-2 text-fg-muted">
          Eén groepsfoto van squad{" "}
          <span className="font-bold" style={{ color: teamColor }}>
            @{squadName}
          </span>
          .
        </p>
      </div>

      <label className="relative block aspect-square cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed border-border-strong bg-bg-card hover:border-pink">
        <input
          ref={fileInput}
          type="file"
          name="photo"
          accept="image/*"
          capture="environment"
          required
          onChange={onFileChange}
          className="absolute inset-0 z-10 cursor-pointer opacity-0"
        />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="preview"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-fg-muted">
            <div className="h-16 w-16 rounded-full border-2 border-border-strong" />
            <span className="text-sm font-semibold">Tap om foto te maken</span>
          </div>
        )}
      </label>

      <button
        type="submit"
        disabled={!preview || pending}
        className="rounded-2xl bg-pink px-6 py-5 text-lg font-bold text-white transition active:scale-[0.98] disabled:opacity-30"
      >
        {pending ? "Bezig..." : "Go live"}
      </button>
    </form>
  );
}
