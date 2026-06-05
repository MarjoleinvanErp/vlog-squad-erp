"use client";

type ExtendedWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let cached: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!cached) {
    try {
      const Ctor =
        window.AudioContext ||
        (window as ExtendedWindow).webkitAudioContext;
      if (!Ctor) return null;
      cached = new Ctor();
    } catch {
      return null;
    }
  }
  if (cached.state === "suspended") {
    cached.resume().catch(() => {});
  }
  return cached;
}

function note(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  gainPeak = 0.25,
  type: OscillatorType = "triangle"
) {
  const t0 = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(gainPeak, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export function playArrivalChime() {
  const ctx = getContext();
  if (!ctx) return;
  // Cheerful 3-note rising arpeggio (G5 → C6 → E6)
  note(ctx, 783.99, 0, 0.25);
  note(ctx, 1046.5, 0.1, 0.3);
  note(ctx, 1318.51, 0.22, 0.45);
}

export function playSosAlarm() {
  const ctx = getContext();
  if (!ctx) return;
  // Urgent alternating tone, 6 short beeps
  for (let i = 0; i < 6; i++) {
    note(ctx, i % 2 === 0 ? 880 : 660, i * 0.16, 0.13, 0.22, "square");
  }
}

export function vibrateArrival() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([80, 40, 80, 40, 200]);
  }
}

export function vibrateSos() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([200, 100, 200, 100, 200, 100, 600]);
  }
}
