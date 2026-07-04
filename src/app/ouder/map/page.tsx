import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseService } from "@/lib/supabase/server";
import { LiveMap } from "./live-map";

export default async function OuderMapPage() {
  const eventId = await getAdminSession();
  if (!eventId) redirect("/ouder");

  const sb = supabaseService();

  const [{ data: eventData }, { data: teamsData }, { data: locsData }] =
    await Promise.all([
      sb.from("events").select("*").eq("id", eventId).maybeSingle(),
      sb
        .from("teams")
        .select("id, name, color, team_photo_url")
        .eq("event_id", eventId),
      sb
        .from("locations")
        .select("id, name, lat, lng, radius_meters")
        .eq("event_id", eventId),
    ]);

  if (!eventData) redirect("/ouder");
  const event = eventData as {
    name: string;
    start_lat: number | null;
    start_lng: number | null;
  };

  const teams = (teamsData ?? []) as Array<{
    id: string;
    name: string;
    color: string;
    team_photo_url: string | null;
  }>;

  const locations = (locsData ?? []) as Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    radius_meters: number;
  }>;

  const teamIds = teams.map((t) => t.id);
  const [{ data: positionsData }, { data: visitsData }] =
    teamIds.length > 0
      ? await Promise.all([
          sb
            .from("team_locations")
            .select("team_id, lat, lng, accuracy, updated_at")
            .in("team_id", teamIds),
          sb
            .from("location_visits")
            .select("team_id, location_id, order_position, arrived_at")
            .in("team_id", teamIds),
        ])
      : [{ data: [] }, { data: [] }];

  const positions = (positionsData ?? []) as Array<{
    team_id: string;
    lat: number;
    lng: number;
    accuracy: number | null;
    updated_at: string;
  }>;

  const visits = (visitsData ?? []) as Array<{
    team_id: string;
    location_id: string;
    order_position: number;
    arrived_at: string;
  }>;

  const center: [number, number] =
    event.start_lat != null && event.start_lng != null
      ? [event.start_lat, event.start_lng]
      : locations.length > 0
        ? [locations[0].lat, locations[0].lng]
        : [51.5957, 5.6017];

  return (
    <main className="flex h-dvh flex-col bg-bg text-fg">
      <header className="z-10 flex items-center justify-between gap-3 border-b border-border bg-bg/90 px-4 pb-3 pt-[calc(0.75rem+var(--st))] backdrop-blur">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-cyan">
            live map
          </p>
          <p className="truncate text-base font-bold">{event.name}</p>
        </div>
        <Link
          href="/ouder/dashboard"
          className="rounded-full border border-border-strong px-3 py-1.5 text-xs hover:border-cyan hover:text-cyan"
        >
          dashboard
        </Link>
      </header>

      <div className="relative min-h-0 flex-1">
        <LiveMap
          center={center}
          teams={teams}
          locations={locations}
          initialPositions={positions}
          initialVisits={visits}
        />
      </div>
    </main>
  );
}
