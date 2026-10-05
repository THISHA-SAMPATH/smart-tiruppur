"use client";

import React, { useEffect, useState } from "react";
import { Circle, Popup, Tooltip, LayerGroup } from "react-leaflet";
import { calculateSteri } from "@/lib/steri/calculator";
import { SpatialRiskUnit, SteriCityOverview, RiskCategory } from "@/lib/steri/types";

export function getRiskColorHex(category: RiskCategory): { fill: string; stroke: string } {
  switch (category) {
    case "LOW":
      return { fill: "#16a34a", stroke: "#15803d" };
    case "MODERATE":
      return { fill: "#eab308", stroke: "#ca8a04" };
    case "HIGH":
      return { fill: "#f97316", stroke: "#ea580c" };
    case "VERY HIGH":
      return { fill: "#ea580c", stroke: "#c2410c" };
    case "CRITICAL":
      return { fill: "#dc2626", stroke: "#b91c1c" };
    default:
      return { fill: "#64748b", stroke: "#475569" };
  }
}

export function getRiskSymbol(category: RiskCategory): string {
  switch (category) {
    case "LOW":
    case "MODERATE":
      return "●";
    case "HIGH":
    case "VERY HIGH":
      return "▲";
    case "CRITICAL":
      return "!";
    default:
      return "—";
  }
}

interface SteriSpatialRiskLayerProps {
  onSelectUnit?: (unit: SpatialRiskUnit) => void;
}

export default function SteriSpatialRiskLayer({ onSelectUnit }: SteriSpatialRiskLayerProps) {
  const [overview, setOverview] = useState<SteriCityOverview | null>(null);

  useEffect(() => {
    // Calculate current STERI spatial risk scores
    const data = calculateSteri();
    setOverview(data);
  }, []);

  if (!overview) return null;

  return (
    <LayerGroup>
      {overview.units.map((unit) => {
        const colors = getRiskColorHex(unit.riskCategory);
        const symbol = getRiskSymbol(unit.riskCategory);
        const radiusMeters = Math.sqrt(unit.areaKm2 * 1000000 / Math.PI) * 0.45;

        return (
          <Circle
            key={unit.id}
            center={[unit.lat, unit.lon]}
            radius={radiusMeters}
            pathOptions={{
              fillColor: colors.fill,
              fillOpacity: 0.35,
              color: colors.stroke,
              weight: 2,
              dashArray: "3, 6",
            }}
            eventHandlers={{
              click: () => {
                if (onSelectUnit) onSelectUnit(unit);
              },
            }}
          >
            <Tooltip sticky direction="top">
              <div style={{ fontFamily: "sans-serif", fontSize: "12px", fontWeight: 600 }}>
                <span style={{ color: colors.stroke, marginRight: "4px" }}>{symbol}</span>
                {unit.name}: <strong>{unit.riskCategory} RISK</strong> ({unit.steriScore.toFixed(3)})
              </div>
            </Tooltip>

            <Popup>
              <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", padding: "4px", minWidth: "260px", maxWidth: "320px" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
                    {unit.name}
                  </h4>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: "4px",
                      background: `${colors.fill}22`,
                      color: colors.stroke,
                      border: `1px solid ${colors.stroke}44`,
                    }}
                  >
                    {symbol} {unit.riskCategory}
                  </span>
                </div>

                {/* Score Strip */}
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    marginBottom: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                      STERI Score
                    </span>
                    <div style={{ fontSize: "20px", fontWeight: 800, color: colors.stroke, fontFamily: "monospace" }}>
                      {unit.steriScore.toFixed(3)} <span style={{ fontSize: "11px", color: "#94a3b8" }}>/ 1.0</span>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                      Dominant Factor
                    </span>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#1e293b" }}>
                      {unit.dominantFactorLabel}
                    </div>
                  </div>
                </div>

                {/* 6 Component Contributions */}
                <div style={{ fontSize: "11px", marginBottom: "10px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "4px" }}>
                    Component Contributions (0.00 – 1.00)
                  </span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                    <div style={{ background: "#f1f5f9", padding: "3px 6px", borderRadius: "3px", display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#475569" }}>Pollution:</span>
                      <strong style={{ fontFamily: "monospace" }}>{(unit.componentScores.pollution * 100).toFixed(0)}%</strong>
                    </div>
                    <div style={{ background: "#f1f5f9", padding: "3px 6px", borderRadius: "3px", display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#475569" }}>Water Quality:</span>
                      <strong style={{ fontFamily: "monospace" }}>{(unit.componentScores.waterQuality * 100).toFixed(0)}%</strong>
                    </div>
                    <div style={{ background: "#f1f5f9", padding: "3px 6px", borderRadius: "3px", display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#475569" }}>Flood Risk:</span>
                      <strong style={{ fontFamily: "monospace" }}>{(unit.componentScores.flood * 100).toFixed(0)}%</strong>
                    </div>
                    <div style={{ background: "#f1f5f9", padding: "3px 6px", borderRadius: "3px", display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#475569" }}>Groundwater:</span>
                      <strong style={{ fontFamily: "monospace" }}>{(unit.componentScores.groundwater * 100).toFixed(0)}%</strong>
                    </div>
                    <div style={{ background: "#f1f5f9", padding: "3px 6px", borderRadius: "3px", display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#475569" }}>Industrial Load:</span>
                      <strong style={{ fontFamily: "monospace" }}>{(unit.componentScores.industrialPressure * 100).toFixed(0)}%</strong>
                    </div>
                    <div style={{ background: "#f1f5f9", padding: "3px 6px", borderRadius: "3px", display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#475569" }}>Complaints:</span>
                      <strong style={{ fontFamily: "monospace" }}>{(unit.componentScores.complaintIntensity * 100).toFixed(0)}%</strong>
                    </div>
                  </div>
                </div>

                {/* Metadata & Provenance */}
                <div style={{ fontSize: "10px", color: "#64748b", borderTop: "1px solid #e2e8f0", paddingTop: "6px", marginBottom: "8px" }}>
                  <div><strong>Model Confidence:</strong> {(unit.confidence * 100).toFixed(0)}% Confidence</div>
                  <div><strong>Last Updated:</strong> {new Date(unit.timestamp).toLocaleTimeString()}</div>
                  <div><strong>Data Provenance:</strong> {unit.provenance.realDataSources.length} Hardware · {unit.provenance.simulatedDataSources.length} Models</div>
                </div>

                {/* Risk Methodology Expandable Details */}
                <details style={{ fontSize: "10.5px", color: "#334155", background: "#f8fafc", padding: "6px 8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}>
                  <summary style={{ cursor: "pointer", fontWeight: 700, color: "#2563eb" }}>
                    📐 Risk Methodology Explanation
                  </summary>
                  <p style={{ margin: "6px 0 2px", lineHeight: "1.4", fontSize: "10px" }}>
                    STERI combines 6 spatial indicators into a multi-criteria score using normalized weights:
                  </p>
                  <div style={{ fontFamily: "monospace", fontSize: "9px", background: "#e2e8f0", padding: "4px", borderRadius: "3px", margin: "4px 0" }}>
                    STERI = wp*Pollution + ww*WaterQuality + wf*Flood + wg*Groundwater + wi*Industry + wc*Complaints
                  </div>
                  <p style={{ margin: 0, fontSize: "9.5px", color: "#64748b" }}>
                    Integrates hardware IoT telemetry, hydrodynamic flood simulations, Bayesian source attribution, and CGWB piezometer baselines.
                  </p>
                </details>
              </div>
            </Popup>
          </Circle>
        );
      })}
    </LayerGroup>
  );
}
