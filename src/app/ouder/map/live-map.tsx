"use client";

import dynamic from "next/dynamic";

const Inner = dynamic(() => import("./live-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-bg-card text-fg-muted">
      Kaart laden...
    </div>
  ),
});

type Team = {
  id: string;
  name: string;
  color: string;
  team_photo_url: string | null;
};

type Location = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius_meters: number;
};

type Position = {
  team_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  updated_at: string;
};

type Visit = {
  team_id: string;
  location_id: string;
  order_position: number;
  arrived_at: string;
};

export function LiveMap(props: {
  center: [number, number];
  teams: Team[];
  locations: Location[];
  initialPositions: Position[];
  initialVisits: Visit[];
}) {
  return <Inner {...props} />;
}
