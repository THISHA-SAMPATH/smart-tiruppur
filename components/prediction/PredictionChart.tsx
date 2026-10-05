"use client";

import React from "react";
import { TimeSeriesPrediction, PredictionHorizon } from "@/lib/prediction/types";

interface PredictionChartProps {
  prediction: TimeSeriesPrediction;
  selectedHorizon: PredictionHorizon;
  onChangeHorizon: (horizon: PredictionHorizon) => void;
}

export default function PredictionChart({
  prediction,
  selectedHorizon,
  onChangeHorizon,
}: PredictionChartProps) {
  const { series, parameterName, unitOfMeasure, currentValue, predictedValue, confidenceLower95, confidenceUpper95 } = prediction;

  const allVals = series.map((s) => s.observedValue || s.predictedValue || 0);
  const minVal = Math.min(...allVals, confidenceLower95) * 0.95;
  const maxVal = Math.max(...allVals, confidenceUpper95) * 1.05;
  const range = maxVal - minVal || 1;

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
      {/* Header & Mode Badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "12px",
                background: "rgba(217, 119, 6, 0.12)",
                color: "#d97706",
                border: "1px solid rgba(217, 119, 6, 0.3)",
              }}
            >
              ⚡ {prediction.mode}
            </span>
            <span className="small muted" style={{ fontSize: "11px" }}>
              {prediction.modelProviderName} ({prediction.modelVersion})
            </span>
          </div>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
            {prediction.targetName} — {parameterName}
          </h3>
        </div>

        {/* Horizon Selector */}
        <div style={{ display: "flex", gap: "4px" }}>
          {(["+1h", "+3h", "+6h", "+24h"] as PredictionHorizon[]).map((h) => (
            <button
              key={h}
              type="button"
              className={`btn ${selectedHorizon === h ? "btn-primary" : "btn-ghost"}`}
              style={{ fontSize: "11px", padding: "4px 8px" }}
              onClick={() => onChangeHorizon(h)}
            >
              {h} Horizon
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "12px",
          margin: "16px 0",
          padding: "12px",
          background: "var(--paper-subtle)",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--hairline)",
        }}
      >
        <div>
          <span className="small muted">Current Value</span>
          <div className="mono" style={{ fontSize: "20px", fontWeight: 800 }}>
            {currentValue} <span style={{ fontSize: "11px" }}>{unitOfMeasure}</span>
          </div>
        </div>

        <div>
          <span className="small muted">Predicted ({selectedHorizon})</span>
          <div className="mono" style={{ fontSize: "20px", fontWeight: 800, color: "#d97706" }}>
            {predictedValue} <span style={{ fontSize: "11px" }}>{unitOfMeasure}</span>
          </div>
        </div>

        <div>
          <span className="small muted">95% Confidence Interval</span>
          <div className="mono" style={{ fontSize: "13px", fontWeight: 700, marginTop: "4px" }}>
            [{confidenceLower95} – {confidenceUpper95}] {unitOfMeasure}
          </div>
        </div>

        <div>
          <span className="small muted">Model Confidence</span>
          <div style={{ fontSize: "14px", fontWeight: 700, marginTop: "4px", color: "#16a34a" }}>
            {(prediction.confidence * 100).toFixed(0)}% Confidence
          </div>
        </div>
      </div>

      {/* Time-Series Chart */}
      <div style={{ marginTop: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "8px" }} className="muted">
          <span>● Historical Observations (Past 6 Hours)</span>
          <span style={{ color: "#d97706", fontWeight: 600 }}>⚡ Shaded Band: 95% Confidence Interval Forecast ({selectedHorizon})</span>
        </div>

        <div style={{ height: "160px", display: "flex", alignItems: "flex-end", gap: "8px", paddingTop: "20px", position: "relative" }}>
          {series.map((point, idx) => {
            const val = point.observedValue || point.predictedValue || minVal;
            const heightPct = Math.max(10, Math.min(100, ((val - minVal) / range) * 100));
            const isFc = point.isForecast;

            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  height: "100%",
                  justifyContent: "flex-end",
                  position: "relative",
                }}
              >
                <span className="mono" style={{ fontSize: "10px", fontWeight: 700, marginBottom: "4px", color: isFc ? "#d97706" : "var(--color-slate-text)" }}>
                  {val}
                </span>

                <div
                  style={{
                    width: "100%",
                    height: `${heightPct}%`,
                    background: isFc
                      ? "linear-gradient(180deg, rgba(217, 119, 6, 0.8) 0%, rgba(217, 119, 6, 0.2) 100%)"
                      : "var(--color-indigo)",
                    borderRadius: "3px 3px 0 0",
                    borderStyle: isFc ? "dashed" : "solid",
                    borderWidth: "1px",
                    borderColor: isFc ? "#d97706" : "var(--color-indigo)",
                  }}
                />

                <span className="small muted mono" style={{ fontSize: "9px", marginTop: "6px", whiteSpace: "nowrap" }}>
                  {point.timestamp}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
