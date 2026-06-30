"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

const SEEN_KEY = (teamId: string) => `speur:messages-seen-at:${teamId}`;
const EPOCH = "1970-01-01T00:00:00.000Z";

export function MessagesBell({
  teamId,
  eventId,
}: {
  teamId: string;
  eventId: string;
}) {
  const pathname = usePathname();
  const [seenAt, setSeenAt] = useState<string>(EPOCH);
  const [count, setCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSeenAt(localStorage.getItem(SEEN_KEY(teamId)) ?? EPOCH);
    setHydrated(true);
  }, [teamId]);

  useEffect(() => {
    if (!hydrated) return;
    if (pathname !== "/team/messages") return;
    const now = new Date().toISOString();
    localStorage.setItem(SEEN_KEY(teamId), now);
    setSeenAt(now);
  }, [pathname, teamId, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const sb = supabaseBrowser();
    let cancelled = false;

    async function loadCount() {
      const { count: n } = await sb
        .from("broadcast_messages")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .gt("created_at", seenAt);
      if (!cancelled) setCount(n ?? 0);
    }
    loadCount();

    const channel = sb
      .channel(`messagesbell-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "broadcast_messages",
          filter: `event_id=eq.${eventId}`,
        },
        () => loadCount()
      )
      .subscribe();
    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, [eventId, seenAt, hydrated]);

  function handleClick() {
    const now = new Date().toISOString();
    localStorage.setItem(SEEN_KEY(teamId), now);
    setSeenAt(now);
  }

  if (!hydrated || count === 0 || pathname === "/team/messages") return null;

  return (
    <Link
      href="/team/messages"
      onClick={handleClick}
      aria-label={`${count} ${count === 1 ? "nieuw bericht" : "nieuwe berichten"}`}
      className="fixed left-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-cyan/60 bg-bg-card/90 text-cyan shadow-[0_0_14px_rgba(37,244,238,0.45)] backdrop-blur active:scale-95"
      style={{ top: "calc(0.5rem + env(safe-area-inset-top))" }}
    >
      <MessageIcon />
      <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-cyan px-1 text-[10px] font-extrabold leading-none text-bg">
        {count > 99 ? "99+" : count}
      </span>
    </Link>
  );
}

function MessageIcon() {
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
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
