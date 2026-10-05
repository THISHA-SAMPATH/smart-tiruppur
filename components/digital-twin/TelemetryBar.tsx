"use client";

import React from "react";

interface TelemetryBarProps {
  unitCount: number;
  avgReuse: number;
  criticalZones: number;
  activeAlerts: number;
}

export default function TelemetryBar({
  unitCount,
  avgReuse,
  criticalZones,
  activeAlerts,
}: TelemetryBarProps) {
  return (
    <footer className="dt-footer-strip">
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ fontSize: "16px" }}>💧</div>
        <div>
          <div style={{ color: "var(--color-slate-muted)", fontSize: "10.5px", fontWeight: 700 }}>
            WATER QUALITY (NOYYAL) <span style={{ color: "var(--color-green)", marginLeft: "4px" }}>✓ LIVE</span>
          </div>
          <div style={{ fontWeight: 600, color: "var(--color-slate-text)" }}>pH 7.2 · EC 1420 µS/cm · Normal</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ fontSize: "16px" }}>🏭</div>
        <div>
          <div style={{ color: "var(--color-slate-muted)", fontSize: "10.5px", fontWeight: 700 }}>
            INDUSTRIAL COMPLIANCE <span style={{ color: "var(--color-green)", marginLeft: "4px" }}>✓ {unitCount} UNITS</span>
          </div>
          <div style={{ fontWeight: 600, color: "var(--color-slate-text)" }}>{avgReuse}% Avg Reuse · 100% ZLD</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ fontSize: "16px" }}>🌐</div>
        <div>
          <div style={{ color: "var(--color-slate-muted)", fontSize: "10.5px", fontWeight: 700 }}>
            GROUNDWATER STRESS <span style={{ color: "var(--color-amber)", marginLeft: "4px" }}>⚠ {criticalZones} CRITICAL</span>
          </div>
          <div style={{ fontWeight: 600, color: "var(--color-slate-text)" }}>6 FIRKA Zones · 62% Extraction</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ fontSize: "16px" }}>📜</div>
        <div>
          <div style={{ color: "var(--color-slate-muted)", fontSize: "10.5px", fontWeight: 700 }}>
            GREEN LEDGER INTEGRITY <span style={{ color: "var(--color-green)", marginLeft: "4px" }}>✓ VERIFIED</span>
          </div>
          <div style={{ fontWeight: 600, color: activeAlerts > 0 ? "var(--color-red)" : "var(--color-green)" }}>
            SHA-256 Active · {activeAlerts} Anomaly
          </div>
        </div>
      </div>
    </footer>
  );
}
