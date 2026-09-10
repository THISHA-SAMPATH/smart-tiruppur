"use client";

import { useState, useCallback } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import NoyyalRiverLayer from "@/components/NoyyalRiverLayer";
import NoyyalWaterQualityLayer from "@/components/NoyyalWaterQualityLayer";
import IndustrialAreasLayer from "@/components/IndustrialAreasLayer";
import FirkaGroundwaterLayer from "@/components/FirkaGroundwaterLayer";
import IndustrialUnitsLayer, { IndustrialUnitGeo } from "@/components/IndustrialUnitsLayer";

const TIRUPPUR_CENTER: [number, number] = [11.1085, 77.3411];
const DEFAULT_ZOOM = 13;

export default function TiruppurMap() {
  const [showRiverLayer, setShowRiverLayer] = useState(true);
  const [showWqLayer, setShowWqLayer] = useState(true);
  const [showAreasLayer, setShowAreasLayer] = useState(true);
  const [showFirkaLayer, setShowFirkaLayer] = useState(true);
  const [showUnitsLayer, setShowUnitsLayer] = useState(true);
  const [extractionMultiplier, setExtractionMultiplier] = useState(1.0);
  const [geocodedCount, setGeocodedCount] = useState(0);
  const [totalUnitsCount, setTotalUnitsCount] = useState(0);

  const handleUnitsLoaded = useCallback((units: IndustrialUnitGeo[]) => {
    setTotalUnitsCount(units.length);
    const geocoded = units.filter((u) => u.coordinates && u.coordinates.length === 2);
    setGeocodedCount(geocoded.length);
  }, []);

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
          background: "rgba(246, 243, 234, 0.96)",
          backdropFilter: "blur(8px)",
          padding: "12px 16px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--hairline)",
          boxShadow: "0 4px 14px rgba(0, 0, 0, 0.12)",
          minWidth: "240px",
          maxWidth: "280px",
          maxHeight: "calc(100% - 28px)",
          overflowY: "auto",
        }}
      >
        <p
          className="eyebrow"
          style={{ fontSize: "10px", margin: "0 0 8px", color: "var(--ink-soft)" }}
        >
          MAP LAYERS
        </p>

        <div style={{ display: "grid", gap: "8px" }}>
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
              checked={showWqLayer}
              onChange={(e) => setShowWqLayer(e.target.checked)}
              style={{ accentColor: "#0284c7", cursor: "pointer" }}
            />
            <span
              style={{
                width: "12px",
                height: "12px",
                background: "#0284c7",
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "8px",
              }}
            >
              💧
            </span>
            TNPCB Water Quality (3)
          </label>

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
              checked={showAreasLayer}
              onChange={(e) => setShowAreasLayer(e.target.checked)}
              style={{ accentColor: "#d97706", cursor: "pointer" }}
            />
            <span
              style={{
                width: "12px",
                height: "12px",
                background: "#fef3c7",
                border: "1.5px dashed #b45309",
                borderRadius: "2px",
                display: "inline-block",
              }}
            />
            Industrial Areas
          </label>

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
              checked={showFirkaLayer}
              onChange={(e) => setShowFirkaLayer(e.target.checked)}
              style={{ accentColor: "#16a34a", cursor: "pointer" }}
            />
            <span
              style={{
                display: "inline-flex",
                gap: "2px",
                alignItems: "center",
              }}
            >
              <span style={{ width: "4px", height: "10px", background: "#16a34a", borderRadius: "1px" }} />
              <span style={{ width: "4px", height: "10px", background: "#ca8a04", borderRadius: "1px" }} />
              <span style={{ width: "4px", height: "10px", background: "#ea580c", borderRadius: "1px" }} />
              <span style={{ width: "4px", height: "10px", background: "#dc2626", borderRadius: "1px" }} />
            </span>
            FIRKA Groundwater (33)
          </label>

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
              checked={showUnitsLayer}
              onChange={(e) => setShowUnitsLayer(e.target.checked)}
              style={{ accentColor: "#9c3b22", cursor: "pointer" }}
            />
            <span
              style={{
                width: "12px",
                height: "12px",
                background: "#9c3b22",
                borderRadius: "2px",
                display: "inline-block",
              }}
            />
            Industrial Units ({geocodedCount}/{totalUnitsCount || 12})
          </label>
        </div>

        {showFirkaLayer && (
          <div
            style={{
              marginTop: "10px",
              paddingTop: "8px",
              borderTop: "1px solid var(--hairline)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: "4px",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#475569" }}>
                Groundwater Scenario:
              </span>
              <span style={{ fontSize: "11px", fontWeight: "bold", color: extractionMultiplier === 1.0 ? "#1e293b" : "#b45309" }}>
                {extractionMultiplier === 1.0 ? "Baseline (1.0x)" : `${extractionMultiplier}x Extraction`}
              </span>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                type="button"
                className={`btn ${extractionMultiplier === 1.0 ? "btn-primary" : "btn-ghost"}`}
                style={{ padding: "2px 6px", fontSize: "10px", flex: 1 }}
                onClick={() => setExtractionMultiplier(1.0)}
              >
                1.0x Base
              </button>
              <button
                type="button"
                className={`btn ${extractionMultiplier === 1.2 ? "btn-primary" : "btn-ghost"}`}
                style={{ padding: "2px 6px", fontSize: "10px", flex: 1 }}
                onClick={() => setExtractionMultiplier(1.2)}
              >
                1.2x (+20%)
              </button>
              <button
                type="button"
                className={`btn ${extractionMultiplier === 0.8 ? "btn-primary" : "btn-ghost"}`}
                style={{ padding: "2px 6px", fontSize: "10px", flex: 1 }}
                onClick={() => setExtractionMultiplier(0.8)}
              >
                0.8x (-20%)
              </button>
            </div>
          </div>
        )}

        {totalUnitsCount > 0 && geocodedCount === 0 && (
          <p className="small muted" style={{ fontSize: "11px", margin: "8px 0 0", color: "var(--turmeric)" }}>
            ℹ 0 units contain GIS coordinates. Markers will appear once coordinates are added.
          </p>
        )}

        {/* River Flow Data Availability Notice */}
        <div
          style={{
            marginTop: "12px",
            paddingTop: "10px",
            borderTop: "1px solid var(--hairline)",
            fontSize: "11px",
            lineHeight: "1.4",
          }}
        >
          <p
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.05em",
              color: "#1e3a8a",
              textTransform: "uppercase",
              margin: "0 0 6px",
            }}
          >
            River Flow Data Availability
          </p>

          <p style={{ margin: "0 0 6px", fontSize: "11px", color: "var(--ink)", fontWeight: 500 }}>
            Public real-time or daily CWC/India-WRIS discharge data for the Noyyal River within the Tiruppur reach was not verified.
          </p>

          <p style={{ margin: "0 0 4px", fontSize: "10.5px", color: "#475569" }}>
            • Regional CWC/India-WRIS historical stations exist upstream/downstream, but they are not used as Tiruppur flow values.
          </p>

          <p style={{ margin: "0 0 6px", fontSize: "10.5px", color: "#475569" }}>
            • Orathapalayam reservoir operations are monitored by Tamil Nadu Water Resources Department, but an open programmatic discharge dataset was not verified.
          </p>

          <div
            style={{
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              padding: "4px 6px",
              borderRadius: "4px",
              marginBottom: "6px",
              fontSize: "10px",
              fontWeight: 600,
              color: "#334155",
            }}
          >
            Status: No verified public Tiruppur river-flow telemetry
          </div>

          <div style={{ fontSize: "9.5px", color: "#64748b", fontStyle: "italic" }}>
            Sources investigated: India-WRIS / NWIC / CWC / Tamil Nadu WRD
          </div>
        </div>
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

        {showWqLayer && <NoyyalWaterQualityLayer />}

        {showAreasLayer && <IndustrialAreasLayer />}

        {showFirkaLayer && (
          <FirkaGroundwaterLayer multiplier={extractionMultiplier} />
        )}

        {showUnitsLayer && (
          <IndustrialUnitsLayer onUnitsLoaded={handleUnitsLoaded} />
        )}
      </MapContainer>
    </div>
  );
}
