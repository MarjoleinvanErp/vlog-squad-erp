"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

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

  return null;
}
