"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export type FeedRow = {
  id: string;
  status: "pending" | "approved" | "rejected";
  awarded_points: number | null;
  photo_urls: string[];
  text_answer: string | null;
  submitted_at: string;
  review_note: string | null;
  reviewed_by: string | null;
  task_title: string | null;
  task_type: string | null;
  team: {
    name: string;
    color: string;
    team_photo_url: string | null;
  } | null;
};

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "net";
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  return `${hr}u`;
}

export function FeedStream({
  teamId,
  submissions,
  teamName,
  teamColor,
  teamAvatar,
}: {
  teamId: string;
  submissions: FeedRow[];
  teamName: string;
  teamColor: string;
  teamAvatar: string | null;
}) {
  const router = useRouter();

  useEffect(() => {
    const sb = supabaseBrowser();
    const channel = sb
      .channel(`team-feed-${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "submissions",
        },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "events",
        },
        () => router.refresh()
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [teamId, router]);

  return (
    <div
      className="flex flex-col gap-4 px-3 pt-3"
      style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}
    >
      <AnimatePresence initial={false}>
        {submissions.map((s, i) => {
          const t = s.team ?? {
            name: teamName,
            color: teamColor,
            team_photo_url: teamAvatar,
          };
          const heroUrl = s.photo_urls[0] ?? null;
          const extraCount = Math.max(0, s.photo_urls.length - 1);
          const showComment =
            s.status === "rejected" ||
            (s.status === "approved" && !!s.review_note);
          return (
            <motion.article
              key={s.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.2), duration: 0.3 }}
              className="overflow-hidden rounded-3xl border border-border bg-bg-card shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            >
              <div className="relative">
                <Media url={heroUrl} text={s.text_answer} />

                {s.status === "rejected" && <RejectedStamp />}

                {extraCount > 0 && (
                  <span className="absolute right-3 top-12 z-10 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
                    +{extraCount}
                  </span>
                )}

                <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-gradient-to-b from-black/70 to-transparent px-4 pb-8 pt-3">
                  {t.team_photo_url ? (
                    <div
                      className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full"
                      style={{
                        outline: `2px solid ${t.color}`,
                        outlineOffset: 1,
                      }}
                    >
                      <Image
                        src={t.team_photo_url}
                        alt=""
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="h-9 w-9 flex-shrink-0 rounded-full"
                      style={{ background: t.color }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-bold leading-tight text-white"
                      style={{ textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}
                    >
                      @{t.name}
                    </p>
                    <p
                      className="text-[11px] text-white/80"
                      style={{ textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}
                    >
                      {relativeTime(s.submitted_at)}
                    </p>
                  </div>
                  <StatusPill
                    status={s.status}
                    awarded={s.awarded_points}
                  />
                </div>

                <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-4 pt-12">
                  <div className="min-w-0 flex-1">
                    {s.task_title && (
                      <p
                        className="truncate text-xs font-semibold uppercase tracking-widest text-white/70"
                        style={{ textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}
                      >
                        {s.task_title}
                      </p>
                    )}
                    {s.text_answer && !heroUrl && (
                      <p
                        className="mt-1 line-clamp-3 text-sm text-white"
                        style={{ textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}
                      >
                        {s.text_answer}
                      </p>
                    )}
                  </div>
                  <LikesBadge
                    status={s.status}
                    awarded={s.awarded_points}
                  />
                </div>
              </div>

              {showComment && (
                <ReviewComment
                  status={s.status}
                  reviewer={s.reviewed_by}
                  note={s.review_note}
                />
              )}
            </motion.article>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function Media({
  url,
  text,
}: {
  url: string | null;
  text: string | null;
}) {
  if (url && isVideoUrl(url)) {
    return (
      <video
        src={url}
        autoPlay
        loop
        muted
        playsInline
        className="aspect-[4/5] w-full bg-black object-cover"
      />
    );
  }
  if (url) {
    return (
      <div className="relative aspect-[4/5] w-full bg-black">
        <Image
          src={url}
          alt=""
          fill
          sizes="(max-width: 480px) 100vw, 480px"
          className="object-cover"
        />
      </div>
    );
  }
  return (
    <div
      className="flex aspect-[4/5] w-full items-center justify-center px-6"
      style={{
        background:
          "linear-gradient(135deg, rgba(254,44,85,0.25) 0%, rgba(37,244,238,0.18) 100%)",
      }}
    >
      <p className="text-center text-lg font-semibold text-white">
        {text}
      </p>
    </div>
  );
}

function RejectedStamp() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-red-700/35">
      <svg
        width="140"
        height="140"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        style={{
          filter: "drop-shadow(0 0 18px rgba(220,38,38,0.9))",
        }}
      >
        <line x1="19" y1="5" x2="5" y2="19" />
        <line x1="5" y1="5" x2="19" y2="19" />
      </svg>
    </div>
  );
}

function ReviewComment({
  status,
  reviewer,
  note,
}: {
  status: "approved" | "rejected" | "pending";
  reviewer: string | null;
  note: string | null;
}) {
  const reviewerName = (reviewer ?? "").trim() || "ouder";

  if (status === "rejected") {
    return (
      <div className="border-t border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
        <p className="flex items-center gap-1.5 font-bold text-red-300">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Afgekeurd door @{reviewerName}
        </p>
        {note && (
          <p className="mt-1 text-fg leading-snug">{note}</p>
        )}
      </div>
    );
  }

  if (status === "approved" && note) {
    return (
      <div className="border-t border-border px-4 py-3 text-sm leading-snug">
        <p>
          <span className="font-bold text-cyan">@{reviewerName}</span>{" "}
          <span className="text-fg">{note}</span>
        </p>
      </div>
    );
  }

  return null;
}

function StatusPill({
  status,
  awarded,
}: {
  status: "pending" | "approved" | "rejected";
  awarded: number | null;
}) {
  if (status === "approved") {
    return (
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rounded-full bg-pink/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white"
      >
        +{awarded ?? 0}
      </motion.span>
    );
  }
  if (status === "pending") {
    return (
      <span className="rounded-full bg-yellow-400/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-yellow-300">
        review
      </span>
    );
  }
  return (
    <span className="rounded-full bg-red-500/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-red-200">
      reject
    </span>
  );
}

function LikesBadge({
  status,
  awarded,
}: {
  status: "pending" | "approved" | "rejected";
  awarded: number | null;
}) {
  if (status !== "approved") {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <HeartIcon dim />
        <span
          className="text-[10px] font-bold uppercase tracking-widest text-white/60"
          style={{ textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}
        >
          —
        </span>
      </div>
    );
  }
  return (
    <motion.div
      key={awarded ?? 0}
      initial={{ scale: 1.4 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 18 }}
      className="flex flex-col items-center gap-0.5"
    >
      <HeartIcon />
      <span
        className="text-base font-bold leading-none text-white"
        style={{ textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}
      >
        {awarded ?? 0}
      </span>
    </motion.div>
  );
}

function HeartIcon({ dim = false }: { dim?: boolean }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill={dim ? "rgba(255,255,255,0.3)" : "#fe2c55"}
      style={
        dim
          ? undefined
          : {
              filter: "drop-shadow(0 0 8px rgba(254,44,85,0.7))",
            }
      }
    >
      <path d="M12 21s-7-4.5-9.5-9.5C.5 7 4 3 8 4.5c1.5.5 3 1.5 4 3 1-1.5 2.5-2.5 4-3 4-1.5 7.5 2.5 5.5 7C19 16.5 12 21 12 21z" />
    </svg>
  );
}
