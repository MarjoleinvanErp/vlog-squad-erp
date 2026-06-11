"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  submitChallengeAction,
  createSubmissionUploadUrl,
  type SubmitState,
} from "../actions";
import { maybeCompressImage } from "@/lib/image-compress";
import { supabaseBrowser } from "@/lib/supabase/browser";

const initial: SubmitState = { ok: false, error: null, redirect: null };

type Task = {
  id: string;
  type: "photo" | "video" | "text" | "multiple_choice" | "arrival";
  max_points: number;
  options: { choices: string[]; correct: number } | null;
  min_photos: number | null;
  max_photos: number | null;
  min_seconds: number | null;
  max_seconds: number | null;
};

export function ChallengeForm({ task }: { task: Task }) {
  if (task.type === "photo") {
    const max = task.max_photos ?? 1;
    const min = task.min_photos ?? max;
    return <PhotoForm task={task} minPhotos={min} maxPhotos={max} />;
  }
  if (task.type === "video") {
    const max = task.max_seconds ?? 10;
    const min = task.min_seconds ?? 1;
    return <VideoForm task={task} minSeconds={min} maxSeconds={max} />;
  }
  return <NonMediaForm task={task} />;
}

function NonMediaForm({ task }: { task: Task }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    submitChallengeAction,
    initial
  );

  useEffect(() => {
    if (state.redirect) {
      router.push(state.redirect);
    }
  }, [state.redirect, router]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="task_id" value={task.id} />
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

// ============================================================
// PHOTO FORM — multi-slot upload
// ============================================================

type PhotoSlot = { path: string; previewUrl: string } | null;

function draftKey(taskId: string) {
  return `speur:photo-draft:${taskId}`;
}

function PhotoForm({
  task,
  minPhotos,
  maxPhotos,
}: {
  task: Task;
  minPhotos: number;
  maxPhotos: number;
}) {
  const router = useRouter();
  const [slots, setSlots] = useState<PhotoSlot[]>(() =>
    Array.from({ length: maxPhotos }, () => null)
  );
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const restored = useRef(false);

  // Restore draft from localStorage on mount.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(draftKey(task.id));
      if (!raw) return;
      const paths = JSON.parse(raw) as Array<string | null>;
      if (!Array.isArray(paths)) return;
      const sb = supabaseBrowser();
      setSlots((prev) =>
        prev.map((slot, i) => {
          const p = paths[i];
          if (typeof p !== "string" || !p) return slot;
          const { data } = sb.storage.from("submission-photos").getPublicUrl(p);
          return { path: p, previewUrl: data.publicUrl };
        })
      );
    } catch {
      // negeer corrupte draft
    }
  }, [task.id]);

  // Persist draft whenever slots change.
  useEffect(() => {
    if (!restored.current) return;
    const paths = slots.map((s) => (s ? s.path : null));
    const anyFilled = paths.some(Boolean);
    if (anyFilled) {
      localStorage.setItem(draftKey(task.id), JSON.stringify(paths));
    } else {
      localStorage.removeItem(draftKey(task.id));
    }
  }, [slots, task.id]);

  const setSlot = useCallback((i: number, value: PhotoSlot) => {
    setSlots((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  }, []);

  async function handleCapture(i: number, file: File) {
    setError(null);
    setBusyIndex(i);
    try {
      const blob = await maybeCompressImage(file);
      const guessExt = file.name.split(".").pop()?.toLowerCase();
      const ext =
        blob.type === "image/jpeg"
          ? "jpg"
          : guessExt && /^[a-z0-9]{1,5}$/.test(guessExt)
            ? guessExt
            : "bin";

      const sig = await createSubmissionUploadUrl(task.id, ext);
      if (!sig.ok || !sig.path || !sig.token) {
        throw new Error(sig.error ?? "Geen signed URL");
      }

      const sb = supabaseBrowser();
      const { error: upErr } = await sb.storage
        .from("submission-photos")
        .uploadToSignedUrl(sig.path, sig.token, blob, {
          contentType: blob.type || file.type || "application/octet-stream",
        });
      if (upErr) throw new Error(upErr.message);

      const { data } = sb.storage
        .from("submission-photos")
        .getPublicUrl(sig.path);
      setSlot(i, { path: sig.path, previewUrl: data.publicUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload mislukt");
    } finally {
      setBusyIndex(null);
    }
  }

  const filledCount = slots.filter(Boolean).length;
  const canSubmit =
    filledCount >= minPhotos && filledCount <= maxPhotos && busyIndex == null;

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const paths = slots.filter((s): s is { path: string; previewUrl: string } => Boolean(s)).map(
        (s) => s.path
      );
      const fd = new FormData();
      fd.set("task_id", task.id);
      for (const p of paths) fd.append("photo_paths", p);
      const result = await submitChallengeAction(initial, fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      localStorage.removeItem(draftKey(task.id));
      if (result?.redirect) {
        router.push(result.redirect);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const rangeLabel =
    minPhotos === maxPhotos
      ? `${maxPhotos} foto${maxPhotos === 1 ? "" : "'s"} verplicht`
      : `Min ${minPhotos}, max ${maxPhotos} foto's`;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-cyan">
        {rangeLabel} · {filledCount}/{maxPhotos}
      </p>

      <div
        className={`grid gap-3 ${
          maxPhotos === 1
            ? "grid-cols-1"
            : maxPhotos === 2
              ? "grid-cols-2"
              : "grid-cols-2 sm:grid-cols-3"
        }`}
      >
        {slots.map((slot, i) => (
          <PhotoSlotCell
            key={i}
            index={i}
            slot={slot}
            busy={busyIndex === i}
            onCapture={(f) => handleCapture(i, f)}
            onClear={() => setSlot(i, null)}
          />
        ))}
      </div>

      {error && (
        <p className="rounded-xl border border-pink/30 bg-pink/10 px-4 py-3 text-sm text-pink-soft">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="rounded-2xl bg-pink px-6 py-5 text-lg font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
      >
        {submitting
          ? "Posten..."
          : filledCount < minPhotos
            ? `Nog ${minPhotos - filledCount} foto's nodig`
            : "Drop post"}
      </button>
    </div>
  );
}

function PhotoSlotCell({
  index,
  slot,
  busy,
  onCapture,
  onClear,
}: {
  index: number;
  slot: PhotoSlot;
  busy: boolean;
  onCapture: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onCapture(f);
  }

  return (
    <div className="relative aspect-square">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onChange}
        className="hidden"
      />
      {slot ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slot.previewUrl}
            alt={`Foto ${index + 1}`}
            className="absolute inset-0 h-full w-full rounded-2xl object-cover"
          />
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-sm font-bold text-white backdrop-blur"
            aria-label="Verwijder foto"
          >
            ✕
          </button>
          <span className="absolute bottom-2 left-2 rounded-full bg-pink/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
            {index + 1}
          </span>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border-strong bg-bg-card text-fg-muted transition hover:border-pink disabled:opacity-60"
        >
          {busy ? (
            <span className="text-xs font-semibold">Uploaden…</span>
          ) : (
            <>
              <div className="h-10 w-10 rounded-full border-2 border-border-strong" />
              <span className="text-xs font-semibold">
                Foto {index + 1}
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ============================================================
// VIDEO FORM — in-app recorder met harde timer
// ============================================================

type VideoStage = "idle" | "permissionDenied" | "ready" | "recording" | "preview";

function pickVideoMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/mp4;codecs=h264,aac",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const m of candidates) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}

function extFromMime(mime: string): string {
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("webm")) return "webm";
  return "bin";
}

function VideoForm({
  task,
  minSeconds,
  maxSeconds,
}: {
  task: Task;
  minSeconds: number;
  maxSeconds: number;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<VideoStage>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedMime, setRecordedMime] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const playbackRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current != null) cancelAnimationFrame(timerRef.current);
      stopStream();
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ensureStream(): Promise<MediaStream> {
    if (streamRef.current) return streamRef.current;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera niet beschikbaar in deze browser");
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: true,
    });
    streamRef.current = stream;
    return stream;
  }

  async function handleStartCamera() {
    setError(null);
    try {
      const stream = await ensureStream();
      if (previewRef.current) {
        previewRef.current.srcObject = stream;
        await previewRef.current.play().catch(() => undefined);
      }
      setStage("ready");
    } catch (e) {
      setStage("permissionDenied");
      setError(
        e instanceof Error
          ? e.message
          : "Geen toegang tot camera"
      );
    }
  }

  function tickTimer() {
    const now = performance.now();
    const sec = (now - startedAtRef.current) / 1000;
    setElapsed(sec);
    if (sec >= maxSeconds) {
      stopRecording();
      return;
    }
    timerRef.current = requestAnimationFrame(tickTimer);
  }

  function handleStartRecording() {
    setError(null);
    chunksRef.current = [];
    const stream = streamRef.current;
    if (!stream) {
      setError("Camera niet klaar");
      return;
    }
    const mime = pickVideoMime();
    setRecordedMime(mime);
    let recorder: MediaRecorder;
    try {
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    } catch (e) {
      setError(e instanceof Error ? e.message : "MediaRecorder werkt niet");
      return;
    }
    recorderRef.current = recorder;
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
    };
    recorder.onstop = () => {
      const actualMime = recorder.mimeType || mime || "video/webm";
      const blob = new Blob(chunksRef.current, { type: actualMime });
      setRecordedBlob(blob);
      const url = URL.createObjectURL(blob);
      setRecordedUrl(url);
      setRecordedMime(actualMime);
      setStage("preview");
      // Pauze de live preview-stream zodat alleen het opgenomen filmpje getoond wordt.
      if (previewRef.current) previewRef.current.srcObject = null;
      stopStream();
    };
    recorder.start();
    startedAtRef.current = performance.now();
    setElapsed(0);
    setStage("recording");
    timerRef.current = requestAnimationFrame(tickTimer);
  }

  function stopRecording() {
    if (timerRef.current != null) {
      cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  async function handleRetake() {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setElapsed(0);
    setStage("idle");
    setError(null);
  }

  async function handlePost() {
    if (!recordedBlob) return;
    if (elapsed < minSeconds) {
      setError(`Filmpje moet minimaal ${minSeconds}s zijn`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const ext = extFromMime(recordedMime);
      const sig = await createSubmissionUploadUrl(task.id, ext);
      if (!sig.ok || !sig.path || !sig.token) {
        throw new Error(sig.error ?? "Geen signed URL");
      }
      const sb = supabaseBrowser();
      const { error: upErr } = await sb.storage
        .from("submission-photos")
        .uploadToSignedUrl(sig.path, sig.token, recordedBlob, {
          contentType: recordedMime || "application/octet-stream",
        });
      if (upErr) throw new Error(upErr.message);

      const fd = new FormData();
      fd.set("task_id", task.id);
      fd.append("photo_paths", sig.path);
      const result = await submitChallengeAction(initial, fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result?.redirect) {
        router.push(result.redirect);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload mislukt");
    } finally {
      setSubmitting(false);
    }
  }

  const seconds = Math.max(0, Math.min(maxSeconds, elapsed));
  const remaining = Math.max(0, maxSeconds - seconds);
  const progress = Math.min(1, seconds / maxSeconds);

  const rangeLabel =
    minSeconds === maxSeconds
      ? `Precies ${maxSeconds}s`
      : `${minSeconds}–${maxSeconds}s`;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-cyan">
        Video · {rangeLabel}
      </p>

      <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border-2 border-border-strong bg-black">
        {stage !== "preview" ? (
          <video
            ref={previewRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <video
            ref={playbackRef}
            src={recordedUrl ?? undefined}
            autoPlay
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {stage === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-center">
            <div className="h-16 w-16 rounded-full border-2 border-pink/70" />
            <p className="px-6 text-sm text-white">
              Klik op &quot;Camera aan&quot; om te starten
            </p>
          </div>
        )}

        {stage === "permissionDenied" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center">
            <p className="text-sm text-white">
              Camera-toegang geweigerd. Open de instellingen en sta camera + microfoon toe.
            </p>
          </div>
        )}

        {stage === "recording" && (
          <RecordingOverlay
            remaining={remaining}
            progress={progress}
          />
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-pink/30 bg-pink/10 px-4 py-3 text-sm text-pink-soft">
          {error}
        </p>
      )}

      {(stage === "idle" || stage === "permissionDenied") && (
        <button
          type="button"
          onClick={handleStartCamera}
          className="rounded-2xl border-2 border-pink bg-pink/10 px-6 py-5 text-lg font-bold text-pink transition active:scale-[0.98]"
        >
          Camera aan
        </button>
      )}

      {stage === "ready" && (
        <button
          type="button"
          onClick={handleStartRecording}
          className="rounded-2xl bg-pink px-6 py-5 text-lg font-bold text-white transition active:scale-[0.98]"
        >
          ● Start opname
        </button>
      )}

      {stage === "recording" && (
        <button
          type="button"
          onClick={stopRecording}
          className="rounded-2xl bg-pink px-6 py-5 text-lg font-bold text-white transition active:scale-[0.98]"
        >
          ■ Stop
        </button>
      )}

      {stage === "preview" && (
        <div className="flex flex-col gap-3">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-fg-muted">
            {Math.round(elapsed)}s opgenomen
          </p>
          <button
            type="button"
            onClick={handlePost}
            disabled={submitting || elapsed < minSeconds}
            className="rounded-2xl bg-pink px-6 py-5 text-lg font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {submitting
              ? "Posten..."
              : elapsed < minSeconds
                ? `Te kort (min ${minSeconds}s)`
                : "Drop post"}
          </button>
          <button
            type="button"
            onClick={handleRetake}
            disabled={submitting}
            className="rounded-2xl border-2 border-border-strong px-6 py-3 text-sm font-bold text-fg-muted transition active:scale-[0.98] disabled:opacity-50"
          >
            Opnieuw
          </button>
        </div>
      )}
    </div>
  );
}

function RecordingOverlay({
  remaining,
  progress,
}: {
  remaining: number;
  progress: number;
}) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference * (1 - progress);
  return (
    <>
      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur">
        <span className="block h-2.5 w-2.5 animate-pulse rounded-full bg-pink" />
        <span className="text-xs font-bold uppercase tracking-widest text-white">
          REC
        </span>
      </div>
      <div className="absolute right-3 top-3 flex items-center justify-center">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="rgba(0,0,0,0.5)"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="4"
          />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="#fe2c55"
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 40 40)"
            style={{ filter: "drop-shadow(0 0 6px rgba(254,44,85,0.8))" }}
          />
          <text
            x="40"
            y="46"
            textAnchor="middle"
            fontSize="22"
            fontWeight="bold"
            fill="white"
          >
            {Math.ceil(remaining)}
          </text>
        </svg>
      </div>
    </>
  );
}

// ============================================================
// TEXT + MULTIPLE CHOICE
// ============================================================

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
