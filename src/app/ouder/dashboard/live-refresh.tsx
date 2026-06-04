"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const sb = supabaseBrowser();
    const channel = sb
      .channel("ouder-live")
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
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [router]);

  return null;
}
