"use client";

import React from "react";
import { SteriModelComparison } from "@/lib/steri/types";
import { getRiskBadgeStyle } from "./SteriCityOverviewCard";

interface SteriModelComparisonPanelProps {
  comparison: SteriModelComparison;
}

export default function SteriModelComparisonPanel({ comparison }: SteriModelComparisonPanelProps) {
  const { steriWeighted, baselineEqualWeight, maxRiskConservative, comparisonMetrics } = comparison;

  const models = [
    {
      title: "STERI Weighted Model",
      subtitle: "Multi-Criteria Configured Weights",
      score: steriWeighted.citywideScore,
      category: steriWeighted.citywideCategory,
      badge: getRiskBadgeStyle(steriWeighted.citywideCategory),
      isPrimary: true,
      description: steriWeighted.modelInfo.description,
    },
    {
      title: "Equal-Weight Baseline",
      subtitle: "Unweighted Naïve Average (w_k = 0.167)",
      score: baselineEqualWeight.citywideScore,
      category: baselineEqualWeight.citywideCategory,
      badge: getRiskBadgeStyle(baselineEqualWeight.citywideCategory),
      isPrimary: false,
      description: "Applies identical weight to all six environmental criteria regardless of local domain severity.",
    },
    {
      title: "Conservative Max-Risk",
      subtitle: "Worst-Case Vulnerability (Score = max_k S_k)",
      score: maxRiskConservative.citywideScore,
      category: maxRiskConservative.citywideCategory,
      badge: getRiskBadgeStyle(maxRiskConservative.citywideCategory),
      isPrimary: false,
      description: maxRiskConservative.modelInfo.description,
    },
  ];

  return (
    <div
      className="card"
      style={{
        background: "var(--paper-raised)",
        border: "1px solid var(--hairline)",
        padding: "20px",
        borderRadius: "var(--radius-md)",
      }}
    >
      <div style={{ marginBottom: "16px" }}>
        <span className="eyebrow" style={{ color: "var(--color-indigo)", fontWeight: 700 }}>
          ACADEMIC EVALUATION · BASELINE MODEL COMPARISON
        </span>
        <h3 style={{ margin: "2px 0 0 0", fontSize: "18px", fontWeight: 700 }}>
          Research Model Sensitivity & Variance Analysis
        </h3>
        <p className="muted small" style={{ margin: "4px 0 0 0" }}>
          Evaluating STERI multi-criteria weighted scoring against standard unweighted and conservative baseline models.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
        {models.map((m, i) => (
          <div
            key={i}
            style={{
              padding: "16px",
              borderRadius: "var(--radius-md)",
              background: m.isPrimary ? "rgba(37, 99, 235, 0.05)" : "var(--paper-subtle)",
              border: m.isPrimary ? "1px solid rgba(37, 99, 235, 0.25)" : "1px solid var(--hairline)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: m.isPrimary ? "#2563eb" : "inherit" }}>
                {m.title}
              </span>
              {m.isPrimary && (
                <span className="badge badge-normal" style={{ fontSize: "9px", padding: "1px 5px", background: "rgba(37, 99, 235, 0.15)", color: "#2563eb" }}>
                  Active
                </span>
              )}
            </div>

            <p className="small muted" style={{ fontSize: "11px", margin: "2px 0 8px 0" }}>
              {m.subtitle}
            </p>

            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", margin: "8px 0" }}>
              <span className="mono" style={{ fontSize: "24px", fontWeight: 800, color: m.badge.color }}>
                {m.score.toFixed(3)}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: "var(--radius-sm)",
                  background: m.badge.bg,
                  color: m.badge.color,
                }}
              >
                {m.category}
              </span>
            </div>

            <p className="small muted" style={{ fontSize: "11px", margin: 0 }}>
              {m.description}
            </p>
          </div>
        ))}
      </div>

      {/* Variance Analysis Box */}
      <div
        style={{
          marginTop: "16px",
          padding: "12px 14px",
          borderRadius: "var(--radius-sm)",
          background: "rgba(217, 119, 6, 0.06)",
          border: "1px solid rgba(217, 119, 6, 0.2)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <span style={{ fontSize: "18px" }}>📊</span>
        <div>
          <span className="small" style={{ fontWeight: 700, color: "#d97706", display: "block" }}>
            Model Variance Insight:
          </span>
          <span className="small muted" style={{ fontSize: "12px" }}>
            {comparisonMetrics.explanation} Baseline max-risk sensitivity detects potential local underestimation when using simple equal weighting.
          </span>
        </div>
      </div>
    </div>
  );
}
