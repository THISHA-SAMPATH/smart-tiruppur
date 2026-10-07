"use client";

import React from "react";
import { SpatialRiskUnit } from "@/lib/steri/types";
import { getRiskBadgeStyle } from "./SteriCityOverviewCard";
import { COMPONENT_LABELS, classifyRiskCategory } from "@/lib/steri/calculator";

interface SteriInspectorModalProps {
  unit: SpatialRiskUnit | null;
  onClose: () => void;
}

export default function SteriInspectorModal({ unit, onClose }: SteriInspectorModalProps) {
  if (!unit) return null;

  const badge = getRiskBadgeStyle(unit.riskCategory);
  const scorePct = Math.round(unit.steriScore * 100);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: "680px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--paper-raised)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-lg)",
          padding: "24px",
          boxShadow: "var(--shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span className="eyebrow" style={{ color: "var(--color-indigo)" }}>
                SPATIAL RISK SECTOR INSPECTOR
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "12px",
                  background: badge.bg,
                  color: badge.color,
                  border: `1px solid ${badge.border}`,
                }}
              >
                {badge.icon} {unit.riskCategory} RISK
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>{unit.name}</h2>
            <p className="muted small" style={{ margin: "2px 0 0 0" }}>
              Coordinates: <span className="mono">{unit.lat.toFixed(4)}°N, {unit.lon.toFixed(4)}°E</span> · Analysis area: {unit.areaKm2} km²
            </p>
          </div>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            style={{ fontSize: "16px", padding: "4px 10px" }}
          >
            ✕
          </button>
        </div>

        {/* Aggregate Score Strip */}
        <div
          style={{
            marginTop: "16px",
            padding: "16px",
            borderRadius: "var(--radius-md)",
            background: "var(--paper-subtle)",
            border: "1px solid var(--hairline)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
          }}
        >
          <div>
            <span className="small muted">STERI Spatial Score</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "2px" }}>
              <span className="mono" style={{ fontSize: "28px", fontWeight: 800, color: badge.color }}>
                {unit.steriScore.toFixed(3)}
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
                marginTop: "4px",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${scorePct}%`,
                  background: badge.color,
                }}
              />
            </div>
          </div>

          <div>
            <span className="small muted">Dominant Risk Driver</span>
            <strong style={{ display: "block", fontSize: "14px", marginTop: "4px", color: "var(--color-indigo)" }}>
              {unit.dominantFactorLabel}
            </strong>
            <span className="small muted" style={{ fontSize: "11px" }}>
              Sub-Score: {(unit.componentScores[unit.dominantFactor] * 100).toFixed(0)}/100
            </span>
          </div>

          <div>
            <span className="small muted">Model Confidence & Timestamp</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
              <span className="badge badge-normal" style={{ fontSize: "11px" }}>
                {(unit.confidence * 100).toFixed(0)}% Confidence
              </span>
            </div>
            <span className="small muted mono" style={{ fontSize: "10px", display: "block", marginTop: "4px" }}>
              {new Date(unit.timestamp).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Actionable Recommendation */}
        <div
          style={{
            marginTop: "14px",
            padding: "12px 14px",
            borderRadius: "var(--radius-sm)",
            background: "rgba(37, 99, 235, 0.06)",
            border: "1px solid rgba(37, 99, 235, 0.18)",
          }}
        >
          <span className="small" style={{ fontWeight: 700, color: "#2563eb", display: "block", marginBottom: "2px" }}>
            💡 Actionable Decision-Support Mitigation Recommendation:
          </span>
          <p className="small" style={{ margin: 0, color: "var(--color-slate-text)" }}>
            {unit.recommendation}
          </p>
        </div>

        {/* 6 Component Sub-Scores */}
        <div style={{ marginTop: "20px" }}>
          <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 700 }}>
            Component Sub-Score Breakdown (0.00 – 1.00)
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {(Object.keys(unit.componentScores) as Array<keyof typeof unit.componentScores>).map((key) => {
              const score = unit.componentScores[key];
              const pct = Math.round(score * 100);
              const isDominant = key === unit.dominantFactor;
              let barColor = "#0284c7";
              if (score >= 0.8) barColor = "#dc2626";
              else if (score >= 0.6) barColor = "#d97706";
              else if (score < 0.3) barColor = "#16a34a";

              return (
                <div
                  key={key}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "var(--radius-sm)",
                    background: isDominant ? "rgba(217, 119, 6, 0.06)" : "var(--paper-subtle)",
                    border: isDominant ? "1px solid rgba(217, 119, 6, 0.3)" : "1px solid var(--hairline)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span style={{ fontWeight: isDominant ? 700 : 500 }}>
                      {COMPONENT_LABELS[key]} {isDominant && "★"}
                    </span>
                    <span className="mono" style={{ fontWeight: 700, color: barColor }}>
                      {score.toFixed(2)} · {classifyRiskCategory(score)}
                    </span>
                  </div>
                  <div
                    style={{
                      height: "5px",
                      width: "100%",
                      background: "var(--hairline)",
                      borderRadius: "2.5px",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ height: "100%", width: `${pct}%`, background: barColor }} />
                  </div>
                  <p className="small muted" style={{ margin: "4px 0 0", fontSize: "10px" }}>
                    {unit.componentProvenance[key].sourceType} · {unit.componentProvenance[key].sourceDescription}
                  </p>
                  {(unit.componentProvenance[key].scenario || unit.componentProvenance[key].fallback) && (
                    <p className="small muted" style={{ margin: "3px 0 0", fontSize: "10px" }}>
                      {unit.componentProvenance[key].scenario && `Scenario: ${unit.componentProvenance[key].scenario}. `}
                      {unit.componentProvenance[key].fallback && `Fallback: ${unit.componentProvenance[key].fallback}`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: "16px", padding: "12px", border: "1px solid var(--hairline)", borderRadius: "var(--radius-sm)" }}>
          <strong style={{ fontSize: "13px" }}>Building Exposure</strong>
          <p className="small muted" style={{ margin: "4px 0 0" }}>
            {unit.buildingExposure.buildingCount} buildings · {unit.buildingExposure.label}. {unit.buildingExposure.limitation}
          </p>
        </div>

        {/* Data Provenance & Transparency */}
        <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--hairline)" }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: 700 }}>
            Data Provenance & Source Attribution
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px" }}>
            <div style={{ padding: "10px", background: "rgba(22, 163, 74, 0.05)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(22, 163, 74, 0.2)" }}>
              <span style={{ color: "#16a34a", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                OBSERVED / OPEN DATA
              </span>
              <ul style={{ margin: 0, paddingLeft: "16px", color: "var(--color-slate-text)" }}>
                {unit.provenance.realDataSources.map((src, i) => (
                  <li key={i}>{src}</li>
                ))}
              </ul>
            </div>

            <div style={{ padding: "10px", background: "rgba(2, 132, 199, 0.05)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(2, 132, 199, 0.2)" }}>
              <span style={{ color: "#0284c7", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                SIMULATED INPUTS
              </span>
              <ul style={{ margin: 0, paddingLeft: "16px", color: "var(--color-slate-text)" }}>
                {unit.provenance.simulatedDataSources.map((src, i) => (
                  <li key={i}>{src}</li>
                ))}
              </ul>
            </div>

            <div style={{ padding: "10px", background: "rgba(217, 119, 6, 0.05)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(217, 119, 6, 0.2)" }}>
              <span style={{ color: "#d97706", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                ◆ DERIVED & INTERPOLATED
              </span>
              <ul style={{ margin: 0, paddingLeft: "16px", color: "var(--color-slate-text)" }}>
                {unit.provenance.derivedDataSources.map((src, i) => (
                  <li key={i}>{src}</li>
                ))}
              </ul>
            </div>

            <div style={{ padding: "10px", background: "rgba(100, 116, 139, 0.05)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(100, 116, 139, 0.2)" }}>
              <span style={{ color: "#64748b", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                ◇ HISTORICAL BASELINES
              </span>
              <ul style={{ margin: 0, paddingLeft: "16px", color: "var(--color-slate-text)" }}>
                {unit.provenance.historicalDataSources.map((src, i) => (
                  <li key={i}>{src}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
