"use client";

import React from "react";
import { ExplanationResult } from "@/lib/xai/types";

interface ExplainableRiskCardProps {
  explanation: ExplanationResult;
  titleOverride?: string;
}

export default function ExplainableRiskCard({ explanation, titleOverride }: ExplainableRiskCardProps) {
  const isShap = explanation.explanationType === "SHAP_AI_MODEL";

  return (
    <div
      className="card"
      style={{
        background: "var(--paper-raised)",
        border: "1px solid var(--hairline)",
        padding: "16px",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: "4px",
                background: isShap ? "rgba(147, 51, 234, 0.12)" : "rgba(37, 99, 235, 0.12)",
                color: isShap ? "#9333ea" : "#2563eb",
                border: isShap ? "1px solid rgba(147, 51, 234, 0.3)" : "1px solid rgba(37, 99, 235, 0.3)",
              }}
            >
              {isShap ? "🧠 SHAP AI EXPLAINABILITY" : "📊 RISK FACTOR CONTRIBUTION"}
            </span>
          </div>
          <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>
            {titleOverride || `WHY IS THIS LOCATION ${explanation.overallCategory}?`}
          </h4>
          <span className="small muted" style={{ fontSize: "11px" }}>
            Target: <strong>{explanation.targetName}</strong> · Overall Score: <strong className="mono">{(explanation.overallScore * 100).toFixed(0)}%</strong>
          </span>
        </div>

        <div style={{ textAlign: "right" }}>
          <span className="badge badge-normal" style={{ fontSize: "10px", padding: "2px 6px" }}>
            {(explanation.confidence * 100).toFixed(0)}% Confidence
          </span>
          {explanation.uncertaintyMargin && (
            <span className="small muted mono" style={{ display: "block", fontSize: "10px", marginTop: "2px" }}>
              ±{(explanation.uncertaintyMargin * 100).toFixed(1)}% Uncertainty
            </span>
          )}
        </div>
      </div>

      {/* Horizontal Contribution Bar Chart */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "14px 0" }}>
        {explanation.contributions.map((item, idx) => {
          const isPos = item.direction === "positive";
          const barColor = isShap
            ? isPos ? "#9333ea" : "#0284c7"
            : item.normalizedContribution > 25
            ? "#dc2626"
            : item.normalizedContribution > 15
            ? "#d97706"
            : "#2563eb";

          return (
            <div key={idx} style={{ fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                <span style={{ fontWeight: 600, color: "var(--color-slate-text)" }}>
                  {item.feature}
                </span>
                <div style={{ display: "flex", gap: "8px", alignItems: "baseline" }}>
                  <span className="small muted mono" style={{ fontSize: "11px" }}>
                    {item.value}
                  </span>
                  <span className="mono" style={{ fontWeight: 800, color: barColor, minWidth: "42px", textAlign: "right" }}>
                    +{item.normalizedContribution}%
                  </span>
                </div>
              </div>

              {/* Bar track */}
              <div
                style={{
                  height: "7px",
                  width: "100%",
                  background: "var(--hairline)",
                  borderRadius: "3.5px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, Math.max(2, item.normalizedContribution))}%`,
                    background: barColor,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Provenance & Calculation Version */}
      <div
        style={{
          marginTop: "12px",
          paddingTop: "8px",
          borderTop: "1px solid var(--hairline)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          fontSize: "10px",
        }}
        className="muted"
      >
        <span>
          Calculation Engine: <strong className="mono">{explanation.calculationVersion}</strong>
        </span>
        <span>
          Data Sources: <strong>{explanation.inputDataSources.length} Verified Inputs</strong>
        </span>
        <span className="mono">
          {new Date(explanation.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
