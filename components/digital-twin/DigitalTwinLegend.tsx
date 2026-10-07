"use client";

import React, { useState } from "react";
import SourceBadge from "@/components/provenance/SourceBadge";

export default function DigitalTwinLegend() {
  const [isOpen, setIsOpen] = useState(true);

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
          Map Legend
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
          {/* Risk Ramp Bar */}
          <div>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--ink-soft)", marginBottom: "3px", display: "flex", justifyContent: "space-between" }}>
              <span>NOYYAL WQI RISK RAMP</span>
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
          </div>

          <div style={{ height: "1px", background: "var(--hairline)" }} />

          {/* Marker Types */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "10.5px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "var(--teal)",
                  border: "2px solid #ffffff",
                  boxShadow: "0 0 0 1px var(--teal)",
                  display: "inline-block",
                }}
              />
              <span>Industrial Facility / Station</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "14px",
                  height: "3px",
                  borderRadius: "2px",
                  background: "linear-gradient(to right, #86efac, #b91c1c)",
                  display: "inline-block",
                }}
              />
              <span>Interpolated Stretch (River)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "14px",
                  height: "0px",
                  borderTop: "1.5px dashed var(--teal)",
                  display: "inline-block",
                }}
              />
              <span>Simulated Discharge Path</span>
            </div>
          </div>

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
