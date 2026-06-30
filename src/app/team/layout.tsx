import type { ReactNode } from "react";
import { getTeamSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import { GPSTracker } from "./gps-tracker";
import { EventOverlay, type EventStatus } from "./event-overlay";
import { TeamLiveRefresh } from "./team-live-refresh";
import { ReviewBell } from "./review-bell";
import { MessagesBell } from "./messages-bell";

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
  let eventStatus: EventStatus | null = null;
  let eventIdForBell: string | null = null;

  if (teamId) {
    const sb = supabaseService();
    const { data: teamData } = await sb
      .from("teams")
      .select("event_id")
      .eq("id", teamId)
      .maybeSingle();
    if (teamData) {
      const eventId = (teamData as { event_id: string }).event_id;
      eventIdForBell = eventId;
      const [
        { data: locsData },
        { data: visitsData },
        { data: eventData },
      ] = await Promise.all([
        sb
          .from("locations")
          .select("id, lat, lng, radius_meters")
          .eq("event_id", eventId),
        sb
          .from("location_visits")
          .select("location_id")
          .eq("team_id", teamId),
        sb
          .from("events")
          .select("id, state, rally_message, rally_lat, rally_lng")
          .eq("id", eventId)
          .maybeSingle(),
      ]);
      locations = (locsData ?? []) as Loc[];
      visited = ((visitsData ?? []) as Array<{ location_id: string }>).map(
        (v) => v.location_id
      );
      if (eventData) {
        const e = eventData as {
          id: string;
          state?: string;
          rally_message: string | null;
          rally_lat: number | null;
          rally_lng: number | null;
        };
        eventStatus = {
          id: e.id,
          state:
            e.state === "paused"
              ? "paused"
              : e.state === "finished"
                ? "finished"
                : "running",
          rally_message: e.rally_message,
          rally_lat: e.rally_lat,
          rally_lng: e.rally_lng,
        };
      }
    }
  }

  return (
    <>
      <GPSTracker
        enabled={
          !!teamId &&
          eventStatus?.state !== "paused" &&
          eventStatus?.state !== "finished"
        }
        locations={locations}
        initialVisited={visited}
      />
      {children}
      {teamId && <TeamLiveRefresh teamId={teamId} />}
      {teamId && <ReviewBell teamId={teamId} />}
      {teamId && eventIdForBell && (
        <MessagesBell teamId={teamId} eventId={eventIdForBell} />
      )}
      {teamId && <EventOverlay initial={eventStatus} />}
    </>
  );
}
