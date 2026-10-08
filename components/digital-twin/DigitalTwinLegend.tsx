"use client";

import React, { useState } from "react";
import SourceBadge from "@/components/provenance/SourceBadge";

interface DigitalTwinLegendProps {
  interactionMode?: "EXPLORE" | "TRACE" | "RISK";
  isRiskActive?: boolean;
}

export default function DigitalTwinLegend({
  interactionMode = "EXPLORE",
  isRiskActive = false,
}: DigitalTwinLegendProps) {
  const [isOpen, setIsOpen] = useState(true);

  const showRiskScale = isRiskActive || interactionMode === "RISK";

  return (
    <div
      role="region"
      aria-label="Map Legend"
      style={{
        position: "absolute",
        bottom: "64px",
        left: "12px",
        zIndex: 28,
        width: "250px",
        background: "rgba(255, 255, 255, 0.95)",
        border: "1px solid var(--hairline)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-md)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: "10px 12px",
        fontSize: "11px",
        color: "var(--ink)",
        transition: "all 0.2s ease",
      }}
    >
      {/* Header with Collapsible Toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700, fontSize: "11px", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-soft)" }}>
          {interactionMode === "TRACE" ? "Pollution Trace Legend" : interactionMode === "RISK" || showRiskScale ? "STERI Risk Scale Legend" : "Explore Map Legend"}
        </div>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Collapse Map Legend" : "Expand Map Legend"}
          onClick={() => setIsOpen(!isOpen)}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--ink-soft)",
            cursor: "pointer",
            fontSize: "12px",
            padding: "2px 4px",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {isOpen ? "▼" : "▲"}
        </button>
      </div>

      {isOpen && (
        <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Risk Ramp Bar - Rendered ONLY when Risk layer or Risk Mode is active */}
          {showRiskScale && (
            <div>
              <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--ink-soft)", marginBottom: "3px", display: "flex", justifyContent: "space-between" }}>
                <span>STERI RISK INTENSITY SCALE</span>
                <span>Low → Critical</span>
              </div>
              <div
                style={{
                  height: "6px",
                  borderRadius: "3px",
                  background: "linear-gradient(to right, #86efac, #fde68a, #fdba74, #f87171, #b91c1c)",
                  border: "1px solid rgba(0,0,0,0.05)",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "var(--ink-soft)", marginTop: "2px", fontWeight: 600 }}>
                <span>0.0</span>
                <span>0.25</span>
                <span>0.50</span>
                <span>0.75</span>
                <span>1.0</span>
              </div>
              <div style={{ height: "1px", background: "var(--hairline)", marginTop: "8px" }} />
            </div>
          )}

          {/* Context-Sensitive Legend Items */}
          {interactionMode === "TRACE" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "10.5px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#0d9488", border: "2px solid #fff", boxShadow: "0 0 0 1px #0d9488" }} />
                <span>Industrial Source Facility</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "14px", height: "0px", borderTop: "2px dashed #06b6d4" }} />
                <span>Simulated Discharge Path & Outfall</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "14px", height: "3px", borderRadius: "2px", background: "#06b6d4" }} />
                <span>Noyyal Downstream Waterway Route</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ffffff", border: "2px solid #0d9488" }} />
                <span>Downstream Telemetry Sensor Station</span>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "10.5px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "14px", height: "2px", background: "#94a3b8" }} />
                <span>Roads (City Structure)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "14px", height: "4px", borderRadius: "2px", background: "#0284c7" }} />
                <span>Noyyal River (Mapped Corridor)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#64748b", border: "1px solid #475569" }} />
                <span>Building Footprints (OSM)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#0d9488", border: "2px solid #ffffff", boxShadow: "0 0 0 1px #0d9488" }} />
                <span>Industrial Facilities</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ffffff", border: "2px solid #0d9488" }} />
                <span>Sensors</span>
              </div>
            </div>
          )}

          <div style={{ height: "1px", background: "var(--hairline)" }} />

          {/* Persistent Data Tag */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "var(--ink-soft)" }}>
            <SourceBadge type="SIMULATED" />
            <span>Simulated demonstration dataset</span>
          </div>
        </div>
      )}
    </div>
  );
}
