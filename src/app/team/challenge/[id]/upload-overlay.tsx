"use client";

import { motion } from "framer-motion";

export type UploadOverlayState =
  | { phase: "uploading"; progress: number | null; label: string }
  | { phase: "success" };

export function UploadOverlay({ state }: { state: UploadOverlayState | null }) {
  if (!state) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0, 0, 0, 0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      {state.phase === "uploading" ? (
        <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-3xl border-2 border-pink bg-bg-card p-8 glow-pink">
          <h2 className="text-2xl font-bold">
            <span className="text-gradient">{state.label}</span>
          </h2>

          <ProgressBar progress={state.progress} />

          <p className="text-sm font-semibold text-fg-muted">
            Nog even wachten! 📤
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex w-full max-w-sm flex-col items-center gap-5 rounded-3xl border-2 border-cyan bg-bg-card p-10 glow-cyan"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-cyan/20 text-6xl"
          >
            ✅
          </motion.div>
          <h2 className="text-3xl font-bold">
            <span className="text-gradient">Post geplaatst!</span>
          </h2>
          <p className="text-lg">🎉</p>
        </motion.div>
      )}
    </div>
  );
}

function ProgressBar({ progress }: { progress: number | null }) {
  return (
    <div className="w-full">
      <div className="h-4 w-full overflow-hidden rounded-full border border-border-strong bg-bg-elev">
        {progress != null ? (
          <div
            className="h-full rounded-full bg-gradient-to-r from-pink to-cyan transition-[width] duration-300 ease-out"
            style={{
              width: `${Math.round(progress * 100)}%`,
              boxShadow: "0 0 12px rgba(254,44,85,0.7)",
            }}
          />
        ) : (
          <motion.div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-pink to-cyan"
            style={{ boxShadow: "0 0 12px rgba(254,44,85,0.7)" }}
            animate={{ x: ["-100%", "300%"] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
          />
        )}
      </div>
      {progress != null && (
        <p className="mt-2 text-center text-sm font-bold text-cyan">
          {Math.round(progress * 100)}%
        </p>
      )}
    </div>
  );
}
