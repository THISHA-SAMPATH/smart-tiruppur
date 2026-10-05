"use client";

import React, { useState } from "react";

interface ScenarioModePanelProps {
  rainfall: number;
  dischargeLoad: number;
  riverFlow: number;
  groundwaterDraft: number;
  onChangeRainfall: (val: number) => void;
  onChangeDischargeLoad: (val: number) => void;
  onChangeRiverFlow: (val: number) => void;
  onChangeGroundwaterDraft: (val: number) => void;
  onRunScenario: () => void;
}

export default function ScenarioModePanel({
  rainfall,
  dischargeLoad,
  riverFlow,
  groundwaterDraft,
  onChangeRainfall,
  onChangeDischargeLoad,
  onChangeRiverFlow,
  onChangeGroundwaterDraft,
  onRunScenario,
}: ScenarioModePanelProps) {
  const [hasRun, setHasRun] = useState(false);

  const handleRun = () => {
    setHasRun(true);
    onRunScenario();
  };

  // Calculate Scenario Impact Comparison (Fix #29)
  const floodImpact = Math.round(((rainfall - 50) / 250) * 45);
  const pollutionImpact = Math.round(((dischargeLoad - 70) / 80) * 38);
  const gwImpact = Math.round(((groundwaterDraft - 100) / 50) * -18);

  return (
    <div className="dt-card-surface" style={{ marginTop: "12px", border: "1.5px solid var(--color-indigo)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div style={{ fontSize: "11.5px", fontWeight: 800, color: "var(--color-indigo)", letterSpacing: "0.05em" }}>
          SCENARIO SIMULATOR (DECISION SUPPORT)
        </div>
        <span style={{ fontSize: "10px", background: "var(--color-indigo-soft)", color: "var(--color-indigo)", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
          SIMULATED MODE
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "11.5px" }}>
        {/* Rainfall Slider */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-slate-muted)", marginBottom: "2px" }}>
            <span>MONSOON RAINFALL</span>
            <strong style={{ color: "var(--color-slate-text)" }}>{rainfall} mm</strong>
          </div>
          <input
            type="range"
            min="50"
            max="300"
            step="10"
            value={rainfall}
            onChange={(e) => onChangeRainfall(parseInt(e.target.value))}
            style={{ width: "100%", accentColor: "var(--color-teal)" }}
          />
        </div>

        {/* Discharge Load Slider */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-slate-muted)", marginBottom: "2px" }}>
            <span>INDUSTRIAL DISCHARGE LOAD</span>
            <strong style={{ color: "var(--color-slate-text)" }}>{dischargeLoad}%</strong>
          </div>
          <input
            type="range"
            min="70"
            max="150"
            step="5"
            value={dischargeLoad}
            onChange={(e) => onChangeDischargeLoad(parseInt(e.target.value))}
            style={{ width: "100%", accentColor: "var(--color-amber)" }}
          />
        </div>

        {/* River Flow Slider */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-slate-muted)", marginBottom: "2px" }}>
            <span>NOYYAL RIVER FLOW</span>
            <strong style={{ color: "var(--color-slate-text)" }}>{riverFlow} L/s</strong>
          </div>
          <input
            type="range"
            min="40"
            max="250"
            step="10"
            value={riverFlow}
            onChange={(e) => onChangeRiverFlow(parseInt(e.target.value))}
            style={{ width: "100%", accentColor: "var(--color-indigo)" }}
          />
        </div>

        {/* Groundwater Draft Slider */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-slate-muted)", marginBottom: "2px" }}>
            <span>GROUNDWATER EXTRACTION</span>
            <strong style={{ color: "var(--color-slate-text)" }}>{groundwaterDraft}% Base</strong>
          </div>
          <input
            type="range"
            min="80"
            max="150"
            step="5"
            value={groundwaterDraft}
            onChange={(e) => onChangeGroundwaterDraft(parseInt(e.target.value))}
            style={{ width: "100%", accentColor: "var(--color-red)" }}
          />
        </div>

        <button
          type="button"
          className="dt-btn active"
          style={{ width: "100%", marginTop: "6px", textAlign: "center", padding: "8px" }}
          onClick={handleRun}
        >
          ▶ RUN SCENARIO SIMULATION
        </button>

        {/* SCENARIO COMPARISON IMPACT (FIX #29) */}
        {hasRun && (
          <div style={{ background: "var(--color-slate-bg)", padding: "10px", borderRadius: "6px", marginTop: "8px", border: "1px solid var(--color-slate-border)" }}>
            <div style={{ fontSize: "10.5px", fontWeight: 800, color: "var(--color-amber)", marginBottom: "6px" }}>
              SCENARIO COMPARISON vs BASELINE
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", textAlign: "center", fontSize: "11px" }}>
              <div>
                <div style={{ color: "var(--color-slate-muted)", fontSize: "9.5px" }}>FLOOD RISK</div>
                <div style={{ fontWeight: 700, color: floodImpact > 0 ? "var(--color-red)" : "var(--color-green)" }}>
                  {floodImpact > 0 ? `+${floodImpact}%` : `${floodImpact}%`}
                </div>
              </div>
              <div>
                <div style={{ color: "var(--color-slate-muted)", fontSize: "9.5px" }}>POLLUTION</div>
                <div style={{ fontWeight: 700, color: pollutionImpact > 0 ? "var(--color-amber)" : "var(--color-green)" }}>
                  {pollutionImpact > 0 ? `+${pollutionImpact}%` : `${pollutionImpact}%`}
                </div>
              </div>
              <div>
                <div style={{ color: "var(--color-slate-muted)", fontSize: "9.5px" }}>GW TABLE</div>
                <div style={{ fontWeight: 700, color: gwImpact < 0 ? "var(--color-red)" : "var(--color-green)" }}>
                  {gwImpact}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
