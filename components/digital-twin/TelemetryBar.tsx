"use client";

import React, { useState } from "react";
import SourceBadge from "@/components/provenance/SourceBadge";
import { verifyChain } from "@/lib/evidence/ledger";

interface TelemetryBarProps {
  unitCount: number;
  avgReuse: number;
  criticalZones: number;
  activeAlerts: number;
  isScenarioMode?: boolean;
}

export default function TelemetryBar({
  unitCount,
  avgReuse,
  criticalZones,
  activeAlerts,
  isScenarioMode = false,
}: TelemetryBarProps) {
  const ledgerValid = verifyChain([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState("1x");

  return (
    <footer className="dt-footer-strip" role="region" aria-label="Telemetry and Controls Strip">
      {/* 4 TELEMETRY CHIPS */}
      <div className="dt-telemetry-chip">
        <div>
          <div style={{ color: "var(--ink-soft)", fontSize: "10px", fontWeight: 700, display: "flex", gap: "4px", alignItems: "center" }}>
            NOYYAL RIVER <SourceBadge type="SIMULATED" />
          </div>
          <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: "11.5px" }}>
            Synthetic demo flow & plume
          </div>
        </div>
      </div>

      <div className="dt-telemetry-chip">
        <div>
          <div style={{ color: "var(--ink-soft)", fontSize: "10px", fontWeight: 700, display: "flex", gap: "4px", alignItems: "center" }}>
            INDUSTRIAL SCENARIO <SourceBadge type="SIMULATED" />
          </div>
          <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: "11.5px" }}>
            <span className="dt-telemetry-num">{unitCount}</span> {unitCount === 1 ? "unit" : "units"} · <span className="dt-telemetry-num">{avgReuse}%</span> reuse
          </div>
        </div>
      </div>

      <div className="dt-telemetry-chip">
        <div>
          <div style={{ color: "var(--ink-soft)", fontSize: "10px", fontWeight: 700, display: "flex", gap: "4px", alignItems: "center" }}>
            GROUNDWATER STRESS <SourceBadge type="MODELLED" />
          </div>
          <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: "11.5px" }}>
            <span className="dt-telemetry-num">{criticalZones}</span> {criticalZones === 1 ? "FIRKA zone" : "FIRKA zones"}
          </div>
        </div>
      </div>

      <div className="dt-telemetry-chip">
        <div>
          <div style={{ color: "var(--ink-soft)", fontSize: "10px", fontWeight: 700, display: "flex", gap: "4px", alignItems: "center" }}>
            ALERT LEDGER <SourceBadge type="MODELLED" />
          </div>
          <div style={{ fontWeight: 600, color: ledgerValid ? "var(--teal)" : "var(--risk-5)", fontSize: "11.5px" }}>
            <span className="dt-telemetry-num">{activeAlerts}</span> {activeAlerts === 1 ? "alert" : "alerts"}
          </div>
        </div>
      </div>

      {/* SCENARIO SCRUBBER CONTROLS (IF SCENARIO MODE ACTIVE) */}
      {isScenarioMode && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", borderLeft: "2px solid var(--hairline)", paddingLeft: "12px" }}>
          <button
            type="button"
            className="dt-btn"
            style={{ padding: "3px 8px", fontSize: "11px" }}
            aria-label="Step Backward"
          >
            ⏮
          </button>
          <button
            type="button"
            className={`dt-btn ${isPlaying ? "active" : ""}`}
            style={{ padding: "3px 10px", fontSize: "11px" }}
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? "Pause Scenario" : "Play Scenario"}
          >
            {isPlaying ? "⏸ Pause" : "▶ Play"}
          </button>
          <button
            type="button"
            className="dt-btn"
            style={{ padding: "3px 8px", fontSize: "11px" }}
            aria-label="Step Forward"
          >
            ⏭
          </button>
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(e.target.value)}
            aria-label="Playback Speed"
            style={{
              background: "var(--paper-raised)",
              color: "var(--ink)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-sm)",
              padding: "2px 6px",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            <option value="1x">1x</option>
            <option value="2x">2x</option>
            <option value="5x">5x</option>
          </select>
        </div>
      )}
    </footer>
  );
}
