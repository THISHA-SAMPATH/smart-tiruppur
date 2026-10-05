"use client";

import React from "react";
import { SteriWeights } from "@/lib/steri/types";
import { DEFAULT_STERI_WEIGHTS, COMPONENT_LABELS } from "@/lib/steri/calculator";

interface SteriWeightAdjusterProps {
  weights: SteriWeights;
  onChangeWeights: (newWeights: SteriWeights) => void;
  onResetDefaults: () => void;
}

export default function SteriWeightAdjuster({
  weights,
  onChangeWeights,
  onResetDefaults,
}: SteriWeightAdjusterProps) {
  const handleSliderChange = (key: keyof SteriWeights, val: number) => {
    onChangeWeights({
      ...weights,
      [key]: val,
    });
  };

  const keys: Array<keyof SteriWeights> = [
    "pollution",
    "waterQuality",
    "flood",
    "groundwater",
    "industrialPressure",
    "complaintIntensity",
  ];

  const totalRaw = keys.reduce((acc, k) => acc + weights[k], 0);

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
            Configurable Multi-Criteria Weights (w_k)
          </h3>
          <p className="muted small" style={{ margin: "2px 0 0 0" }}>
            Adjust weights to test research hypotheses or sensitivity analysis. Weights auto-normalize to 1.0.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onResetDefaults}
          style={{ fontSize: "12px", padding: "4px 10px" }}
        >
          🔄 Reset Defaults
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginTop: "16px" }}>
        {keys.map((key) => {
          const rawVal = weights[key];
          const normalizedPct = Math.round((rawVal / (totalRaw || 1)) * 100);
          return (
            <div
              key={key}
              style={{
                background: "var(--paper-subtle)",
                padding: "12px 14px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--hairline)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
                <span style={{ fontWeight: 600 }}>{COMPONENT_LABELS[key]}</span>
                <span className="mono" style={{ fontWeight: 700, color: "var(--color-indigo)" }}>
                  {rawVal.toFixed(2)} ({normalizedPct}%)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.01"
                value={rawVal}
                onChange={(e) => handleSliderChange(key, parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "var(--color-indigo)", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }} className="muted mono">
                <span>0.00 (Off)</span>
                <span>0.25 (Standard)</span>
                <span>0.50 (Max)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
