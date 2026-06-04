"use client";

import dynamic from "next/dynamic";

const Inner = dynamic(() => import("./squad-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-bg-card text-fg-muted">
      Kaart laden...
    </div>
  ),
});

type Loc = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  visited: boolean;
};

export function SquadMap({
  locations,
  center,
}: {
  locations: Loc[];
  center: [number, number];
}) {
  return <Inner locations={locations} center={center} />;
}
