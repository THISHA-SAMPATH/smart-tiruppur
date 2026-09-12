"use client";

import { useEffect, useState, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  Circle,
  Polyline,
  Tooltip,
} from "react-leaflet";
import L from "leaflet";
import type { FeatureCollection } from "geojson";

// Fix Leaflet Default Icon issue in Next.js
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = defaultIcon;

// Sleek Custom Station Pin Icon Generator
const stationIcon = (name: string, ec: number) => {
  const isHigh = ec > 3500;
  const isMed = ec > 2100;
  const color = isHigh ? "#ef4444" : isMed ? "#f59e0b" : "#10b981";
  const bg = isHigh ? "#450a0a" : isMed ? "#451a03" : "#022c22";
  const border = isHigh ? "#dc2626" : isMed ? "#d97706" : "#059669";
  const pulseClass = isHigh ? "scada-badge-alarm" : "scada-badge-ok";

  return L.divIcon({
    className: "custom-station-pin",
    html: `
      <div class="${pulseClass}" style="
        background: ${bg};
        border: 2px solid ${border};
        color: #ffffff;
        padding: 5px 10px;
        border-radius: 8px;
        font-family: 'IBM Plex Mono', monospace;
        font-weight: 700;
        font-size: 11px;
        box-shadow: 0 8px 20px rgba(0,0,0,0.4);
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 6px;
        backdrop-filter: blur(8px);
      ">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; display: inline-block; box-shadow: 0 0 8px ${color};"></span>
        <span>${name}: <strong style="color: ${color}; font-size: 12px;">${Math.round(ec)} µS</strong></span>
      </div>
    `,
    iconSize: [165, 34],
    iconAnchor: [82, 17],
  });
};

// Sleek Industrial Outfall Solenoid Pin Generator
const outfallIcon = (name: string, isBypassing: boolean) => {
  const color = isBypassing ? "#ef4444" : "#10b981";
  const bg = isBypassing ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)";
  const statusLabel = isBypassing ? "🔴 BYPASS ACTIVE" : "🟢 ZLD COMPLIANT";
  const pulseBorder = isBypassing ? "2px solid #ef4444" : "1.5px solid #10b981";

  return L.divIcon({
    className: "custom-outfall-pin",
    html: `
      <div style="
        background: rgba(15, 23, 42, 0.92);
        border: ${pulseBorder};
        color: #ffffff;
        padding: 6px 10px;
        border-radius: 10px;
        font-size: 11px;
        font-family: system-ui, sans-serif;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1);
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        backdrop-filter: blur(10px);
        transition: all 0.2s ease;
      ">
        <span style="font-weight: 700; font-size: 10px; color: #94a3b8; letter-spacing: 0.04em;">${name}</span>
        <span style="
          font-weight: 800;
          color: ${color};
          font-size: 10px;
          background: ${bg};
          padding: 2px 6px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          ${statusLabel}
        </span>
      </div>
    `,
    iconSize: [160, 46],
    iconAnchor: [80, 23],
  });
};

// River polyline keypoints through Tiruppur Reach (West to East)
const RIVER_WAYPOINTS: [number, number][] = [
  [11.105, 77.25], // Mangalam Upstream Entry
  [11.10651, 77.26001], // Station 1: Mangalam Bridge
  [11.102, 77.28], // Mangalam Dyeing Reach
  [11.085, 77.331], // Outfall 1: Arulpuram Dyers CETP Outfall
  [11.098, 77.35], // Andipalayam Reach
  [11.115, 77.375], // Town Reach
  [11.118, 77.385], // Outfall 2: Kasipalayam Industrial Outfall
  [11.11975, 77.39716], // Station 2: Kasipalayam Bridge
  [11.115, 77.45], // Uthukuli Sub-basin
  [11.11084, 77.53981], // Station 3: Orathapalayam Reservoir Exit
];

interface GisRiverPhysicsMapProps {
  st1Ec: number;
  st2Ec: number;
  st3Ec: number;
  unit007Active: boolean;
  unit001Active: boolean;
  unit012Active: boolean;
  onToggleUnit007: () => void;
  onToggleUnit001: () => void;
  onToggleUnit012: () => void;
  riverFlowM3s: number;
  roleMode: string;
}

