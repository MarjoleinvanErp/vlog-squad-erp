"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Circle, Popup } from "react-leaflet";
import { DivIcon } from "leaflet";
import { useEffect, useState, useMemo } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

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

function teamIcon(color: string, initial: string) {
  return new DivIcon({
    className: "",
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      width:40px;height:40px;border-radius:9999px;
      background:${color};color:#fff;
      font-weight:800;font-size:16px;
      border:3px solid #0a0a0a;
      box-shadow:0 0 16px ${color}aa;
      font-family:'Space Grotesk', system-ui, sans-serif;
    ">${initial}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

const locationPin = new DivIcon({
  className: "",
  html: `<div style="
    width:20px;height:20px;border-radius:9999px;
    background:#fe2c55;border:3px solid #0a0a0a;
    box-shadow:0 0 12px rgba(254,44,85,0.8);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  const hr = Math.round(min / 60);
  return `${hr} u`;
}

export default function LiveMapInner({
  center,
  teams,
  locations,
  initialPositions,
}: {
  center: [number, number];
  teams: Team[];
  locations: Location[];
  initialPositions: Position[];
}) {
  const teamById = useMemo(
    () => new Map(teams.map((t) => [t.id, t])),
    [teams]
  );

  const [positions, setPositions] = useState<Record<string, Position>>(() => {
    const m: Record<string, Position> = {};
    for (const p of initialPositions) m[p.team_id] = p;
    return m;
  });

  useEffect(() => {
    const sb = supabaseBrowser();
    const channel = sb
      .channel("ouder-live-map")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_locations" },
        (payload) => {
          const row = payload.new as Position;
          if (!row?.team_id) return;
          if (!teamById.has(row.team_id)) return;
          setPositions((prev) => ({ ...prev, [row.team_id]: row }));
        }
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [teamById]);

  return (
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
      {locations.map((loc) => (
        <Marker
          key={loc.id}
          position={[loc.lat, loc.lng]}
          icon={locationPin}
        >
          <Popup>
            <strong>{loc.name}</strong>
            <br />
            radius {loc.radius_meters}m
          </Popup>
        </Marker>
      ))}
      {Object.values(positions).map((p) => {
        const t = teamById.get(p.team_id);
        if (!t) return null;
        const initial = t.name.trim().slice(0, 2).toUpperCase();
        return (
          <Marker
            key={t.id}
            position={[p.lat, p.lng]}
            icon={teamIcon(t.color, initial)}
          >
            <Popup>
              <strong style={{ color: t.color }}>@{t.name}</strong>
              <br />
              update: {relativeTime(p.updated_at)} geleden
              {p.accuracy != null && (
                <>
                  <br />
                  acc: ±{Math.round(p.accuracy)}m
                </>
              )}
            </Popup>
          </Marker>
        );
      })}
      {Object.values(positions).map((p) =>
        p.accuracy != null && p.accuracy > 50 ? (
          <Circle
            key={`acc-${p.team_id}`}
            center={[p.lat, p.lng]}
            radius={p.accuracy}
            pathOptions={{
              color: teamById.get(p.team_id)?.color ?? "#fe2c55",
              fillOpacity: 0.05,
              weight: 1,
            }}
          />
        ) : null
      )}
    </MapContainer>
  );
}
