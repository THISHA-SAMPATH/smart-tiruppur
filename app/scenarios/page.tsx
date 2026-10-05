"use client";

import React, { useState } from "react";
import { runScenarioWhatIfEngine, DEFAULT_SCENARIO_PARAMS } from "@/lib/scenarios/engine";
import { ScenarioParameters } from "@/lib/scenarios/types";

export default function ScenariosPage() {
  const [mode, setMode] = useState<"BASELINE" | "SCENARIO">("SCENARIO");
  const [params, setParams] = useState<ScenarioParameters>(DEFAULT_SCENARIO_PARAMS);

  const result = runScenarioWhatIfEngine(params, "Interactive Urban What-If Simulation");

  const handleSliderChange = (key: keyof ScenarioParameters, val: number) => {
    setParams((prev) => ({ ...prev, [key]: val }));
  };

  const loadPreset = (presetName: string) => {
    switch (presetName) {
      case "MONSOON_HIGH_LOAD":
        setParams({
          rainfallPctChange: 50,
          riverFlowPctChange: 30,
          industrialLoadPctChange: 20,
          groundwaterExtractionPctChange: -10,
          pollutionLoadPctChange: 25,
          wasteGenerationPctChange: 15,
        });
        break;
      case "DROUGHT_OVER_EXTRACTION":
        setParams({
          rainfallPctChange: -70,
          riverFlowPctChange: -50,
          industrialLoadPctChange: 0,
          groundwaterExtractionPctChange: 40,
          pollutionLoadPctChange: 10,
          wasteGenerationPctChange: 0,
        });
        break;
      case "INDUSTRIAL_SURGE":
        setParams({
          rainfallPctChange: 0,
          riverFlowPctChange: -15,
          industrialLoadPctChange: 45,
          groundwaterExtractionPctChange: 25,
          pollutionLoadPctChange: 50,
          wasteGenerationPctChange: 30,
        });
        break;
      default:
        setParams(DEFAULT_SCENARIO_PARAMS);
    }
  };

  return (
    <div className="workspace-page">
      {/* Header */}
      <header className="workspace-header">
        <div>
          <p className="eyebrow">ENVIRONMENTAL INTELLIGENCE · WHAT-IF DECISION SUPPORT</p>
          <h1>Scenario & Sensitivity Analysis Engine</h1>
          <p>
            Simulate environmental stress variations across rainfall, Noyyal baseflow, industrial processing load, and groundwater extraction to estimate citywide risk impact.
          </p>
        </div>

        {/* Mode Toggle Switch */}
        <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
          <button
            type="button"
            className={`btn ${mode === "BASELINE" ? "btn-primary" : "btn-outline"}`}
            style={{ fontSize: "13px" }}
            onClick={() => setMode("BASELINE")}
          >
            🌐 LIVE / BASELINE MODE
          </button>
          <button
            type="button"
            className={`btn ${mode === "SCENARIO" ? "btn-primary" : "btn-outline"}`}
            style={{ fontSize: "13px" }}
            onClick={() => setMode("SCENARIO")}
          >
            ⚡ SCENARIO MODE
          </button>
        </div>
      </header>

      {/* Preset Buttons */}
      {mode === "SCENARIO" && (
        <div style={{ display: "flex", gap: "8px", margin: "14px 0", flexWrap: "wrap" }}>
          <span className="small muted" style={{ alignSelf: "center", fontWeight: 700 }}>Presets:</span>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: "11px", padding: "4px 10px" }}
            onClick={() => loadPreset("MONSOON_HIGH_LOAD")}
          >
            🌩️ Monsoon + High Industrial Load
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: "11px", padding: "4px 10px" }}
            onClick={() => loadPreset("DROUGHT_OVER_EXTRACTION")}
          >
            🌵 Severe Drought & Aquifer Over-Extraction
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: "11px", padding: "4px 10px" }}
            onClick={() => loadPreset("INDUSTRIAL_SURGE")}
          >
            🏭 Industrial Production Surge (+45%)
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: "11px", padding: "4px 10px" }}
            onClick={() => setParams(DEFAULT_SCENARIO_PARAMS)}
          >
            🔄 Reset Scenario Defaults
          </button>
        </div>
      )}

      {/* Parameter Adjustment Sliders Panel */}
      {mode === "SCENARIO" && (
        <div
          className="card"
          style={{
            background: "var(--paper-raised)",
            border: "1px solid var(--hairline)",
            padding: "20px",
            borderRadius: "var(--radius-md)",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: 700 }}>
            Configure Environmental Scenario Parameters
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
            {[
              { key: "rainfallPctChange", label: "Monsoon Rainfall Rate", min: -80, max: 100, unit: "%" },
              { key: "riverFlowPctChange", label: "Noyyal River Baseflow", min: -80, max: 100, unit: "%" },
              { key: "industrialLoadPctChange", label: "Industrial Water Demand", min: -50, max: 100, unit: "%" },
              { key: "groundwaterExtractionPctChange", label: "Groundwater Borewell Extraction", min: -50, max: 100, unit: "%" },
              { key: "pollutionLoadPctChange", label: "Effluent Discharge Load", min: -50, max: 100, unit: "%" },
              { key: "wasteGenerationPctChange", label: "Municipal Waste Generation", min: -50, max: 100, unit: "%" },
            ].map((p) => {
              const val = params[p.key as keyof ScenarioParameters];
              const sign = val > 0 ? "+" : "";
              return (
                <div
                  key={p.key}
                  style={{
                    padding: "10px 12px",
                    background: "var(--paper-subtle)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--hairline)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 600 }}>{p.label}</span>
                    <span className="mono" style={{ fontWeight: 800, color: val > 0 ? "#dc2626" : val < 0 ? "#16a34a" : "inherit" }}>
                      {sign}{val}{p.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={p.min}
                    max={p.max}
                    step="5"
                    value={val}
                    onChange={(e) => handleSliderChange(p.key as keyof ScenarioParameters, parseInt(e.target.value, 10))}
                    style={{ width: "100%", accentColor: "var(--color-indigo)", cursor: "pointer" }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Matrix Table */}
      <div
        className="card"
        style={{
          background: "var(--paper-raised)",
          border: "1px solid var(--hairline)",
          padding: "20px",
          borderRadius: "var(--radius-md)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span className="badge badge-normal" style={{ fontSize: "10px", background: "rgba(14, 165, 233, 0.1)", color: "#0284c7" }}>
                ⚡ {result.modelType}
              </span>
              <span className="small muted mono" style={{ fontSize: "10px" }}>
                Engine: {result.modelVersion}
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
              Side-by-Side Risk Impact Comparison Table
            </h3>
          </div>

          <div style={{ textAlign: "right" }} className="small muted mono">
            ID: {result.scenarioId} · {new Date(result.timestamp).toLocaleTimeString()}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "var(--paper-subtle)", borderBottom: "1px solid var(--hairline)", textAlign: "left" }}>
                <th style={{ padding: "12px 16px" }}>Environmental Risk Indicator</th>
                <th style={{ padding: "12px 16px" }} className="mono">BASELINE</th>
                <th style={{ padding: "12px 16px" }} className="mono">SCENARIO</th>
                <th style={{ padding: "12px 16px" }} className="mono">DELTA (Δ)</th>
                <th style={{ padding: "12px 16px" }} className="mono">% CHANGE</th>
                <th style={{ padding: "12px 16px" }}>CATEGORY IMPACT</th>
              </tr>
            </thead>
            <tbody>
              {result.comparisons.map((c, i) => {
                const deltaSign = c.delta > 0 ? "+" : "";
                const deltaColor = c.delta > 0 ? "#dc2626" : c.delta < 0 ? "#16a34a" : "inherit";

                return (
                  <tr
                    key={i}
                    style={{
                      borderBottom: "1px solid var(--hairline)",
                      background: c.name.includes("Overall") ? "rgba(37, 99, 235, 0.05)" : "transparent",
                      fontWeight: c.name.includes("Overall") ? 700 : 400,
                    }}
                  >
                    <td style={{ padding: "12px 16px" }}>{c.name}</td>
                    <td style={{ padding: "12px 16px" }} className="mono">{c.baselineScore.toFixed(2)}</td>
                    <td style={{ padding: "12px 16px", color: deltaColor, fontWeight: 700 }} className="mono">{c.scenarioScore.toFixed(2)}</td>
                    <td style={{ padding: "12px 16px", color: deltaColor, fontWeight: 700 }} className="mono">{deltaSign}{c.delta.toFixed(2)}</td>
                    <td style={{ padding: "12px 16px", color: deltaColor, fontWeight: 700 }} className="mono">{deltaSign}{c.pctChange}%</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className="small muted">
                        {c.riskCategoryBaseline} &rarr; <strong style={{ color: deltaColor }}>{c.riskCategoryScenario}</strong>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Disclaimer Footer */}
        <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--hairline)", fontSize: "11px", color: "var(--color-slate-muted)" }}>
          ℹ️ <strong>Transparency Notice:</strong> {result.disclaimer}
        </div>
      </div>
    </div>
  );
}
