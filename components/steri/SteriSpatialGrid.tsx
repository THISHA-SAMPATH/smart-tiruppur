"use client";

import React from "react";
import { SpatialRiskUnit } from "@/lib/steri/types";
import { getRiskBadgeStyle } from "./SteriCityOverviewCard";
import { COMPONENT_LABELS } from "@/lib/steri/calculator";

interface SteriSpatialGridProps {
  units: SpatialRiskUnit[];
  onSelectUnit: (unit: SpatialRiskUnit) => void;
}

export default function SteriSpatialGrid({ units, onSelectUnit }: SteriSpatialGridProps) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
            Spatial Sector Risk Map & Grid ({units.length} Spatial Sectors)
          </h3>
          <p className="muted small" style={{ margin: "2px 0 0 0" }}>
            Click any spatial sector card or map region to inspect full component sub-scores and data provenance.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
        {units.map((u) => {
          const badge = getRiskBadgeStyle(u.riskCategory);
          const scorePct = Math.round(u.steriScore * 100);

          return (
            <div
              key={u.id}
              className="card"
              style={{
                background: "var(--paper-raised)",
                border: "1px solid var(--hairline)",
                padding: "16px",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
              }}
              onClick={() => onSelectUnit(u)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.borderColor = badge.border;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.borderColor = "var(--hairline)";
              }}
            >
              {/* Card Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                <div>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "var(--color-indigo)",
                    }}
                  >
                    {u.type.replace("_", " ")}
                  </span>
                  <h4 style={{ margin: "2px 0 0 0", fontSize: "16px", fontWeight: 700 }}>{u.name}</h4>
                </div>

                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "var(--radius-sm)",
                    background: badge.bg,
                    color: badge.color,
                    border: `1px solid ${badge.border}`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {badge.icon} {u.riskCategory}
                </span>
              </div>

              {/* Score & Dominant Driver */}
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "12px" }}>
                <div>
                  <span className="small muted" style={{ fontSize: "11px" }}>STERI Score</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                    <span className="mono" style={{ fontSize: "22px", fontWeight: 800, color: badge.color }}>
                      {u.steriScore.toFixed(3)}
                    </span>
                    <span className="small muted" style={{ fontSize: "11px" }}>/ 1.0</span>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span className="small muted" style={{ fontSize: "11px" }}>Dominant Driver</span>
                  <strong style={{ display: "block", fontSize: "12px", color: "var(--color-indigo)" }}>
                    {u.dominantFactorLabel}
                  </strong>
                </div>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  height: "4px",
                  width: "100%",
                  background: "var(--hairline)",
                  borderRadius: "2px",
                  overflow: "hidden",
                  margin: "8px 0 12px 0",
                }}
              >
                <div style={{ height: "100%", width: `${scorePct}%`, background: badge.color }} />
              </div>

              {/* Sub-Score Mini Bars */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11px" }}>
                {(Object.keys(u.componentScores) as Array<keyof typeof u.componentScores>).map((k) => {
                  const val = u.componentScores[k];
                  const isDom = k === u.dominantFactor;
                  return (
                    <div
                      key={k}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "2px 6px",
                        background: isDom ? "rgba(217, 119, 6, 0.08)" : "var(--paper-subtle)",
                        borderRadius: "3px",
                        border: isDom ? "1px solid rgba(217, 119, 6, 0.2)" : "none",
                      }}
                    >
                      <span className="muted" style={{ fontWeight: isDom ? 700 : 400 }}>
                        {k.substring(0, 6)}:
                      </span>
                      <span className="mono" style={{ fontWeight: 700 }}>
                        {(val * 100).toFixed(0)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Provenance Tag Footer */}
              <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--hairline)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="small muted" style={{ fontSize: "10px" }}>
                  {(u.confidence * 100).toFixed(0)}% model-input confidence · {u.metrics.activeSensors} simulated sensor association
                </span>
                <span className="small" style={{ fontSize: "11px", fontWeight: 700, color: "#2563eb" }}>
                  Inspect Sector 🔍
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
