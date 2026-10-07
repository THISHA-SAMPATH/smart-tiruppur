"use client";

import React from "react";
import type { LayerToggles, LightingPreset } from "../Terrain3DViewer";

interface LayerPanelProps {
  layers: LayerToggles;
  lighting: LightingPreset;
  activeAnalysisMode: string;
  onToggleLayer: (key: keyof LayerToggles) => void;
  onSelectAnalysisMode: (mode: "baseline" | "steri" | "water" | "groundwater" | "flood" | "compliance") => void;
  onChangeLighting: (mode: LightingPreset) => void;
  compareWithBaseline: boolean;
  onChangeCompareWithBaseline: (enabled: boolean) => void;
  steriDataUnavailable: boolean;
}

export default function LayerPanel({
  layers,
  lighting,
  activeAnalysisMode,
  onToggleLayer,
  onSelectAnalysisMode,
  onChangeLighting,
  compareWithBaseline,
  onChangeCompareWithBaseline,
  steriDataUnavailable,
}: LayerPanelProps) {
  return (
    <div className="dt-panel-left">
      {/* DATA PROVENANCE & STATUS LEGEND (FIX #11 & FIX #37) */}
      <div className="dt-card-surface">
        <div className="dt-section-title">DATA STATUS & PROVENANCE</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11px" }}>
          <div style={{ color: "var(--color-green)", fontWeight: 600 }}>OPEN_DATA GIS Geometry</div>
          <div style={{ color: "var(--color-teal)", fontWeight: 600 }}>SIMULATED Inputs</div>
          <div style={{ color: "var(--color-amber)", fontWeight: 600 }}>MODELLED STERI</div>
          <div style={{ color: "var(--color-slate-muted)", fontWeight: 600 }}>MODELLED Terrain</div>
        </div>
      </div>

      {/* ANALYSIS MODES (FIX #12) */}
      <div>
        <div className="dt-section-title">ANALYSIS MODES</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {[
            { id: "baseline", label: "Environmental Baseline 🌐" },
            { id: "steri", label: "STERI Spatial Risk Index 🧪" },
            { id: "water", label: "Water Quality & Plume 🌊" },
            { id: "groundwater", label: "FIRKA Groundwater 💧" },
            { id: "flood", label: "Monsoon Flood Risk 🌧️" },
            { id: "compliance", label: "Industrial ZLD Compliance 🏭" },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`dt-btn ${activeAnalysisMode === mode.id ? "active" : ""}`}
              style={{ textAlign: "left" }}
              onClick={() => onSelectAnalysisMode(mode.id as any)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: "1px", background: "var(--color-slate-border)" }} />

      {/* VIEW LAYERS */}
      <div>
        <div className="dt-section-title">VIEW LAYERS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
          {[
            { key: "terrain", label: "3D DEM Topography" },
            { key: "river", label: "Noyyal River Flow" },
            { key: "drainage", label: "Drainage Channels (GIS Network)" },
            { key: "roads", label: "Road Network (GIS Transit)" },
            { key: "buildings", label: "Urban Fabric (OSM Buildings)" },
            { key: "units", label: "Industrial Facilities (12 Units)" },
            { key: "dischargePaths", label: "Simulated Discharge Paths" },
            { key: "infrastructure", label: "Utility Infrastructure" },
            { key: "vegetation", label: "Vegetation & Canopy" },
            { key: "sensors", label: "Monitoring Stations" },
            { key: "groundwater", label: "FIRKA Groundwater Stress" },
            { key: "steriRisk", label: "Environmental Risk (STERI 3D)" },
            { key: "citizenIssues", label: "Citizen Issues & Hotspots 👥" },
            { key: "contours", label: "GIS Contour Lines" },
            { key: "floodRisk", label: "Monsoon Flood Risk Zone" },
            { key: "pollution", label: "Pollution Transport (Simulated)" },
            { key: "sourceSensorInfluence", label: "Source → Sensor Influence" },
          ].map((item) => (
            <label key={item.key} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "var(--color-slate-text)" }}>
              <input
                type="checkbox"
                checked={Boolean(layers[item.key as keyof LayerToggles])}
                onChange={() => onToggleLayer(item.key as keyof LayerToggles)}
                style={{ accentColor: "var(--color-cyan)", cursor: "pointer" }}
              />
              {item.label}
            </label>
          ))}
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "var(--color-slate-text)", paddingTop: "4px", borderTop: "1px solid var(--color-slate-border)" }}>
            <input type="checkbox" checked={compareWithBaseline} onChange={(event) => onChangeCompareWithBaseline(event.target.checked)} style={{ accentColor: "var(--color-cyan)", cursor: "pointer" }} />
            Compare STERI with Baseline
          </label>
          <p style={{ margin: 0, fontSize: "10px", color: steriDataUnavailable ? "var(--color-amber)" : "var(--color-slate-muted)" }}>
            {steriDataUnavailable ? "Risk data unavailable — other Digital Twin layers remain available." : "Modelled scenario change; not a validated real-world forecast."}
          </p>
        </div>
      </div>

      <div style={{ height: "1px", background: "var(--color-slate-border)" }} />

      {/* LIGHTING CONTROL */}
      <div>
        <div className="dt-section-title">LIGHTING</div>
        <div style={{ display: "flex", gap: "6px" }}>
          {[
            { id: "day", label: "Day ☀️" },
            { id: "dusk", label: "Dusk 🌅" },
            { id: "night", label: "Night 🌙" },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`dt-btn ${lighting === mode.id ? "active" : ""}`}
              style={{ flex: 1, padding: "4px" }}
              onClick={() => onChangeLighting(mode.id as LightingPreset)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
