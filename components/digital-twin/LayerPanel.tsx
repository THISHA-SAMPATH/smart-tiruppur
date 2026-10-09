"use client";

import React from "react";
import type { LayerToggles, LightingPreset } from "../Terrain3DViewer";
import SourceBadge from "@/components/provenance/SourceBadge";

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
  onClose?: () => void;
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
  onClose,
}: LayerPanelProps) {
  return (
    <div className="dt-panel-left" role="region" aria-label="Layers and Analysis Panel">
      {/* PANEL HEADER WITH CLOSE BUTTON */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <h2 style={{ fontSize: "13px", fontWeight: 700, margin: 0, color: "var(--ink)" }}>
          Layers & Analysis
        </h2>
        {onClose && (
          <button
            type="button"
            aria-label="Close Layer Panel"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--ink-soft)",
              cursor: "pointer",
              fontSize: "14px",
              padding: "2px 6px",
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* DATA PROVENANCE & STATUS LEGEND */}
      <div className="dt-card-surface">
        <div className="dt-section-title">Data Status & Provenance</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11px", marginTop: "6px" }}>
          <div style={{ color: "var(--ink)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
            <SourceBadge type="MEASURED" /> GIS Geometry
          </div>
          <div style={{ color: "var(--ink)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
            <SourceBadge type="SIMULATED" /> Inputs
          </div>
          <div style={{ color: "var(--ink)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
            <SourceBadge type="MODELLED" /> STERI
          </div>
          <div style={{ color: "var(--ink)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
            <SourceBadge type="HISTORICAL" /> Terrain
          </div>
        </div>
      </div>

      {/* ANALYSIS MODES */}
      <div>
        <div className="dt-section-title">Analysis Modes</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
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
              style={{ textAlign: "left", justifyContent: "flex-start", width: "100%" }}
              onClick={() => onSelectAnalysisMode(mode.id as any)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: "1px", background: "var(--hairline)" }} />

      {/* VIEW LAYERS */}
      <div>
        <div className="dt-section-title">View Layers</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", marginTop: "6px" }}>
          {[
            { key: "terrain", label: "3D DEM Topography" },
            { key: "river", label: "Noyyal River Flow" },
            { key: "drainage", label: "Drainage Channels (GIS Network)" },
            { key: "roads", label: "Regional Highways (TNGIS)" },
            { key: "urbanRoads", label: "Urban Street Network (OSM)" },
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
            <label key={item.key} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "var(--ink)" }}>
              <input
                type="checkbox"
                checked={Boolean(layers[item.key as keyof LayerToggles])}
                onChange={() => onToggleLayer(item.key as keyof LayerToggles)}
                style={{ accentColor: "var(--teal)", cursor: "pointer" }}
              />
              {item.label}
            </label>
          ))}
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "var(--ink)", paddingTop: "6px", borderTop: "1px solid var(--hairline)" }}>
            <input
              type="checkbox"
              checked={compareWithBaseline}
              onChange={(event) => onChangeCompareWithBaseline(event.target.checked)}
              style={{ accentColor: "var(--teal)", cursor: "pointer" }}
            />
            Compare STERI with Baseline
          </label>
          {/* RISK RAMP LEGEND (Item #1) */}
          <div style={{ marginTop: "8px", padding: "8px", background: "var(--paper)", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--ink-soft)", marginBottom: "4px", display: "flex", justifyContent: "space-between" }}>
              <span>NOYYAL RIVER RISK RAMP</span>
              <span>WQI Index</span>
            </div>
            <div
              style={{
                height: "8px",
                borderRadius: "4px",
                background: "linear-gradient(to right, var(--risk-1), var(--risk-2), var(--risk-3), var(--risk-4), var(--risk-5))",
                marginBottom: "4px",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9.5px", color: "var(--ink-soft)", fontWeight: 600 }}>
              <span>Low (0.0)</span>
              <span>Mod</span>
              <span>High</span>
              <span>Critical (1.0)</span>
            </div>
            <div style={{ marginTop: "6px", paddingTop: "6px", borderTop: "1px dashed var(--hairline)", fontSize: "9.5px", color: "var(--ink-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "var(--teal)", border: "1.5px solid #ffffff", boxShadow: "0 0 0 1px var(--teal)" }} />
                <span>Station Points</span>
              </span>
              <span style={{ fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "3px" }}>
                <span>Stretch: Interpolated</span>
                <SourceBadge type="MODELLED" />
              </span>
            </div>
          </div>

          <p style={{ margin: "4px 0 0", fontSize: "10.5px", color: steriDataUnavailable ? "var(--risk-5)" : "var(--ink-soft)" }}>
            {steriDataUnavailable ? "Risk data unavailable — other Digital Twin layers remain available." : "Modelled scenario change; not a validated real-world forecast."}
          </p>
        </div>
      </div>

      <div style={{ height: "1px", background: "var(--hairline)" }} />

      {/* LIGHTING CONTROL */}
      <div>
        <div className="dt-section-title">Lighting</div>
        <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
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
