"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

const SEEN_KEY = (teamId: string) => `speur:reviews-seen-at:${teamId}`;
const EPOCH = "1970-01-01T00:00:00.000Z";

export function ReviewBell({ teamId }: { teamId: string }) {
  const pathname = usePathname();
  const [seenAt, setSeenAt] = useState<string>(EPOCH);
  const [count, setCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  // Lees localStorage na hydration zodat SSR en client matchen.
  useEffect(() => {
    setSeenAt(localStorage.getItem(SEEN_KEY(teamId)) ?? EPOCH);
    setHydrated(true);
  }, [teamId]);

  // Op feed-bezoek: markeer alles tot nu als gezien.
  useEffect(() => {
    if (!hydrated) return;
    if (pathname !== "/team/feed") return;
    const now = new Date().toISOString();
    localStorage.setItem(SEEN_KEY(teamId), now);
    setSeenAt(now);
  }, [pathname, teamId, hydrated]);

  // Tel reviews sinds seenAt — fetch bij wijziging + realtime updates.
  useEffect(() => {
    if (!hydrated) return;
    const sb = supabaseBrowser();
    let cancelled = false;

    async function loadCount() {
      const { count: n } = await sb
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId)
        .not("reviewed_at", "is", null)
        .gt("reviewed_at", seenAt);
      if (!cancelled) setCount(n ?? 0);
    }
    loadCount();

    const channel = sb
      .channel(`reviewbell-${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "submissions",
          filter: `team_id=eq.${teamId}`,
        },
        () => loadCount()
      )
      .subscribe();
    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, [teamId, seenAt, hydrated]);

  function handleClick() {
    const now = new Date().toISOString();
    localStorage.setItem(SEEN_KEY(teamId), now);
    setSeenAt(now);
  }

  if (!hydrated || count === 0 || pathname === "/team/feed") return null;

  return (
    <Link
      href="/team/feed"
      onClick={handleClick}
      aria-label={`${count} nieuwe ${count === 1 ? "review" : "reviews"}`}
      className="fixed right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-pink/60 bg-bg-card/90 text-pink shadow-[0_0_14px_rgba(254,44,85,0.45)] backdrop-blur active:scale-95"
      style={{ top: "calc(3.5rem + env(safe-area-inset-top))" }}
    >
      <BellIcon />
      <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-pink px-1 text-[10px] font-extrabold leading-none text-white">
        {count > 99 ? "99+" : count}
      </span>
    </Link>
  );
}

function BellIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  );
}
