"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
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
  const outfall = industrialSelection?.outfall;
  const sourceStrength = industrialSelection?.sourceStrength;
  const normalizedSourceStrength = industrialSelection?.normalizedSourceStrength;
  const sensorSelection = selectedNode.type === "sensor" ? selectedNode.raw : null;

  const sourceType: SourceType =
    selectedNode.type === "terrain" || selectedNode.type === "steri_risk"
      ? "MODELLED"
      : selectedNode.type === "road" || selectedNode.type === "building"
      ? "HISTORICAL"
      : "SIMULATED";

  const getStatusChipStyle = (status?: string) => {
    switch (status) {
      case "INVESTIGATE":
      case "CRITICAL":
        return { color: "#b91c1c", background: "#fee2e2", border: "1px solid #fca5a5" };
      case "WARNING":
      case "VERY HIGH":
      case "HIGH":
      case "MODERATE":
      case "SEMI-CRITICAL":
      case "OVER-EXPLOITED":
        return { color: "#b45309", background: "#fef3c7", border: "1px solid #fde68a" };
      case "SAFE":
      case "COMPLIANT":
      case "NORMAL":
        return { color: "#15803d", background: "#dcfce7", border: "1px solid #86efac" };
      default:
        return { color: "#0f766e", background: "#ccfbf1", border: "1px solid #99f6e4" };
    }
  };

  const getStatusColor = (status?: string) => getStatusChipStyle(status).color;

  return (
    <aside
      className="dt-panel-right"
      role="region"
      aria-label="Entity Inspector Panel"
      tabIndex={-1}
      style={{
        width: "320px",
        maxHeight: "calc(100vh - 120px)",
        overflowY: "auto",
      }}
    >
      {/* PANEL HEADER WITH CLOSE BUTTON */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <div className="dt-section-title" style={{ borderBottom: "none", margin: 0, fontSize: "11px" }}>
          CONTEXTUAL INSPECTOR
        </div>
        <button
          type="button"
          aria-label="Close Inspector"
          style={{ background: "transparent", border: "none", color: "var(--ink-soft)", cursor: "pointer", fontSize: "15px", padding: "2px 6px" }}
          onClick={handleClose}
        >
          ✕
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {/* ENTITY HEADER CARD */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>{selectedNode.name}</div>
          <div style={{ fontSize: "11px", color: "var(--ink-soft)", display: "flex", gap: "6px", alignItems: "center" }}>
            <span>{selectedNode.designation}</span>
            <SourceBadge type={sourceType} />
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* 1. INDUSTRIAL SOURCE INSPECTOR                                    */}
        {/* ------------------------------------------------------------------ */}
        {industrialSelection && (
          <>
            <div className="dt-card-surface" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase" }}>Source Metrics</span>
                <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 6px", borderRadius: "var(--radius-sm)", ...getStatusChipStyle(selectedNode.status) }}>
                  {selectedNode.status || "COMPLIANT"}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11.5px", fontFamily: "JetBrains Mono, monospace" }}>
                <div>
                  <span style={{ color: "var(--ink-soft)", fontSize: "10px", display: "block" }}>TYPE</span>
                  <strong style={{ color: "var(--ink)" }}>{unit?.type || selectedNode.designation || "Dyeing"}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--ink-soft)", fontSize: "10px", display: "block" }}>FLOW</span>
                  <strong style={{ color: "var(--ink)" }}>{unit?.flow ?? "—"} L/s</strong>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <span style={{ color: "var(--ink-soft)", fontSize: "10px", display: "block" }}>SOURCE STRENGTH</span>
                  <strong style={{ color: "var(--teal)" }}>
                    {sourceStrength ? `${sourceStrength.toFixed(0)} (${(normalizedSourceStrength! * 100).toFixed(0)}% Index)` : "—"}
                  </strong>
                </div>
              </div>
            </div>

            {/* PRIMARY ACTION BUTTONS */}
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                className="dt-btn active"
                style={{ flex: 1, padding: "6px", fontSize: "10.5px", fontWeight: 700, background: "var(--teal)", color: "#ffffff", borderColor: "var(--teal)", textAlign: "center" }}
                onClick={() => onTraceToRiver?.(unit?.unit_id || selectedNode.id)}
              >
                🌊 Trace to River
              </button>
              <button
                type="button"
                className="dt-btn"
                style={{ flex: 1, padding: "6px", fontSize: "10.5px", fontWeight: 700, textAlign: "center" }}
                onClick={() => onShowDownstreamSensors?.(unit?.unit_id || selectedNode.id)}
              >
                📡 Downstream Sensors
              </button>
            </div>
          </>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* 2. SENSOR NODE INSPECTOR                                          */}
        {/* ------------------------------------------------------------------ */}
        {sensorSelection && (
          <div className="dt-card-surface" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase" }}>
              Station Telemetry
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11.5px", fontFamily: "JetBrains Mono, monospace" }}>
              <div>
                <span style={{ color: "var(--ink-soft)", fontSize: "10px", display: "block" }}>pH</span>
                <strong style={{ color: "var(--ink)" }}>{sensorSelection.ph}</strong>
              </div>
              <div>
                <span style={{ color: "var(--ink-soft)", fontSize: "10px", display: "block" }}>EC</span>
                <strong style={{ color: "var(--ink)" }}>{sensorSelection.ec} µS/cm</strong>
              </div>
              <div>
                <span style={{ color: "var(--ink-soft)", fontSize: "10px", display: "block" }}>TURBIDITY</span>
                <strong style={{ color: "var(--ink)" }}>{sensorSelection.turbidity} NTU</strong>
              </div>
              <div>
                <span style={{ color: "var(--ink-soft)", fontSize: "10px", display: "block" }}>FLOW</span>
                <strong style={{ color: "var(--ink)" }}>{sensorSelection.flow} L/s</strong>
              </div>
            </div>
            <div style={{ marginTop: "4px", paddingTop: "4px", borderTop: "1px dashed var(--hairline)", fontSize: "11px", color: "var(--teal)", fontWeight: 600 }}>
              Relative Source Influence: {(sensorSelection.simulatedSourceInfluence * 100).toFixed(0)}%
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* 3. STERI ENVIRONMENTAL RISK SECTOR INSPECTOR                       */}
        {/* ------------------------------------------------------------------ */}
        {selectedNode.type === "steri_risk" && (
          <>
            <div className="dt-card-surface" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase" }}>STERI RISK INDEX</span>
                <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 6px", borderRadius: "var(--radius-sm)", ...getStatusChipStyle(selectedNode.riskCategory) }}>
                  {selectedNode.riskCategory}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span style={{ fontSize: "24px", fontWeight: 800, fontFamily: "JetBrains Mono, monospace", color: getStatusColor(selectedNode.riskCategory) }}>
                  {selectedNode.steriScore?.toFixed(3) ?? "—"}
                </span>
                <span style={{ fontSize: "11px", color: "var(--ink-soft)" }}>/ 1.000</span>
                {selectedNode.scenarioDelta !== undefined && selectedNode.scenarioDelta !== 0 && (
                  <span style={{ fontSize: "10.5px", fontWeight: 700, color: selectedNode.scenarioDelta > 0 ? "var(--risk-5)" : "var(--teal)", marginLeft: "auto" }}>
                    {selectedNode.scenarioDelta > 0 ? "+" : ""}{selectedNode.scenarioDelta.toFixed(3)} vs baseline
                  </span>
                )}
              </div>
              <div style={{ fontSize: "11px", color: "var(--ink)" }}>
                Dominant Factor: <strong>{selectedNode.dominantFactorLabel}</strong>
              </div>
            </div>

            {/* SIX EXISTING COMPONENT CONTRIBUTIONS */}
            {selectedNode.componentScores && (
              <div className="dt-card-surface" style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Component Contributions (6 Factors)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", fontSize: "10.5px" }}>
                  <div style={{ background: "var(--paper)", padding: "3px 5px", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink-soft)" }}>Pollution:</span>
                    <strong style={{ fontFamily: "JetBrains Mono, monospace" }}>{(selectedNode.componentScores.pollution * 100).toFixed(0)}%</strong>
                  </div>
                  <div style={{ background: "var(--paper)", padding: "3px 5px", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink-soft)" }}>Water Quality:</span>
                    <strong style={{ fontFamily: "JetBrains Mono, monospace" }}>{(selectedNode.componentScores.waterQuality * 100).toFixed(0)}%</strong>
                  </div>
                  <div style={{ background: "var(--paper)", padding: "3px 5px", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink-soft)" }}>Flood Risk:</span>
                    <strong style={{ fontFamily: "JetBrains Mono, monospace" }}>{(selectedNode.componentScores.flood * 100).toFixed(0)}%</strong>
                  </div>
                  <div style={{ background: "var(--paper)", padding: "3px 5px", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink-soft)" }}>Groundwater:</span>
                    <strong style={{ fontFamily: "JetBrains Mono, monospace" }}>{(selectedNode.componentScores.groundwater * 100).toFixed(0)}%</strong>
                  </div>
                  <div style={{ background: "var(--paper)", padding: "3px 5px", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink-soft)" }}>Industrial:</span>
                    <strong style={{ fontFamily: "JetBrains Mono, monospace" }}>{((selectedNode.componentScores.industrialPressure ?? 0.7) * 100).toFixed(0)}%</strong>
                  </div>
                  <div style={{ background: "var(--paper)", padding: "3px 5px", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink-soft)" }}>Complaints:</span>
                    <strong style={{ fontFamily: "JetBrains Mono, monospace" }}>{((selectedNode.componentScores.complaintIntensity ?? 0.6) * 100).toFixed(0)}%</strong>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* 4. ORDINARY OSM BUILDING INSPECTOR (COMPACT CARD ONLY)              */}
        {/* ------------------------------------------------------------------ */}
        {selectedNode.type === "building" && (
          <div className="dt-card-surface" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase" }}>Building Footprint Info</span>
              <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "var(--radius-sm)", background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1" }}>
                OPEN_DATA
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "11.5px" }}>
              <div>
                <span style={{ color: "var(--ink-soft)", fontSize: "10px", display: "block" }}>BUILDING NAME / ID</span>
                <strong style={{ color: "var(--ink)" }}>{selectedNode.name || "OSM Building Footprint"}</strong>
              </div>
              <div>
                <span style={{ color: "var(--ink-soft)", fontSize: "10px", display: "block" }}>BUILDING TYPE</span>
                <strong style={{ color: "var(--ink)" }}>{selectedNode.designation || "Building footprint"}</strong>
              </div>
              <div>
                <span style={{ color: "var(--ink-soft)", fontSize: "10px", display: "block" }}>DATA SOURCE</span>
                <strong style={{ color: "var(--ink)" }}>OpenStreetMap</strong>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* COLLAPSIBLE DATA & MODEL SECTION                                  */}
        {/* ------------------------------------------------------------------ */}
        <div style={{ marginTop: "4px" }}>
          <button
            type="button"
            className="dt-btn"
            style={{ width: "100%", justifyContent: "space-between", fontSize: "11px", fontWeight: 700, padding: "5px 8px" }}
            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          >
            <span>📜 Data & Model Provenance</span>
            <span>{isDetailsOpen ? "▲" : "▼"}</span>
          </button>

          {isDetailsOpen && (
            <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {sensorSelection && <AttributionList stationId={sensorSelection.sensor_id} />}
              {industrialSelection && (
                <button
                  type="button"
                  className="dt-btn"
                  style={{ width: "100%", textAlign: "center", background: "var(--teal-soft)", color: "var(--teal)", borderColor: "var(--teal)", fontSize: "11px" }}
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
