"use client";

import React from "react";
import { SteriCityOverview, RiskCategory } from "@/lib/steri/types";

interface SteriCityOverviewCardProps {
  overview: SteriCityOverview;
  onOpenWeightModal?: () => void;
  onSelectUnit?: (unitId: string) => void;
}

export function getRiskBadgeStyle(category: RiskCategory) {
  switch (category) {
    case "LOW":
      return { bg: "rgba(22, 163, 74, 0.12)", color: "#16a34a", border: "rgba(22, 163, 74, 0.3)", icon: "●" };
    case "MODERATE":
      return { bg: "rgba(2, 132, 199, 0.12)", color: "#0284c7", border: "rgba(2, 132, 199, 0.3)", icon: "●" };
    case "HIGH":
      return { bg: "rgba(217, 119, 6, 0.12)", color: "#d97706", border: "rgba(217, 119, 6, 0.3)", icon: "▲" };
    case "VERY HIGH":
      return { bg: "rgba(249, 115, 22, 0.12)", color: "#f97316", border: "rgba(249, 115, 22, 0.3)", icon: "▲" };
    case "CRITICAL":
      return { bg: "rgba(220, 38, 38, 0.12)", color: "#dc2626", border: "rgba(220, 38, 38, 0.3)", icon: "!" };
    default:
      return { bg: "rgba(100, 116, 139, 0.12)", color: "#64748b", border: "rgba(100, 116, 139, 0.3)", icon: "—" };
  }
}

export default function SteriCityOverviewCard({
  overview,
  onOpenWeightModal,
}: SteriCityOverviewCardProps) {
  const badge = getRiskBadgeStyle(overview.citywideCategory);
  const scorePct = Math.round(overview.citywideScore * 100);

  return (
    <div
      className="card"
      style={{
        background: "var(--paper-raised)",
        border: "1px solid var(--hairline)",
        padding: "20px",
        borderRadius: "var(--radius-md)",
        position: "relative",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span className="eyebrow" style={{ color: "var(--color-indigo)", fontWeight: 700 }}>
              RESEARCH MODULE · STERI v1.2
            </span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "12px",
                background: "rgba(37, 99, 235, 0.1)",
                color: "#2563eb",
                border: "1px solid rgba(37, 99, 235, 0.2)",
              }}
            >
              MULTI-CRITERIA GIS
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>
            Smart Tiruppur Environmental Risk Index
          </h2>
          <p className="muted small" style={{ margin: "4px 0 0 0" }}>
            Unified spatial risk score synthesizing real hardware telemetry, groundwater levels, flood models & citizen reports.
          </p>
        </div>

        {onOpenWeightModal && (
          <button
            type="button"
            className="btn btn-outline"
            onClick={onOpenWeightModal}
            style={{ fontSize: "12px", padding: "6px 12px" }}
          >
            ⚙️ Configure Weights
          </button>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "16px",
          marginTop: "16px",
          paddingTop: "16px",
          borderTop: "1px solid var(--hairline)",
        }}
      >
        {/* Citywide Score Meter */}
        <div>
          <span className="small muted">Citywide Aggregate Score</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
            <span className="mono" style={{ fontSize: "32px", fontWeight: 800, color: badge.color }}>
              {overview.citywideScore.toFixed(3)}
            </span>
            <span className="small muted">/ 1.000</span>
          </div>
          <div
            style={{
              height: "6px",
              width: "100%",
              background: "var(--hairline)",
              borderRadius: "3px",
              overflow: "hidden",
              marginTop: "6px",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${scorePct}%`,
                background: badge.color,
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>

        {/* Risk Classification Tier */}
        <div>
          <span className="small muted">Citywide Risk Category</span>
          <div style={{ marginTop: "6px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "14px",
                fontWeight: 700,
                padding: "6px 14px",
                borderRadius: "var(--radius-sm)",
                background: badge.bg,
                color: badge.color,
                border: `1px solid ${badge.border}`,
              }}
            >
              <span>{badge.icon}</span>
              <span>{overview.citywideCategory} RISK</span>
            </span>
          </div>
          <p className="small muted" style={{ fontSize: "11px", margin: "6px 0 0 0" }}>
            Calculated across {overview.totalSpatialUnits} Spatial Sectors
          </p>
        </div>

        {/* Primary Vulnerability Driver */}
        <div>
          <span className="small muted">Primary Spatial Driver</span>
          <strong
            style={{
              display: "block",
              fontSize: "14px",
              marginTop: "6px",
              color: "var(--color-indigo)",
            }}
          >
            {overview.dominantCitywideFactor}
          </strong>
          <p className="small muted" style={{ fontSize: "11px", margin: "4px 0 0 0" }}>
            Highest weighted component aggregate
          </p>
        </div>

        {/* Data Provenance Summary */}
        <div>
          <span className="small muted">Data Provenance Mix</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
            <span className="badge badge-normal" style={{ fontSize: "10px", padding: "1px 6px" }}>
              ● LIVE Hardware
            </span>
            <span className="badge badge-normal" style={{ fontSize: "10px", padding: "1px 6px", background: "rgba(14, 165, 233, 0.1)", color: "#0284c7" }}>
              ◐ SIMULATED Monsoon
            </span>
            <span className="badge badge-normal" style={{ fontSize: "10px", padding: "1px 6px", background: "rgba(217, 119, 6, 0.1)", color: "#d97706" }}>
              ◆ DERIVED Attribution
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
