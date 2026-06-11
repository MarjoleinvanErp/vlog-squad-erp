import Link from "next/link";
import { redirect } from "next/navigation";
import { getTeamSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import { SquadMap } from "./squad-map";
import { TeamBottomNav } from "../bottom-nav";
import { PushBanner } from "../push-banner";

export default async function TeamMapPage() {
  const teamId = await getTeamSession();
  if (!teamId) redirect("/team");

  const sb = supabaseService();
  const { data: teamData } = await sb
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .maybeSingle();

  if (!teamData) redirect("/team");

  const team = teamData as {
    id: string;
    name: string;
    color: string;
    team_photo_url: string | null;
    event_id: string;
  };

  if (!team.team_photo_url) {
    redirect("/team/onboard");
  }

  const [{ data: eventData }, { data: locsData }, { data: visitsData }] =
    await Promise.all([
      sb.from("events").select("*").eq("id", team.event_id).maybeSingle(),
      sb.from("locations").select("*").eq("event_id", team.event_id),
      sb.from("location_visits").select("location_id").eq("team_id", teamId),
    ]);

  const event = eventData as { start_lat: number | null; start_lng: number | null } | null;
  const locations = (locsData ?? []) as Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
  }>;
  const visits = (visitsData ?? []) as Array<{ location_id: string }>;

  const visitedIds = new Set(visits.map((v) => v.location_id));

  const center: [number, number] =
    event?.start_lat && event?.start_lng
      ? [event.start_lat, event.start_lng]
      : locations.length > 0
        ? [locations[0].lat, locations[0].lng]
        : [51.5957, 5.6017];

  const mapLocations = locations.map((l) => ({
    ...l,
    visited: visitedIds.has(l.id),
  }));

  return (
    <main className="flex h-dvh flex-col bg-bg text-fg">
      <header className="z-10 flex items-center justify-between gap-3 border-b border-border bg-bg/90 px-4 pb-3 pt-[calc(0.75rem+var(--st))] backdrop-blur">
        <Link
          href={`/team/squad`}
          className="flex min-w-0 items-center gap-3"
          aria-label="Squad profiel"
        >
          {team.team_photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={team.team_photo_url}
              alt=""
              className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
              style={{ outline: `2px solid ${team.color}`, outlineOffset: 1 }}
            />
          )}
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-fg-muted">
              squad
            </p>
            <p
              className="truncate text-base font-bold leading-tight"
              style={{ color: team.color }}
            >
              @{team.name}
            </p>
          </div>
        </Link>
      </header>

      <PushBanner />

      <div className="relative min-h-0 flex-1">
        {locations.length === 0 ? (
          <div className="flex h-full items-center justify-center px-8 text-center text-fg-muted">
            Nog geen locaties op de kaart. De organisatie voegt ze toe.
          </div>
        ) : (
          <SquadMap locations={mapLocations} center={center} />
        )}
      </div>

      <TeamBottomNav active="map" />
    </main>
  );
}
