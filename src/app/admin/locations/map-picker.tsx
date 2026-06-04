"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const MapPickerInner = dynamic(() => import("./map-picker-inner"), {
  ssr: false,
  loading: () => (
    <div
      className="flex w-full items-center justify-center rounded-2xl border border-border-strong bg-bg-elev text-fg-muted"
      style={{ height: "18rem" }}
    >
      Kaart laden...
    </div>
  ),
});

const ERP_CENTER: [number, number] = [51.5957, 5.6017];

export function MapPicker({
  initialLat,
  initialLng,
}: {
  initialLat?: number | null;
  initialLng?: number | null;
}) {
  const [value, setValue] = useState<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null
      ? { lat: initialLat, lng: initialLng }
      : null
  );

  const center: [number, number] = value
    ? [value.lat, value.lng]
    : ERP_CENTER;

  return (
    <div className="flex flex-col gap-3">
      <MapPickerInner center={center} value={value} onChange={setValue} />
      <div className="flex items-center justify-between rounded-xl border border-border bg-bg-elev px-4 py-2 text-sm">
        {value ? (
          <span className="font-mono text-fg-muted">
            {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
          </span>
        ) : (
          <span className="text-fg-dim">Klik op de kaart om een punt te kiezen</span>
        )}
        {value && (
          <button
            type="button"
            onClick={() => setValue(null)}
            className="text-xs text-fg-muted hover:text-pink"
          >
            wissen
          </button>
        )}
      </div>
      <input type="hidden" name="lat" value={value?.lat ?? ""} />
      <input type="hidden" name="lng" value={value?.lng ?? ""} />
    </div>
  );
}
