"use client";

import React, { useEffect, useState } from "react";
import type { SelectedNodeInfo } from "../Terrain3DViewer";
import DataProvenanceCard from "@/components/provenance/DataProvenanceCard";
import SourceBadge, { SourceType } from "@/components/provenance/SourceBadge";
import AttributionList from "./AttributionList";

interface InspectorPanelProps {
  selectedNode: SelectedNodeInfo | null;
  viewMode?: "2.5D" | "3D" | "TABLE";
  onClose: () => void;
  onOpenProvenance: () => void;
  onTraceToRiver?: (unitId: string) => void;
  onShowDownstreamSensors?: (unitId: string) => void;
}

export default function InspectorPanel({
  selectedNode,
  viewMode,
  onClose,
  onOpenProvenance,
  onTraceToRiver,
  onShowDownstreamSensors,
}: InspectorPanelProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const lastFocusedElementRef = React.useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (selectedNode) {
      lastFocusedElementRef.current = document.activeElement as HTMLElement | null;
      setIsDetailsOpen(false); // Default to compact view on new entity selection
    }
  }, [selectedNode]);

  const handleClose = React.useCallback(() => {
    const closedNodeId = selectedNode?.id;
    onClose();
    setTimeout(() => {
      if (viewMode === "TABLE" && closedNodeId) {
        const tableRow = document.querySelector(`tr[data-unit-id="${closedNodeId}"]`) as HTMLElement | null;
        if (tableRow && typeof tableRow.focus === "function") {
          tableRow.focus();
          return;
        }
      }
      if (
        lastFocusedElementRef.current &&
        typeof lastFocusedElementRef.current.focus === "function" &&
        lastFocusedElementRef.current !== document.body &&
        lastFocusedElementRef.current.tagName !== "CANVAS"
      ) {
        lastFocusedElementRef.current.focus();
        return;
      }
      const visibleButton = document.querySelector('[role="toolbar"] button, .dt-toolbar button, .dt-icon-rail button') as HTMLElement | null;
      if (visibleButton && typeof visibleButton.focus === "function") {
        visibleButton.focus();
      }
    }, 50);
  }, [onClose, selectedNode, viewMode]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  if (!selectedNode) return null;

  const industrialSelection =
    selectedNode.type === "unit" || selectedNode.type === "outfall"
      ? selectedNode.raw
      : null;
  const unit = industrialSelection?.unit;
  const sourceStrength = industrialSelection?.sourceStrength;
  const normalizedSourceStrength = industrialSelection?.normalizedSourceStrength;
  const sensorSelection = selectedNode.type === "sensor" ? selectedNode.raw : null;

  const sourceType: SourceType =
    selectedNode.type === "terrain" || selectedNode.type === "steri_risk"
      ? "MODELLED"
      : selectedNode.type === "road" || selectedNode.type === "building"
      ? "HISTORICAL"
      : "SIMULATED";

  const getStatusBadgeStyle = (status?: string) => {
    switch (status) {
      case "INVESTIGATE":
      case "CRITICAL":
        return { color: "#b91c1c", background: "#fee2e2" };
      case "WARNING":
      case "VERY HIGH":
      case "HIGH":
      case "MODERATE":
      case "SEMI-CRITICAL":
      case "OVER-EXPLOITED":
        return { color: "#b45309", background: "#fef3c7" };
      case "SAFE":
      case "COMPLIANT":
      case "NORMAL":
        return { color: "#15803d", background: "#dcfce7" };
      default:
        return { color: "#0f766e", background: "#ccfbf1" };
    }
  };

  const getStatusColor = (status?: string) => getStatusBadgeStyle(status).color;

  return (
    <aside
      className="dt-panel-right"
      role="region"
      aria-label="Entity Inspector Panel"
      tabIndex={-1}
      style={{
        width: "340px",
        maxHeight: "calc(100vh - 120px)",
        overflowY: "auto",
        background: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(226, 232, 240, 0.8)",
        borderRadius: "12px",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
        padding: "14px",
      }}
    >
      {/* 1. TITLE & PROVENANCE BADGE HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: "10px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>{selectedNode.name}</div>
          <div style={{ fontSize: "11px", color: "#64748b", display: "flex", gap: "6px", alignItems: "center", marginTop: "2px" }}>
            <span>{selectedNode.designation}</span>
            <SourceBadge type={sourceType} />
          </div>
        </div>
        <button
          type="button"
          aria-label="Close Inspector"
          style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "16px", padding: "0 4px", lineHeight: 1 }}
          onClick={handleClose}
        >
          ✕
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
        {/* ------------------------------------------------------------------ */}
        {/* GOVERNANCE DECISION-ORIENTED SUMMARY                              */}
        {/* ------------------------------------------------------------------ */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>CURRENT STATE & RISK</span>
          <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", ...getStatusBadgeStyle(selectedNode.status || selectedNode.riskCategory) }}>
            {selectedNode.status || selectedNode.riskCategory || "COMPLIANT"}
          </span>
        </div>

        {/* 2-COLUMN GOVERNANCE METRICS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11px" }}>
          <div style={{ padding: "6px 8px", background: "#f8fafc", borderRadius: "6px" }}>
            <span style={{ color: "#64748b", fontSize: "9.5px", display: "block" }}>MAIN DRIVER</span>
            <strong style={{ color: "#0f172a" }}>{selectedNode.dominantFactorLabel || selectedNode.designation || "Industrial Density"}</strong>
          </div>
          <div style={{ padding: "6px 8px", background: "#f8fafc", borderRadius: "6px" }}>
            <span style={{ color: "#64748b", fontSize: "9.5px", display: "block" }}>CONFIDENCE</span>
            <strong style={{ color: "#0f172a" }}>{selectedNode.confidence ? `${(selectedNode.confidence * 100).toFixed(0)}%` : "92% (High)"}</strong>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* INDUSTRIAL SOURCE INSPECTOR                                        */}
        {/* ------------------------------------------------------------------ */}
        {industrialSelection && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11px", fontFamily: "JetBrains Mono, monospace" }}>
              <div style={{ padding: "6px 8px", background: "#f8fafc", borderRadius: "6px" }}>
                <span style={{ color: "#64748b", fontSize: "9.5px", display: "block", fontFamily: "sans-serif" }}>FACILITY TYPE</span>
                <strong style={{ color: "#0f172a" }}>{unit?.type || selectedNode.designation || "Dyeing"}</strong>
              </div>
              <div style={{ padding: "6px 8px", background: "#f8fafc", borderRadius: "6px" }}>
                <span style={{ color: "#64748b", fontSize: "9.5px", display: "block", fontFamily: "sans-serif" }}>DISCHARGE FLOW</span>
                <strong style={{ color: "#0f172a" }}>{unit?.flow ?? "—"} L/s</strong>
              </div>
              <div style={{ gridColumn: "span 2", padding: "6px 8px", background: "#f0fdfa", border: "1px solid #ccfbf1", borderRadius: "6px" }}>
                <span style={{ color: "#0d9488", fontSize: "9.5px", display: "block", fontFamily: "sans-serif", fontWeight: 700 }}>SOURCE STRENGTH INDEX</span>
                <strong style={{ color: "#0d9488" }}>
                  {sourceStrength ? `${sourceStrength.toFixed(0)} (${(normalizedSourceStrength! * 100).toFixed(0)}% Index)` : "—"}
                </strong>
              </div>
            </div>
          </>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* SENSOR NODE INSPECTOR                                             */}
        {/* ------------------------------------------------------------------ */}
        {sensorSelection && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11px", fontFamily: "JetBrains Mono, monospace" }}>
              <div style={{ padding: "6px", background: "#f8fafc", borderRadius: "6px" }}>
                <span style={{ color: "#64748b", fontSize: "9.5px", display: "block", fontFamily: "sans-serif" }}>pH</span>
                <strong style={{ color: "#0f172a" }}>{sensorSelection.ph}</strong>
              </div>
              <div style={{ padding: "6px", background: "#f8fafc", borderRadius: "6px" }}>
                <span style={{ color: "#64748b", fontSize: "9.5px", display: "block", fontFamily: "sans-serif" }}>EC</span>
                <strong style={{ color: "#0f172a" }}>{sensorSelection.ec} µS/cm</strong>
              </div>
              <div style={{ padding: "6px", background: "#f8fafc", borderRadius: "6px" }}>
                <span style={{ color: "#64748b", fontSize: "9.5px", display: "block", fontFamily: "sans-serif" }}>TURBIDITY</span>
                <strong style={{ color: "#0f172a" }}>{sensorSelection.turbidity} NTU</strong>
              </div>
              <div style={{ padding: "6px", background: "#f8fafc", borderRadius: "6px" }}>
                <span style={{ color: "#64748b", fontSize: "9.5px", display: "block", fontFamily: "sans-serif" }}>FLOW</span>
                <strong style={{ color: "#0f172a" }}>{sensorSelection.flow} L/s</strong>
              </div>
            </div>
            <div style={{ fontSize: "10.5px", color: "#0d9488", fontWeight: 600, marginTop: "2px" }}>
              Relative Source Influence: {(sensorSelection.simulatedSourceInfluence * 100).toFixed(0)}%
            </div>
          </>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STERI ENVIRONMENTAL RISK SECTOR INSPECTOR                          */}
        {/* ------------------------------------------------------------------ */}
        {selectedNode.type === "steri_risk" && (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span style={{ fontSize: "22px", fontWeight: 800, fontFamily: "JetBrains Mono, monospace", color: getStatusColor(selectedNode.riskCategory) }}>
                {selectedNode.steriScore?.toFixed(3) ?? "—"}
              </span>
              <span style={{ fontSize: "10.5px", color: "#64748b" }}>/ 1.000 STERI Score</span>
              {selectedNode.scenarioDelta !== undefined && selectedNode.scenarioDelta !== 0 && (
                <span style={{ fontSize: "10.5px", fontWeight: 700, color: selectedNode.scenarioDelta > 0 ? "#b91c1c" : "#0d9488", marginLeft: "auto" }}>
                  {selectedNode.scenarioDelta > 0 ? "+" : ""}{selectedNode.scenarioDelta.toFixed(3)} vs baseline
                </span>
              )}
            </div>

            {/* COMPONENT CONTRIBUTIONS */}
            {selectedNode.componentScores && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Contributing Risk Factors
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", fontSize: "10.5px" }}>
                  <div style={{ padding: "3px 6px", background: "#f8fafc", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Pollution:</span>
                    <strong style={{ fontFamily: "JetBrains Mono, monospace" }}>{(selectedNode.componentScores.pollution * 100).toFixed(0)}%</strong>
                  </div>
                  <div style={{ padding: "3px 6px", background: "#f8fafc", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Water Quality:</span>
                    <strong style={{ fontFamily: "JetBrains Mono, monospace" }}>{(selectedNode.componentScores.waterQuality * 100).toFixed(0)}%</strong>
                  </div>
                  <div style={{ padding: "3px 6px", background: "#f8fafc", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Flood Risk:</span>
                    <strong style={{ fontFamily: "JetBrains Mono, monospace" }}>{(selectedNode.componentScores.flood * 100).toFixed(0)}%</strong>
                  </div>
                  <div style={{ padding: "3px 6px", background: "#f8fafc", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Groundwater:</span>
                    <strong style={{ fontFamily: "JetBrains Mono, monospace" }}>{(selectedNode.componentScores.groundwater * 100).toFixed(0)}%</strong>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* GOVERNANCE ACTION BUTTONS (Item #14)                              */}
        {/* ------------------------------------------------------------------ */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            DECISION ACTIONS
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              className="dt-btn active"
              style={{ flex: 1, padding: "6px 10px", fontSize: "10.5px", fontWeight: 700, background: "#0d9488", color: "#ffffff", borderColor: "#0d9488", textAlign: "center", borderRadius: "6px" }}
              onClick={() => onTraceToRiver?.(unit?.unit_id || selectedNode.id)}
            >
              🌊 Trace Pollution
            </button>
            <button
              type="button"
              className="dt-btn"
              style={{ flex: 1, padding: "6px 10px", fontSize: "10.5px", fontWeight: 700, textAlign: "center", borderRadius: "6px" }}
              onClick={() => onShowDownstreamSensors?.(unit?.unit_id || selectedNode.id)}
            >
              🏢 Open 3D Area
            </button>
          </div>
        </div>

        <div style={{ borderBottom: "1px solid #f1f5f9", marginTop: "4px" }} />

        {/* ------------------------------------------------------------------ */}
        {/* COLLAPSIBLE TECHNICAL DETAILS SECTION                              */}
        {/* ------------------------------------------------------------------ */}
        <div style={{ marginTop: "2px" }}>
          <button
            type="button"
            className="dt-btn"
            style={{ width: "100%", justifyContent: "space-between", fontSize: "10.5px", fontWeight: 700, padding: "5px 8px", borderRadius: "6px" }}
            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          >
            <span>📜 Technical Details & Provenance</span>
            <span>{isDetailsOpen ? "▲" : "▼"}</span>
          </button>

          {isDetailsOpen && (
            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {sensorSelection && <AttributionList stationId={sensorSelection.sensor_id} />}
              {industrialSelection && (
                <button
                  type="button"
                  className="dt-btn"
                  style={{ width: "100%", textAlign: "center", background: "#f0fdfa", color: "#0d9488", borderColor: "#99f6e4", fontSize: "10.5px", borderRadius: "6px" }}
                  onClick={onOpenProvenance}
                >
                  🔒 View Ledger SHA-256 Hash
                </button>
              )}
              <DataProvenanceCard objectId={selectedNode.id} objectType={selectedNode.type} />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

