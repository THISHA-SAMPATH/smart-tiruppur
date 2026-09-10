"use client";

import { useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import NoyyalRiverLayer from "@/components/NoyyalRiverLayer";

const TIRUPPUR_CENTER: [number, number] = [11.1085, 77.3411];
const DEFAULT_ZOOM = 13;

export default function TiruppurMap() {
  const [showRiverLayer, setShowRiverLayer] = useState(true);

  return (
    <div
      style={{
        height: "580px",
        width: "100%",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        border: "1px solid var(--hairline)",
        boxShadow: "0 8px 24px rgba(31, 42, 36, 0.08)",
        position: "relative",
        zIndex: 1,
      }}
    >
      {/* Legend & Layer Control Panel */}
      <div
        className="card"
        style={{
          position: "absolute",
          top: "14px",
          right: "14px",
          zIndex: 1000,
          background: "rgba(246, 243, 234, 0.94)",
          backdropFilter: "blur(6px)",
          padding: "12px 16px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--hairline)",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          minWidth: "180px",
        }}
      >
        <p
          className="eyebrow"
          style={{ fontSize: "10px", margin: "0 0 8px", color: "var(--ink-soft)" }}
        >
          MAP LAYERS
        </p>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={showRiverLayer}
            onChange={(e) => setShowRiverLayer(e.target.checked)}
            style={{ accentColor: "#2563eb", cursor: "pointer" }}
          />
          <span
            style={{
              width: "16px",
              height: "4px",
              background: "#2563eb",
              borderRadius: "2px",
              display: "inline-block",
            }}
          />
          Noyyal River
        </label>
      </div>

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

        {showRiverLayer && <NoyyalRiverLayer />}
      </MapContainer>
    </div>
  );
}
