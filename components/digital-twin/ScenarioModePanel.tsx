"use client";

import React, { useState } from "react";
import SourceBadge from "@/components/provenance/SourceBadge";

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

  // Calculate Scenario Impact Comparison
  const floodImpact = Math.round(((rainfall - 50) / 250) * 45);
  const pollutionImpact = Math.round(((dischargeLoad - 70) / 80) * 38);
  const gwImpact = Math.round(((groundwaterDraft - 100) / 50) * -18);

  return (
    <div className="dt-card-surface" style={{ marginTop: "10px", border: "1px solid var(--hairline)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>
          Scenario Simulator
        </div>
        <SourceBadge type="SIMULATED" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "11.5px" }}>
        {/* Rainfall Slider */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-soft)", marginBottom: "2px" }}>
            <span>MONSOON RAINFALL</span>
            <strong style={{ color: "var(--ink)", fontFamily: "JetBrains Mono, monospace" }}>{rainfall} mm</strong>
          </div>
          <input
            type="range"
            min="50"
            max="300"
            step="10"
            value={rainfall}
            onChange={(e) => onChangeRainfall(parseInt(e.target.value))}
            style={{ width: "100%", accentColor: "var(--teal)" }}
          />
        </div>

        {/* Discharge Load Slider */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-soft)", marginBottom: "2px" }}>
            <span>INDUSTRIAL DISCHARGE LOAD</span>
            <strong style={{ color: "var(--ink)", fontFamily: "JetBrains Mono, monospace" }}>{dischargeLoad}%</strong>
          </div>
          <input
            type="range"
            min="70"
            max="150"
            step="5"
            value={dischargeLoad}
            onChange={(e) => onChangeDischargeLoad(parseInt(e.target.value))}
            style={{ width: "100%", accentColor: "var(--teal)" }}
          />
        </div>

        {/* River Flow Slider */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-soft)", marginBottom: "2px" }}>
            <span>NOYYAL RIVER FLOW</span>
            <strong style={{ color: "var(--ink)", fontFamily: "JetBrains Mono, monospace" }}>{riverFlow} L/s</strong>
          </div>
          <input
            type="range"
            min="40"
            max="250"
            step="10"
            value={riverFlow}
            onChange={(e) => onChangeRiverFlow(parseInt(e.target.value))}
            style={{ width: "100%", accentColor: "var(--teal)" }}
          />
        </div>

        {/* Groundwater Draft Slider */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-soft)", marginBottom: "2px" }}>
            <span>GROUNDWATER EXTRACTION</span>
            <strong style={{ color: "var(--ink)", fontFamily: "JetBrains Mono, monospace" }}>{groundwaterDraft}% Base</strong>
          </div>
          <input
            type="range"
            min="80"
            max="150"
            step="5"
            value={groundwaterDraft}
            onChange={(e) => onChangeGroundwaterDraft(parseInt(e.target.value))}
            style={{ width: "100%", accentColor: "var(--teal)" }}
          />
        </div>

        <button
          type="button"
          className="dt-btn active"
          style={{ width: "100%", marginTop: "6px", textAlign: "center", padding: "8px" }}
          onClick={handleRun}
        >
          ▶ Run Scenario Simulation
        </button>

        {/* SCENARIO COMPARISON IMPACT */}
        {hasRun && (
          <div style={{ background: "var(--paper)", padding: "10px", borderRadius: "var(--radius-sm)", marginTop: "6px", border: "1px solid var(--hairline)" }}>
            <div style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--ink-soft)", marginBottom: "6px" }}>
              SCENARIO COMPARISON vs BASELINE
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", textAlign: "center", fontSize: "11px" }}>
              <div>
                <div style={{ color: "var(--ink-soft)", fontSize: "9.5px" }}>FLOOD RISK</div>
                <div style={{ fontWeight: 700, fontFamily: "JetBrains Mono, monospace", color: floodImpact > 0 ? "var(--risk-4)" : "var(--teal)" }}>
                  {floodImpact > 0 ? `+${floodImpact}%` : `${floodImpact}%`}
                </div>
              </div>
              <div>
                <div style={{ color: "var(--ink-soft)", fontSize: "9.5px" }}>POLLUTION</div>
                <div style={{ fontWeight: 700, fontFamily: "JetBrains Mono, monospace", color: pollutionImpact > 0 ? "var(--risk-3)" : "var(--teal)" }}>
                  {pollutionImpact > 0 ? `+${pollutionImpact}%` : `${pollutionImpact}%`}
                </div>
              </div>
              <div>
                <div style={{ color: "var(--ink-soft)", fontSize: "9.5px" }}>GW TABLE</div>
                <div style={{ fontWeight: 700, fontFamily: "JetBrains Mono, monospace", color: gwImpact < 0 ? "var(--risk-4)" : "var(--teal)" }}>
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
