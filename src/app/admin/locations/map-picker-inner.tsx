"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { DivIcon, type LatLngExpression } from "leaflet";

type Props = {
  center: LatLngExpression;
  value: { lat: number; lng: number } | null;
  onChange: (latlng: { lat: number; lng: number }) => void;
};

const pinkPin = new DivIcon({
  className: "",
  html: `<div style="width:24px;height:24px;border-radius:9999px;background:#fe2c55;border:3px solid #fff;box-shadow:0 0 16px rgba(254,44,85,0.8);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function ClickHandler({
  onChange,
}: {
  onChange: (latlng: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function MapPickerInner({ center, value, onChange }: Props) {
  return (
    <MapContainer
      center={center}
      zoom={15}
      scrollWheelZoom
      className="overflow-hidden rounded-2xl border border-border-strong"
      style={{ height: "18rem", width: "100%", background: "#161616" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onChange={onChange} />
      {value && <Marker position={[value.lat, value.lng]} icon={pinkPin} />}
    </MapContainer>
  );
}