// Inner Component to animate Plume Particles over time
function RiverPlumeParticleAnimator({
  unit007Active,
  unit001Active,
  unit012Active,
  riverFlowM3s,
  st2Ec,
}: {
  unit007Active: boolean;
  unit001Active: boolean;
  unit012Active: boolean;
  riverFlowM3s: number;
  st2Ec: number;
}) {
  const [particles, setParticles] = useState<
    { id: number; position: [number, number]; progress: number; color: string }[]
  >([]);

  useEffect(() => {
    const hasBypass = unit007Active || unit001Active || unit012Active;
    const interval = setInterval(() => {
      setParticles((prev) => {
        // Move existing particles along river waypoints
        const updated = prev
          .map((p) => {
            const nextProgress = p.progress + 0.018 * (riverFlowM3s / 12);
            if (nextProgress >= 1) return null;

            // Interpolate position along RIVER_WAYPOINTS
            const totalSegments = RIVER_WAYPOINTS.length - 1;
            const targetSegmentFloat = nextProgress * totalSegments;
            const segIndex = Math.min(
              Math.floor(targetSegmentFloat),
              totalSegments - 1
            );
            const segFraction = targetSegmentFloat - segIndex;

            const ptA = RIVER_WAYPOINTS[segIndex];
            const ptB = RIVER_WAYPOINTS[segIndex + 1];

            const lat = ptA[0] + (ptB[0] - ptA[0]) * segFraction;
            const lng = ptA[1] + (ptB[1] - ptA[1]) * segFraction;

            return {
              ...p,
              progress: nextProgress,
              position: [lat, lng] as [number, number],
            };
          })
          .filter(Boolean) as any[];

        // Spawn new particles if any bypass is active
        if (hasBypass && updated.length < 40) {
          const plumeColor =
            st2Ec > 4500 ? "#ef4444" : st2Ec > 2500 ? "#f59e0b" : "#3b82f6";

          let startSegment = 0;
          if (unit007Active) startSegment = 0.3; // Arulpuram
          else if (unit001Active) startSegment = 0.6; // Kasipalayam
          else startSegment = 0.1; // Mangalam

          updated.push({
            id: Date.now() + Math.random(),
            position: RIVER_WAYPOINTS[Math.floor(startSegment * (RIVER_WAYPOINTS.length - 1))],
            progress: startSegment,
            color: plumeColor,
          });
        }

        return updated;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [unit007Active, unit001Active, unit012Active, riverFlowM3s, st2Ec]);

  return (
    <>
      {particles.map((p) => (
        <Circle
          key={p.id}
          center={p.position}
          radius={140}
          pathOptions={{
            color: p.color,
            fillColor: p.color,
            fillOpacity: 0.75,
            stroke: true,
            weight: 1.5,
          }}
        />
      ))}
    </>
  );
}

export default function GisRiverPhysicsMap({
  st1Ec,
  st2Ec,
  st3Ec,
  unit007Active,
  unit001Active,
  unit012Active,
  onToggleUnit007,
  onToggleUnit001,
  onToggleUnit012,
  riverFlowM3s,
  roleMode,
}: GisRiverPhysicsMapProps) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [mapStyle, setMapStyle] = useState<"dark" | "standard" | "satellite">(
    "dark"
  );

  useEffect(() => {
    fetch("/geo/noyyal-river.geojson")
      .then((res) => res.json())
      .then((data) => setGeoData(data))
      .catch((err) => console.error("Error loading Noyyal River GIS GeoJSON:", err));
  }, []);

  const anyBypass = unit007Active || unit001Active || unit012Active;

  // River Segment Color based on downstream EC
  const riverPathColor = useMemo(() => {
    if (st2Ec > 4200) return "#ef4444"; // Vivid Crimson
    if (st2Ec > 2400) return "#f59e0b"; // Warm Amber
    return "#38bdf8"; // Neon Cyan
  }, [st2Ec]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "540px" }}>
      {/* Top Left Map Layer Toggle */}
      <div
        style={{
          position: "absolute",
          top: 14,
          left: 14,
          zIndex: 1000,
          background: "rgba(15, 23, 42, 0.92)",
          backdropFilter: "blur(12px)",
          padding: "6px 12px",
          borderRadius: "10px",
          border: "1px solid rgba(255,255,255,0.15)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "white",
          fontSize: "12px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}
      >
        <span style={{ fontWeight: 800, color: "#94a3b8", fontSize: "10px", letterSpacing: "0.05em" }}>
          MAP TILE:
        </span>
        <button
          type="button"
          onClick={() => setMapStyle("dark")}
          style={{
            background: mapStyle === "dark" ? "#38bdf8" : "transparent",
            color: mapStyle === "dark" ? "#0f172a" : "#cbd5e1",
            border: "none",
            borderRadius: "6px",
            padding: "3px 10px",
            fontSize: "11px",
            fontWeight: 800,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          Carto Dark SCADA
        </button>
        <button
          type="button"
          onClick={() => setMapStyle("standard")}
          style={{
            background: mapStyle === "standard" ? "#38bdf8" : "transparent",
            color: mapStyle === "standard" ? "#0f172a" : "#cbd5e1",
            border: "none",
            borderRadius: "6px",
            padding: "3px 10px",
            fontSize: "11px",
            fontWeight: 800,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          OSM Streets
        </button>
        <button
          type="button"
          onClick={() => setMapStyle("satellite")}
          style={{
            background: mapStyle === "satellite" ? "#38bdf8" : "transparent",
            color: mapStyle === "satellite" ? "#0f172a" : "#cbd5e1",
            border: "none",
            borderRadius: "6px",
            padding: "3px 10px",
            fontSize: "11px",
            fontWeight: 800,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          Esri Satellite
        </button>
      </div>

      {/* Top Right Floating HUD Overlay Box */}
      <div
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          zIndex: 1000,
          background: "rgba(15, 23, 42, 0.92)",
          backdropFilter: "blur(12px)",
          padding: "10px 14px",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.15)",
          color: "white",
          fontSize: "11px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          minWidth: "220px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "4px" }}>
          <span style={{ color: "#94a3b8", fontWeight: 700 }}>HYDRODYNAMIC HUD</span>
          <span style={{ color: "#38bdf8", fontWeight: 800 }}>LIVE SPATIAL</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div>
            <div style={{ color: "#64748b", fontSize: "10px" }}>Flow Velocity (u)</div>
            <div style={{ fontWeight: 800, color: "#f8fafc" }}>
              {(0.45 * (riverFlowM3s / 3.5)).toFixed(2)} m/s
            </div>
          </div>
          <div>
            <div style={{ color: "#64748b", fontSize: "10px" }}>River Flow Rate (Q)</div>
            <div style={{ fontWeight: 800, color: "#38bdf8" }}>
              {riverFlowM3s.toFixed(1)} m³/s
            </div>
          </div>
          <div>
            <div style={{ color: "#64748b", fontSize: "10px" }}>Dispersion (Dx)</div>
            <div style={{ fontWeight: 800, color: "#f8fafc" }}>2.5 m²/s</div>
          </div>
          <div>
            <div style={{ color: "#64748b", fontSize: "10px" }}>Active Outfalls</div>
            <div style={{ fontWeight: 800, color: anyBypass ? "#ef4444" : "#10b981" }}>
              {(unit007Active ? 1 : 0) + (unit001Active ? 1 : 0) + (unit012Active ? 1 : 0)} / 3 Active
            </div>
          </div>
        </div>
      </div>

      <MapContainer
        center={[11.1085, 77.38]}
        zoom={12}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%", borderRadius: "12px" }}
      >
        {mapStyle === "dark" && (
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
        )}
        {mapStyle === "standard" && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}
        {mapStyle === "satellite" && (
          <TileLayer
            attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}

        {/* Noyyal River Vector Polyline */}
        {geoData ? (
          <GeoJSON
            key={riverPathColor}
            data={geoData}
            style={{
              color: riverPathColor,
              weight: st2Ec > 4000 ? 8 : 5,
              opacity: 0.95,
              lineCap: "round",
            }}
          />
        ) : (
          <Polyline
            positions={RIVER_WAYPOINTS}
            pathOptions={{ color: riverPathColor, weight: 6, opacity: 0.85 }}
          />
        )}

        {/* Dynamic Chemical Plume Particle Overlay */}
        <RiverPlumeParticleAnimator
          unit007Active={unit007Active}
          unit001Active={unit001Active}
          unit012Active={unit012Active}
          riverFlowM3s={riverFlowM3s}
          st2Ec={st2Ec}
        />

        {/* TNPCB Monitoring Station Pins */}
        <Marker
          position={[11.10651, 77.26001]}
          icon={stationIcon("ST-01 Mangalam", st1Ec)}
        >
          <Popup>
            <div style={{ fontFamily: "sans-serif", padding: "6px" }}>
              <h4 style={{ margin: "0 0 4px", color: "#1e3a8a", fontSize: "14px" }}>
                TNPCB Station 01: Mangalam Bridge
              </h4>
              <p style={{ margin: 0, fontSize: "12px", color: "#475569" }}>
                Upstream River Entry Baseline Node
              </p>

              <div style={{ marginTop: "8px", paddingTop: "6px", borderTop: "1px solid #e2e8f0", fontSize: "12px" }}>
                <div>EC: <strong>{Math.round(st1Ec)} µS/cm</strong></div>
                <div>TDS: <strong>{Math.round(st1Ec * 0.65)} mg/L</strong></div>
                <div style={{ color: "#059669", fontWeight: 700, marginTop: "4px" }}>Status: Clean Baseline</div>
              </div>
            </div>
          </Popup>
        </Marker>

        <Marker
          position={[11.11975, 77.39716]}
          icon={stationIcon("ST-02 Kasipalayam", st2Ec)}
        >
          <Popup>
            <div style={{ fontFamily: "sans-serif", padding: "6px" }}>
              <h4 style={{ margin: "0 0 4px", color: "#1e3a8a", fontSize: "14px" }}>
                TNPCB Station 02: Kasipalayam Bridge
              </h4>
              <p style={{ margin: 0, fontSize: "12px", color: "#475569" }}>
                Urban Industrial Exit Node (High Risk Zone)
              </p>

              <div style={{ marginTop: "8px", paddingTop: "6px", borderTop: "1px solid #e2e8f0", fontSize: "12px" }}>
                <div>EC: <strong>{Math.round(st2Ec)} µS/cm</strong></div>
                <div>TDS: <strong>{Math.round(st2Ec * 0.65)} mg/L</strong></div>
                <div style={{ color: st2Ec > 3000 ? "#dc2626" : "#059669", fontWeight: 800, marginTop: "4px" }}>
                  {st2Ec > 3000 ? "⚠️ SEVERE OVERRUN (>2100 µS/cm)" : "✅ COMPLIANT"}
                </div>
              </div>
            </div>
          </Popup>
        </Marker>

        <Marker
          position={[11.11084, 77.53981]}
          icon={stationIcon("ST-03 Orathapalayam", st3Ec)}
        >
          <Popup>
            <div style={{ fontFamily: "sans-serif", padding: "6px" }}>
              <h4 style={{ margin: "0 0 4px", color: "#1e3a8a", fontSize: "14px" }}>
                TNPCB Station 03: Orathapalayam Dam Exit
              </h4>
              <p style={{ margin: 0, fontSize: "12px", color: "#475569" }}>
                Downstream Reservoir Outflow Monitoring
              </p>

              <div style={{ marginTop: "8px", paddingTop: "6px", borderTop: "1px solid #e2e8f0", fontSize: "12px" }}>
                <div>EC: <strong>{Math.round(st3Ec)} µS/cm</strong></div>
                <div>TDS: <strong>{Math.round(st3Ec * 0.65)} mg/L</strong></div>
                <div style={{ color: "#475569", fontWeight: 600, marginTop: "4px" }}>Accumulated Reservoir Salinity</div>
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Industrial CETP Outfall Nodes with Interactive Toggle */}
        <Marker
          position={[11.085, 77.331]}
          icon={outfallIcon("Arulpuram Dyers CETP", unit007Active)}
          eventHandlers={{ click: onToggleUnit007 }}
        >
          <Tooltip sticky>Click marker to toggle Solenoid Bypass Valve</Tooltip>
        </Marker>

        <Marker
          position={[11.118, 77.385]}
          icon={outfallIcon("Kasipalayam Dyeing Zone", unit001Active)}
          eventHandlers={{ click: onToggleUnit001 }}
        >
          <Tooltip sticky>Click marker to toggle Solenoid Bypass Valve</Tooltip>
        </Marker>

        <Marker
          position={[11.102, 77.275]}
          icon={outfallIcon("Mangalam Textile Hub", unit012Active)}
          eventHandlers={{ click: onToggleUnit012 }}
        >
          <Tooltip sticky>Click marker to toggle Solenoid Bypass Valve</Tooltip>
        </Marker>

        {/* Citizen Mode Groundwater Contamination Buffer Rings */}
        {roleMode === "CITIZEN" && anyBypass && (
          <>
            <Circle
              center={[11.085, 77.331]}
              radius={1600}
              pathOptions={{
                color: "#ef4444",
                fillColor: "#ef4444",
                fillOpacity: 0.18,
                dashArray: "6,6",
              }}
            />
            <Circle
              center={[11.118, 77.385]}
              radius={1900}
              pathOptions={{
                color: "#f59e0b",
                fillColor: "#f59e0b",
                fillOpacity: 0.18,
                dashArray: "6,6",
              }}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
}
