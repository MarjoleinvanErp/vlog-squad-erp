"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { DivIcon } from "leaflet";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Loc = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  visited: boolean;
};

const pinIcon = (visited: boolean) =>
  new DivIcon({
    className: "",
    html: `<div style="
      width:32px;height:32px;border-radius:9999px;
      background:${visited ? "#25f4ee" : "#fe2c55"};
      border:3px solid #0a0a0a;
      box-shadow:0 0 16px rgba(${visited ? "37,244,238" : "254,44,85"},0.8);
      ${visited ? "" : "animation:pulse-ring 1.6s ease-out infinite;"}
    "></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const userIcon = new DivIcon({
  className: "",
  html: `<div style="
    width:18px;height:18px;border-radius:9999px;
    background:#25f4ee;border:3px solid #fff;
    box-shadow:0 0 12px rgba(37,244,238,0.9);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function RecenterOnUser({ userPos }: { userPos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (userPos) {
      map.flyTo(userPos, Math.max(map.getZoom(), 15), { duration: 0.6 });
    }
  }, [userPos, map]);
  return null;
}

export default function SquadMapInner({
  locations,
  center,
}: {
  locations: Loc[];
  center: [number, number];
}) {
  const router = useRouter();
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setAccuracy(pos.coords.accuracy);
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 5_000 }
    );

    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setAccuracy(pos.coords.accuracy);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 }
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, []);

  return (
    <>
      {accuracy != null && (
        <div
          className="pointer-events-none absolute right-2 top-2 z-[1000] rounded-full bg-bg-card/85 px-2 py-1 font-mono text-[10px] text-fg-muted backdrop-blur"
        >
          GPS ±{Math.round(accuracy)}m
        </div>
      )}
    <MapContainer
      center={center}
      zoom={15}
      scrollWheelZoom
      className="h-full w-full"
      style={{ height: "100%", width: "100%", background: "#161616" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {userPos && <Marker position={userPos} icon={userIcon} />}
      <RecenterOnUser userPos={userPos} />
      {locations.map((loc) => (
        <Marker
          key={loc.id}
          position={[loc.lat, loc.lng]}
          icon={pinIcon(loc.visited)}
          eventHandlers={{
            click: () => router.push(`/team/location/${loc.id}`),
          }}
        />
      ))}
    </MapContainer>
    </>
  );
}
