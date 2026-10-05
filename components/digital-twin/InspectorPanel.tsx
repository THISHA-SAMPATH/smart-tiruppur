"use client";

import React from "react";
import Link from "next/link";
import type { SelectedNodeInfo } from "../Terrain3DViewer";

interface InspectorPanelProps {
  selectedNode: SelectedNodeInfo | null;
  onClose: () => void;
  onOpenProvenance: () => void;
}

export default function InspectorPanel({
  selectedNode,
  onClose,
  onOpenProvenance,
}: InspectorPanelProps) {
  if (!selectedNode) {
    return (
      <div className="dt-panel-right">
        <div className="dt-section-title">CONTEXTUAL INSPECTOR</div>
        <div style={{ padding: "28px 0", textAlign: "center", color: "var(--color-slate-muted)" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>🌐</div>
          <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--color-slate-text)" }}>Select any Object or Terrain</div>
          <div style={{ fontSize: "12px", marginTop: "4px", lineHeight: 1.5 }}>
            Click an industrial facility, river station, groundwater zone, or terrain surface for instant elevation & GIS telemetry.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dt-panel-right">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div className="dt-section-title">CONTEXTUAL INSPECTOR</div>
        <button
          type="button"
          style={{ background: "transparent", border: "none", color: "var(--color-slate-muted)", cursor: "pointer", fontSize: "14px" }}
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff" }}>{selectedNode.name}</div>
          <div style={{ fontSize: "12px", color: "var(--color-teal)", marginTop: "2px" }}>{selectedNode.designation}</div>
        </div>

        {/* Status Badge */}
        <div className="dt-card-surface" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "var(--color-slate-muted)", fontWeight: 600 }}>STATUS</span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color:
                selectedNode.status === "INVESTIGATE"
                  ? "var(--color-red)"
                  : selectedNode.status === "WARNING"
                  ? "var(--color-amber)"
                  : "var(--color-green)",
            }}
          >
            {selectedNode.statusSymbol || "●"} {selectedNode.status || "NORMAL"}
          </span>
        </div>

        {/* Coordinates */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div className="dt-card-surface">
            <div style={{ fontSize: "10px", color: "var(--color-slate-muted)" }}>LATITUDE</div>
            <div style={{ fontSize: "12px", fontWeight: 600, fontFamily: "monospace" }}>{selectedNode.latitude?.toFixed(4)}° N</div>
          </div>
          <div className="dt-card-surface">
            <div style={{ fontSize: "10px", color: "var(--color-slate-muted)" }}>LONGITUDE</div>
            <div style={{ fontSize: "12px", fontWeight: 600, fontFamily: "monospace" }}>{selectedNode.longitude?.toFixed(4)}° E</div>
          </div>
        </div>

        {/* TERRAIN ELEVATION INSPECTOR (FIX #23) */}
        {selectedNode.type === "terrain" && (
          <div className="dt-card-surface" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-teal)" }}>TOPOGRAPHIC ELEVATION DATA</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
              <div>Elevation: <strong style={{ color: "var(--color-green)" }}>~{selectedNode.elevationMeters} m ASL</strong></div>
              <div>FIRKA: <strong style={{ color: "var(--color-slate-text)" }}>{selectedNode.firkaName}</strong></div>
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--color-slate-muted)", marginTop: "4px" }}>
              Drainage Basin: <strong>{selectedNode.drainageBasin}</strong>
            </div>
          </div>
        )}

        {/* INDUSTRIAL FACILITY TELEMETRY & TIMESTAMPS (FIX #35 & FIX #36) */}
        {selectedNode.type === "unit" && (
          <>
            <div className="dt-card-surface" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-slate-muted)" }}>ENVIRONMENTAL TELEMETRY</span>
                <span style={{ fontSize: "10px", color: "var(--color-green)", fontWeight: 600 }}>Updated 19:23:04</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
                <div>pH: <strong style={{ color: "var(--color-green)" }}>{selectedNode.ph || 6.8}</strong></div>
                <div>EC: <strong style={{ color: "var(--color-teal)" }}>{selectedNode.ec || 2850} µS/cm</strong></div>
                <div>Turbidity: <strong style={{ color: "var(--color-amber)" }}>{selectedNode.turbidity || 45} NTU</strong></div>
                <div>Flow: <strong style={{ color: "var(--color-slate-text)" }}>{selectedNode.flowRate || 128} L/s</strong></div>
              </div>
            </div>

            <div className="dt-card-surface">
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                <span style={{ color: "var(--color-slate-muted)" }}>WATER REUSE RATIO</span>
                <strong style={{ color: "var(--color-green)" }}>{selectedNode.reusePercent || 91}%</strong>
              </div>
              <div style={{ width: "100%", height: "6px", background: "var(--color-slate-border)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ width: `${selectedNode.reusePercent || 91}%`, height: "100%", background: "var(--color-green)" }} />
              </div>
            </div>

            {/* PHYSICAL DISCHARGE INCIDENT FLOW (FIX #20) */}
            {selectedNode.status === "INVESTIGATE" && (
              <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid var(--color-red)", padding: "12px", borderRadius: "8px" }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--color-red)", marginBottom: "6px" }}>
                  PHYSICAL INCIDENT FLOW JOURNEY
                </div>
                <div style={{ fontSize: "11px", color: "var(--color-slate-text)", lineHeight: 1.6 }}>
                  🏭 <strong>{selectedNode.name}</strong>
                  <br />
                  ↓ <em>Suspected Effluent Discharge</em>
                  <br />
                  🌊 <strong>Noyyal River Flow Channel</strong>
                  <br />
                  ↓ <em>Downstream Plume Arrival</em>
                  <br />
                  📊 <strong>Kasipalayam Telemetry Station</strong> (87% Confidence)
                </div>
              </div>
            )}

            {/* DATA PROVENANCE BUTTON (FIX #36) */}
            <button
              type="button"
              className="dt-btn"
              style={{ width: "100%", textAlign: "center", background: "var(--color-indigo-soft)", color: "var(--color-indigo)", borderColor: "var(--color-indigo)" }}
              onClick={onOpenProvenance}
            >
              📜 VIEW DATA PROVENANCE & LEDGER HASH
            </button>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <Link
                href={`/units/${selectedNode.id}`}
                style={{
                  textAlign: "center",
                  background: "var(--color-indigo)",
                  color: "white",
                  padding: "8px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                View DPP Passport →
              </Link>
              <Link
                href="/evidence"
                style={{
                  textAlign: "center",
                  background: "var(--color-slate-surface)",
                  color: "var(--color-slate-text)",
                  border: "1px solid var(--color-slate-border)",
                  padding: "8px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Evidence Ledger →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
