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

type Visit = {
  team_id: string;
  location_id: string;
  order_position: number;
  arrived_at: string;
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

// Bezochte locatie: cyaan pin met het aantal teams dat er is geweest.
function visitedPin(count: number) {
  return new DivIcon({
    className: "",
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      width:24px;height:24px;border-radius:9999px;
      background:#25f4ee;color:#0a0a0a;
      font-weight:800;font-size:12px;
      border:3px solid #0a0a0a;
      box-shadow:0 0 12px rgba(37,244,238,0.8);
      font-family:'Space Grotesk', system-ui, sans-serif;
    ">${count}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

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
  initialVisits,
}: {
  center: [number, number];
  teams: Team[];
  locations: Location[];
  initialPositions: Position[];
  initialVisits: Visit[];
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

  const [visits, setVisits] = useState<Visit[]>(initialVisits);

  const visitsByLocation = useMemo(() => {
    const m = new Map<string, Visit[]>();
    for (const v of visits) {
      const list = m.get(v.location_id) ?? [];
      list.push(v);
      m.set(v.location_id, list);
    }
    for (const list of m.values()) {
      list.sort((a, b) => a.order_position - b.order_position);
    }
    return m;
  }, [visits]);

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
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "location_visits" },
        (payload) => {
          const row = payload.new as Visit | null;
          if (!row?.location_id || !teamById.has(row.team_id)) return;
          setVisits((prev) =>
            prev.some(
              (v) =>
                v.team_id === row.team_id && v.location_id === row.location_id
            )
              ? prev
              : [...prev, row]
          );
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
      {locations.map((loc) => {
        const locVisits = visitsByLocation.get(loc.id) ?? [];
        return (
          <Marker
            key={loc.id}
            position={[loc.lat, loc.lng]}
            icon={
              locVisits.length > 0 ? visitedPin(locVisits.length) : locationPin
            }
          >
            <Popup>
              <strong>{loc.name}</strong>
              <br />
              {locVisits.length === 0 ? (
                <>nog geen team geweest</>
              ) : (
                locVisits.map((v) => {
                  const t = teamById.get(v.team_id);
                  if (!t) return null;
                  return (
                    <span key={v.team_id}>
                      {v.order_position}.{" "}
                      <strong style={{ color: t.color }}>@{t.name}</strong>{" "}
                      (
                      {new Date(v.arrived_at).toLocaleTimeString("nl-NL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      )
                      <br />
                    </span>
                  );
                })
              )}
            </Popup>
          </Marker>
        );
      })}
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
