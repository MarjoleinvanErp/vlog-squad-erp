"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateTeamLocationAction,
  recordArrivalAction,
  type ArrivalResult,
} from "./actions-gps";
import { haversineDistance } from "@/lib/geo";

type Loc = {
  id: string;
  lat: number;
  lng: number;
  radius_meters: number;
};

const UPLOAD_THROTTLE_MS = 25_000;
const MAX_ARRIVAL_ACCURACY_M = 50;

export function GPSTracker({
  enabled,
  locations,
  initialVisited,
}: {
  enabled: boolean;
  locations: Loc[];
  initialVisited: string[];
}) {
  const router = useRouter();
  const lastSent = useRef(0);
  const visited = useRef(new Set(initialVisited));
  const inFlight = useRef(new Set<string>());
  const [toastState, setToastState] = useState<ArrivalResult | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (!("geolocation" in navigator)) return;

    const handle = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = pos.coords;

      const now = Date.now();
      if (now - lastSent.current > UPLOAD_THROTTLE_MS) {
        lastSent.current = now;
        updateTeamLocationAction(latitude, longitude, accuracy ?? null).catch(
          () => {}
        );
      }

      // Skip arrival-detection als GPS-nauwkeurigheid te laag is
      // (typisch op desktop/IP-geolocatie of slechte mobiele GPS).
      // Voorkomt false positives binnen Erp waar locaties dicht bij elkaar liggen.
      if (accuracy != null && accuracy > MAX_ARRIVAL_ACCURACY_M) {
        return;
      }

      for (const loc of locations) {
        if (visited.current.has(loc.id)) continue;
        if (inFlight.current.has(loc.id)) continue;
        const dist = haversineDistance(latitude, longitude, loc.lat, loc.lng);
        if (dist <= loc.radius_meters) {
          inFlight.current.add(loc.id);
          recordArrivalAction(loc.id)
            .then((res) => {
              if (res.ok) {
                visited.current.add(loc.id);
                setToastState(res);
                router.refresh();
                setTimeout(() => setToastState(null), 4000);
              }
            })
            .finally(() => {
              inFlight.current.delete(loc.id);
            });
        }
      }
    };

    navigator.geolocation.getCurrentPosition(
      handle,
      () => {},
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 5_000 }
    );

    const watchId = navigator.geolocation.watchPosition(handle, () => {}, {
      enableHighAccuracy: true,
      maximumAge: 5_000,
      timeout: 15_000,
    });

    return () => navigator.geolocation.clearWatch(watchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, locations.length, router]);

  if (!toastState) return null;

  const ordinal =
    toastState.order === 1
      ? "1e team!"
      : toastState.order === 2
        ? "2e team"
        : toastState.order === 3
          ? "3e team"
          : `${toastState.order}e team`;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 mx-auto flex max-w-md justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-pink/40 bg-bg-card/95 px-4 py-3 backdrop-blur glow-pink">
        <span className="text-xs font-semibold uppercase tracking-widest text-cyan">
          {ordinal}
        </span>
        <span className="text-sm font-bold">
          {toastState.locationName}
        </span>
        <span className="text-lg font-bold text-pink">
          +{toastState.bonus}
        </span>
      </div>
    </div>
  );
}
