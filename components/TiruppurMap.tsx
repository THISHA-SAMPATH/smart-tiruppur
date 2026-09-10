"use client";

import { MapContainer, TileLayer } from "react-leaflet";

const TIRUPPUR_CENTER: [number, number] = [11.1085, 77.3411];
const DEFAULT_ZOOM = 13;

export default function TiruppurMap() {
  return (
    <div
      style={{
        height: "560px",
        width: "100%",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        border: "1px solid var(--hairline)",
        boxShadow: "0 8px 24px rgba(31, 42, 36, 0.08)",
        position: "relative",
        zIndex: 1,
      }}
    >
      <MapContainer
        center={TIRUPPUR_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={6}
        maxZoom={19}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </MapContainer>
    </div>
  );
}
