"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

const POLL_INTERVAL_MS = 10_000;

export function TeamLiveRefresh({ teamId }: { teamId: string }) {
  const router = useRouter();

  useEffect(() => {
    const sb = supabaseBrowser();
    const channel = sb
      .channel(`team-live-${teamId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions" },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "location_visits" },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "events" },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [teamId, router]);

  // Visibility-change refresh: bij elke keer dat de app van background
  // naar foreground gaat (telefoon ontgrendelen / terug naar PWA), refresh.
  // Vangt iOS PWA's op die hun WebSocket-verbinding kwijt zijn geraakt.
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [router]);

  // Periodieke polling-fallback voor als de app continu in foreground staat
  // en de Realtime-subscription stilletjes is gestopt (iOS PWA quirk).
  // 10 sec lag is acceptabel voor pause/finish broadcasts.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
