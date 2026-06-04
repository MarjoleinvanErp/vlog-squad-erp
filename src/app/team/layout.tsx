import type { ReactNode } from "react";
import { getTeamSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import { GPSTracker } from "./gps-tracker";

type Loc = {
  id: string;
  lat: number;
  lng: number;
  radius_meters: number;
};

export default async function TeamLayout({
  children,
}: {
  children: ReactNode;
}) {
  const teamId = await getTeamSession();

  let locations: Loc[] = [];
  let visited: string[] = [];

  if (teamId) {
    const sb = supabaseService();
    const { data: teamData } = await sb
      .from("teams")
      .select("event_id")
      .eq("id", teamId)
      .maybeSingle();
    if (teamData) {
      const eventId = (teamData as { event_id: string }).event_id;
      const [{ data: locsData }, { data: visitsData }] = await Promise.all([
        sb
          .from("locations")
          .select("id, lat, lng, radius_meters")
          .eq("event_id", eventId),
        sb
          .from("location_visits")
          .select("location_id")
          .eq("team_id", teamId),
      ]);
      locations = (locsData ?? []) as Loc[];
      visited = ((visitsData ?? []) as Array<{ location_id: string }>).map(
        (v) => v.location_id
      );
    }
  }

  return (
    <>
      <GPSTracker
        enabled={!!teamId}
        locations={locations}
        initialVisited={visited}
      />
      {children}
    </>
  );
}
