"use client";

import React, { useState } from "react";
import { runFloodAnalysisPipeline, FLOOD_SCENARIOS } from "@/lib/flood/engine";
import { FloodScenarioPreset } from "@/lib/flood/types";

export default function FloodAnalysisPage() {
  const [activePreset, setActivePreset] = useState<FloodScenarioPreset>("HEAVY_RAIN");
  const analysis = runFloodAnalysisPipeline(activePreset);

  return (
    <div className="workspace-page">
      {/* Header */}
      <header className="workspace-header">
        <div>
          <p className="eyebrow">ENVIRONMENTAL INTELLIGENCE · RESEARCH MODULE</p>
          <h1>Terrain-Aware Flood-Risk Analysis & Scenario Mode</h1>
          <p>
            Spatial multi-criteria terrain risk estimation combining DEM elevation topography, surface slope, Noyyal River channel proximity, and stormwater drainage lines under varying monsoon rainfall scenarios.
          </p>
        </div>

        {/* Scenario Presets Selector */}
        <div style={{ display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap" }}>
          {(["BASELINE", "MODERATE_RAIN", "HEAVY_RAIN", "EXTREME_RAIN"] as FloodScenarioPreset[]).map((preset) => (
            <button
              key={preset}
              type="button"
              className={`btn ${activePreset === preset ? "btn-primary" : "btn-outline"}`}
              style={{ fontSize: "12px" }}
              onClick={() => setActivePreset(preset)}
            >
              {preset === "BASELINE" && "☀️ Baseline (0mm)"}
              {preset === "MODERATE_RAIN" && "🌧️ Moderate Rain (50mm)"}
              {preset === "HEAVY_RAIN" && "🌩️ Heavy Rain (150mm)"}
              {preset === "EXTREME_RAIN" && "🌊 Extreme Monsoon (250mm)"}
            </button>
          ))}
        </div>
      </header>

      {/* Scenario Overview Card */}
      <div
        className="card"
        style={{
          background: "var(--paper-raised)",
          border: "1px solid var(--hairline)",
          padding: "20px",
          borderRadius: "var(--radius-md)",
          margin: "16px 0",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span className="badge badge-normal" style={{ fontSize: "10px", background: "rgba(14, 165, 233, 0.1)", color: "#0284c7" }}>
                ⚡ {analysis.modelType}
              </span>
              <span className="small muted mono" style={{ fontSize: "10px" }}>
                Scenario: {analysis.scenario.preset}
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
              {analysis.scenario.description}
            </h3>
          </div>

          <div style={{ display: "flex", gap: "16px" }}>
            <div>
              <span className="small muted">Rainfall Rate</span>
              <div className="mono" style={{ fontSize: "20px", fontWeight: 800 }}>
                {analysis.scenario.rainfallMmDay} <span style={{ fontSize: "11px" }}>mm/day</span>
              </div>
            </div>

            <div>
              <span className="small muted">Max Accumulation</span>
              <div className="mono" style={{ fontSize: "20px", fontWeight: 800, color: "#0284c7" }}>
                {analysis.citywideMaxAccumulationMeters} <span style={{ fontSize: "11px" }}>meters</span>
              </div>
            </div>

            <div>
              <span className="small muted">High Risk Sectors</span>
              <div className="mono" style={{ fontSize: "20px", fontWeight: 800, color: "#dc2626" }}>
                {analysis.highRiskZonesCount} / {analysis.affectedZones.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Affected Spatial Zones Grid */}
      <div style={{ marginTop: "16px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 12px 0" }}>
          Terrain Elevation & Accumulation Analysis ({analysis.affectedZones.length} Spatial Sectors)
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
          {analysis.affectedZones.map((zone) => {
            const isHigh = zone.floodRiskScore >= 0.6;
            const scoreColor = zone.floodRiskScore >= 0.8 ? "#dc2626" : isHigh ? "#ea580c" : "#16a34a";

            return (
              <div
                key={zone.zoneId}
                className="card"
                style={{
                  padding: "16px",
                  background: "var(--paper-raised)",
                  border: isHigh ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid var(--hairline)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>{zone.zoneName}</h4>
                    <span className="small muted" style={{ fontSize: "11px" }}>
                      Elevation: <strong className="mono">{zone.elevationMetersASL}m ASL</strong> · Slope: {zone.slopeDegrees}° · River Dist: {zone.riverProximityMeters}m
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "var(--radius-sm)",
                      background: `${scoreColor}18`,
                      color: scoreColor,
                      border: `1px solid ${scoreColor}44`,
                    }}
                  >
                    {zone.riskCategory}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "12px 0" }}>
                  <div>
                    <span className="small muted">Est. Accumulation</span>
                    <div className="mono" style={{ fontSize: "20px", fontWeight: 800, color: "#0284c7" }}>
                      {zone.accumulationDepthMeters} m
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span className="small muted">Drainage Choke Risk</span>
                    <div className="mono" style={{ fontSize: "20px", fontWeight: 800, color: scoreColor }}>
                      {(zone.floodRiskScore * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: "11px", marginBottom: "8px" }}>
                  <strong style={{ color: "var(--color-indigo)", display: "block" }}>Required Inspection Segments:</strong>
                  <span className="muted">{zone.inspectionSegmentsRequired.join(", ")}</span>
                </div>

                <div style={{ fontSize: "11px", paddingTop: "8px", borderTop: "1px solid var(--hairline)", display: "flex", justifyContent: "space-between" }} className="muted">
                  <span>Affected Infra: {zone.estimatedAffectedInfrastructure.length} Items</span>
                  <span>Citizen Complaints: {zone.nearbyCitizenComplaintsCount} Reports</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Methodology & Provenance Section */}
      <div className="card" style={{ marginTop: "24px", padding: "20px", background: "var(--paper-raised)" }}>
        <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", fontWeight: 700 }}>
          📐 Methodology & Model Provenance Disclaimer
        </h3>
        <p className="small muted" style={{ lineHeight: 1.6, margin: "0 0 10px 0" }}>
          {analysis.methodologyProvenance.disclaimer}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", fontSize: "11px" }}>
          <div><strong>DEM Resolution:</strong> {analysis.methodologyProvenance.demResolutionMeters}m SRTM Surface Elevation</div>
          <div><strong>River Channel:</strong> {analysis.methodologyProvenance.riverGeometrySource}</div>
          <div><strong>Drainage Lines:</strong> {analysis.methodologyProvenance.drainageNetworkSource}</div>
        </div>
      </div>
    </div>
  );
}
