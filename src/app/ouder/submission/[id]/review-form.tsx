"use client";

import { useState } from "react";
import {
  approveSubmissionAction,
  rejectSubmissionAction,
} from "../actions";

export function ReviewForm({
  submissionId,
  maxPoints,
}: {
  submissionId: string;
  maxPoints: number;
}) {
  const [points, setPoints] = useState(maxPoints);
  const [showReject, setShowReject] = useState(false);

  const quickButtons = [0, 25, 50, 75, 100];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
            Likes geven
          </span>
          <span className="text-3xl font-bold text-pink">
            {points}
            <span className="ml-1 text-sm font-normal text-fg-dim">
              / {maxPoints}
            </span>
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={maxPoints}
          value={points}
          onChange={(e) => setPoints(Number(e.target.value))}
          className="w-full accent-pink"
        />
        <div className="flex justify-between gap-1">
          {quickButtons.map((pct) => {
            const v = Math.round((maxPoints * pct) / 100);
            return (
              <button
                key={pct}
                type="button"
                onClick={() => setPoints(v)}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
                  points === v
                    ? "border-pink bg-pink/10 text-pink"
                    : "border-border-strong bg-bg-elev text-fg-muted hover:border-cyan"
                }`}
              >
                {pct}%
              </button>
            );
          })}
        </div>
      </div>

      <form
        action={approveSubmissionAction}
        className="flex flex-col gap-3"
      >
        <input type="hidden" name="id" value={submissionId} />
        <input type="hidden" name="points" value={points} />
        <input
          type="text"
          name="reviewer"
          placeholder="Wie review je? (optioneel)"
          className="rounded-xl border border-border-strong bg-bg-elev px-3 py-2 text-sm text-fg placeholder:text-fg-dim focus:border-pink focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-2xl bg-pink px-6 py-4 text-lg font-bold text-white transition active:scale-[0.98]"
        >
          Goedkeuren · +{points} likes
        </button>
      </form>

      {!showReject ? (
        <button
          type="button"
          onClick={() => setShowReject(true)}
          className="text-sm text-fg-muted hover:text-pink"
        >
          Of: afwijzen ↓
        </button>
      ) : (
        <form
          action={rejectSubmissionAction}
          className="flex flex-col gap-3 rounded-2xl border border-fg-dim/30 bg-bg-elev p-4"
        >
          <input type="hidden" name="id" value={submissionId} />
          <input
            type="text"
            name="note"
            placeholder="Reden (optioneel)"
            className="rounded-xl border border-border-strong bg-bg-card px-3 py-2 text-sm text-fg placeholder:text-fg-dim focus:border-pink focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl border border-pink/30 bg-pink/10 px-4 py-3 text-sm font-bold text-pink-soft hover:bg-pink/20"
          >
            Afwijzen
          </button>
        </form>
      )}
    </div>
  );
}
