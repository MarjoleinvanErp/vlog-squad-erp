"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toggleLikeAction } from "../actions";

const NAME_KEY = "speur:ouder-naam";

export function LikeButton({
  submissionId,
  initialLikes,
}: {
  submissionId: string;
  initialLikes: string[];
}) {
  const [likes, setLikes] = useState<string[]>(initialLikes);
  const [name, setName] = useState("");
  const [askName, setAskName] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(localStorage.getItem(NAME_KEY) ?? "");
  }, []);

  const iLiked = name !== "" && likes.includes(name);

  async function toggle(likerName: string) {
    setBusy(true);
    try {
      const result = await toggleLikeAction(submissionId, likerName);
      if (result.ok) setLikes(result.likes);
    } finally {
      setBusy(false);
    }
  }

  function handleClick() {
    if (!name) {
      setAskName(true);
      return;
    }
    toggle(name);
  }

  function handleNameSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const entered = String(fd.get("naam") ?? "").trim().slice(0, 40);
    if (!entered) return;
    localStorage.setItem(NAME_KEY, entered);
    setName(entered);
    setAskName(false);
    toggle(entered);
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-bg-card p-4">
      <div className="flex items-center gap-3">
        <motion.button
          type="button"
          onClick={handleClick}
          disabled={busy}
          whileTap={{ scale: 1.3 }}
          aria-label={iLiked ? "Like weghalen" : "Like geven"}
          className="text-3xl disabled:opacity-50"
        >
          {iLiked ? "❤️" : "🤍"}
        </motion.button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">
            {likes.length === 0
              ? "Geef als eerste een hartje!"
              : `${likes.length} ${likes.length === 1 ? "hartje" : "hartjes"}`}
          </p>
          {likes.length > 0 && (
            <p className="truncate text-xs text-fg-muted">
              van {likes.join(" · ")}
            </p>
          )}
        </div>
        {name && (
          <button
            type="button"
            onClick={() => setAskName(true)}
            className="text-xs text-fg-dim hover:text-fg"
          >
            {name} ✎
          </button>
        )}
      </div>

      {askName && (
        <form onSubmit={handleNameSubmit} className="flex gap-2">
          <input
            type="text"
            name="naam"
            defaultValue={name}
            required
            maxLength={40}
            placeholder="Je naam (bijv. Papa Jan)"
            autoFocus
            className="min-w-0 flex-1 rounded-xl border border-border-strong bg-bg-elev px-3 py-2 text-sm text-fg placeholder:text-fg-dim focus:border-pink focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-pink px-4 py-2 text-sm font-bold text-white"
          >
            OK
          </button>
        </form>
      )}
    </div>
  );
}
