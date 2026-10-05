"use client";

import React from "react";
import Link from "next/link";
import type { SelectedNodeInfo } from "../Terrain3DViewer";
import DataProvenanceCard from "@/components/provenance/DataProvenanceCard";

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

        {/* STERI ENVIRONMENTAL RISK SECTOR INSPECTOR */}
        {selectedNode.type === "steri_risk" && (
          <>
            <div className="dt-card-surface" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-indigo)" }}>STERI AGGREGATE SCORE</span>
                <span style={{ fontSize: "10px", color: "var(--color-slate-muted)" }}>
                  Updated {selectedNode.timestamp ? new Date(selectedNode.timestamp).toLocaleTimeString() : "Live"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span style={{ fontSize: "28px", fontWeight: 800, fontFamily: "monospace", color: "var(--color-indigo)" }}>
                  {selectedNode.steriScore?.toFixed(3) || "0.740"}
                </span>
                <span style={{ fontSize: "12px", color: "var(--color-slate-muted)" }}>/ 1.000</span>
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--color-slate-text)" }}>
                Dominant Factor: <strong>{selectedNode.dominantFactorLabel}</strong>
              </div>
            </div>

            {/* 6 Component Sub-Scores */}
            {selectedNode.componentScores && (
              <div className="dt-card-surface" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--color-slate-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Component Contributions (0.00 – 1.00)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11px" }}>
                  <div style={{ background: "rgba(255,255,255,0.04)", padding: "4px 6px", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--color-slate-muted)" }}>Pollution:</span>
                    <strong style={{ fontFamily: "monospace", color: "var(--color-cyan)" }}>{(selectedNode.componentScores.pollution * 100).toFixed(0)}%</strong>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.04)", padding: "4px 6px", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--color-slate-muted)" }}>Water Quality:</span>
                    <strong style={{ fontFamily: "monospace", color: "var(--color-cyan)" }}>{(selectedNode.componentScores.waterQuality * 100).toFixed(0)}%</strong>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.04)", padding: "4px 6px", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--color-slate-muted)" }}>Flood Risk:</span>
                    <strong style={{ fontFamily: "monospace", color: "var(--color-cyan)" }}>{(selectedNode.componentScores.flood * 100).toFixed(0)}%</strong>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.04)", padding: "4px 6px", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--color-slate-muted)" }}>Groundwater:</span>
                    <strong style={{ fontFamily: "monospace", color: "var(--color-cyan)" }}>{(selectedNode.componentScores.groundwater * 100).toFixed(0)}%</strong>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.04)", padding: "4px 6px", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--color-slate-muted)" }}>Industrial Load:</span>
                    <strong style={{ fontFamily: "monospace", color: "var(--color-cyan)" }}>{(selectedNode.componentScores.industrialPressure * 100).toFixed(0)}%</strong>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.04)", padding: "4px 6px", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--color-slate-muted)" }}>Complaints:</span>
                    <strong style={{ fontFamily: "monospace", color: "var(--color-cyan)" }}>{(selectedNode.componentScores.complaintIntensity * 100).toFixed(0)}%</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendation & Confidence */}
            <div className="dt-card-surface" style={{ background: "rgba(37, 99, 235, 0.1)", borderColor: "rgba(37, 99, 235, 0.3)" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#38bdf8", marginBottom: "4px" }}>
                💡 DECISION SUPPORT RECOMMENDATION ({(selectedNode.confidence ? selectedNode.confidence * 100 : 90).toFixed(0)}% Confidence)
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--color-slate-text)", lineHeight: 1.5 }}>
                {selectedNode.recommendation || "Maintain continuous environmental monitoring and routine GIS telemetry surveillance."}
              </div>
            </div>

            {/* Expandable Risk Methodology Section */}
            <details className="dt-card-surface" style={{ cursor: "pointer" }}>
              <summary style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-indigo)" }}>
                📐 Risk Methodology Explanation
              </summary>
              <div style={{ fontSize: "11px", color: "var(--color-slate-muted)", marginTop: "8px", lineHeight: 1.5 }}>
                STERI combines 6 weighted spatial indicators into a multi-criteria score:
                <div style={{ fontFamily: "monospace", fontSize: "10px", background: "rgba(0,0,0,0.3)", padding: "6px", borderRadius: "4px", margin: "6px 0", color: "#38bdf8" }}>
                  STERI_i = wp*Pollution + ww*WaterQuality + wf*Flood + wg*Groundwater + wi*Industry + wc*Complaints
                </div>
                Aggregates real IoT hardware telemetry, 2D hydrodynamic flood models, Bayesian source attribution, and CGWB piezometer baselines.
              </div>
            </details>

            <Link
              href="/steri"
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
              Open STERI Research Module →
            </Link>
          </>
        )}

        {/* UNIFIED DATA PROVENANCE & UNCERTAINTY CARD */}
        <DataProvenanceCard objectId={selectedNode.id} objectType={selectedNode.type} />
      </div>
    </div>
  );
}
