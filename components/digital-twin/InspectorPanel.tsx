"use client";

import React, { useEffect } from "react";
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
}

export default function InspectorPanel({
  selectedNode,
  viewMode,
  onClose,
  onOpenProvenance,
}: InspectorPanelProps) {
  const lastFocusedElementRef = React.useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (selectedNode) {
      lastFocusedElementRef.current = document.activeElement as HTMLElement | null;
    }
  }, [selectedNode]);

  const handleClose = React.useCallback(() => {
    const closedNodeId = selectedNode?.id;
    onClose();
    setTimeout(() => {
      // 1. Table view mode: restore focus to the table row in Table view
      if (viewMode === "TABLE" && closedNodeId) {
        const tableRow = document.querySelector(`tr[data-unit-id="${closedNodeId}"]`) as HTMLElement | null;
        if (tableRow && typeof tableRow.focus === "function") {
          tableRow.focus();
          return;
        }
      }
      // 2. Previously focused DOM element (if valid and not canvas/body)
      if (
        lastFocusedElementRef.current &&
        typeof lastFocusedElementRef.current.focus === "function" &&
        lastFocusedElementRef.current !== document.body &&
        lastFocusedElementRef.current.tagName !== "CANVAS"
      ) {
        lastFocusedElementRef.current.focus();
        return;
      }
      // 3. In 3D/2.5D view mode: canvas markers are not focusable in DOM, move focus to a visible toolbar/panel button
      const visibleButton = document.querySelector('[role="toolbar"] button, .dt-toolbar button, .dt-icon-rail button') as HTMLElement | null;
      if (visibleButton && typeof visibleButton.focus === "function") {
        visibleButton.focus();
      }
    }, 50);
  }, [onClose, selectedNode, viewMode]);

  // ESC key listener to close inspector panel and restore focus (Item #4)
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
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <div className="dt-section-title" style={{ borderBottom: "none", margin: 0 }}>CONTEXTUAL INSPECTOR</div>
        <button
          type="button"
          aria-label="Close Inspector"
          style={{ background: "transparent", border: "none", color: "var(--ink-soft)", cursor: "pointer", fontSize: "16px", padding: "2px 6px" }}
          onClick={handleClose}
        >
          ✕
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--ink)" }}>{selectedNode.name}</div>
          <div style={{ fontSize: "12px", color: "var(--ink-soft)", marginTop: "2px", display: "flex", gap: 6, alignItems: "center" }}>
            {selectedNode.designation} <SourceBadge type={sourceType} />
          </div>
        </div>

        {/* Status Badge - Accessible WCAG AA Contrast Chip (Item #5) */}
        {selectedNode.type !== "terrain" && selectedNode.type !== "road" && selectedNode.type !== "building" && (
          <div className="dt-card-surface" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "var(--ink-soft)", fontWeight: 600 }}>STATUS</span>
            <span
              style={{
                fontSize: "11.5px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "var(--radius-sm)",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                ...getStatusChipStyle(selectedNode.status),
              }}
            >
              <span>{selectedNode.statusSymbol || "●"}</span>
              <span>{selectedNode.status || "NORMAL"}</span>
            </span>
          </div>
        )}

        {/* Coordinates */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div className="dt-card-surface">
            <div style={{ fontSize: "10px", color: "var(--ink-soft)" }}>LATITUDE</div>
            <div style={{ fontSize: "12px", fontWeight: 600, fontFamily: "JetBrains Mono, monospace" }}>
              {selectedNode.latitude?.toFixed(4)}° N
            </div>
          </div>
          <div className="dt-card-surface">
            <div style={{ fontSize: "10px", color: "var(--ink-soft)" }}>LONGITUDE</div>
            <div style={{ fontSize: "12px", fontWeight: 600, fontFamily: "JetBrains Mono, monospace" }}>
              {selectedNode.longitude?.toFixed(4)}° E
            </div>
          </div>
        </div>

        {/* TERRAIN ELEVATION INSPECTOR */}
        {selectedNode.type === "terrain" && (
          <div className="dt-card-surface" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--teal)" }}>MODELLED ELEVATION SURFACE</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
              <div>Elevation: <strong style={{ color: "var(--ink)", fontFamily: "JetBrains Mono, monospace" }}>~{selectedNode.elevationMeters} m ASL</strong></div>
              <div>FIRKA: <strong style={{ color: "var(--ink)" }}>{selectedNode.firkaName}</strong></div>
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--ink-soft)", marginTop: "4px" }}>
              Drainage Basin: <strong>{selectedNode.drainageBasin}</strong>
            </div>
          </div>
        )}

        {/* SENSOR NODE INSPECTOR */}
        {sensorSelection && (
          <div className="dt-card-surface" style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--teal)" }}>SIMULATED SENSOR NETWORK</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontFamily: "JetBrains Mono, monospace" }}>
              <div>Sensor ID: <strong>{sensorSelection.sensor_id}</strong></div>
              <div>pH: <strong>{sensorSelection.ph}</strong></div>
              <div>EC: <strong>{sensorSelection.ec} µS/cm</strong></div>
              <div>Turbidity: <strong>{sensorSelection.turbidity} NTU</strong></div>
              <div>Flow: <strong>{sensorSelection.flow} L/s</strong></div>
              <div>Distance River: <strong>{sensorSelection.distanceToRiver.toFixed(2)} km</strong></div>
            </div>
            <div style={{ fontSize: "11px", color: "var(--ink-soft)", lineHeight: 1.45 }}>
              Sensor state and source influence are synthetic demonstration values. River attachment: {sensorSelection.riverGeometrySource}.
            </div>
          </div>
        )}
        {sensorSelection && <AttributionList stationId={sensorSelection.sensor_id} />}

        {/* INDUSTRIAL SOURCE INSPECTOR */}
        {industrialSelection && unit && outfall && (
          <>
            <div className="dt-card-surface" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--teal)" }}>SIMULATED INDUSTRIAL SOURCE</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px", fontFamily: "JetBrains Mono, monospace" }}>
                <div>Unit ID: <strong>{unit.unit_id}</strong></div>
                <div>Type: <strong>{unit.type}</strong></div>
                <div>Flow: <strong>{unit.flow} L/s</strong></div>
                <div>Reuse: <strong>{unit.reuse}%</strong></div>
                <div>Outfall ID: <strong>{outfall.outfall_id}</strong></div>
                <div>Pollutant: <strong>{outfall.pollutant}</strong></div>
              </div>
            </div>
            <div className="dt-card-surface" style={{ fontSize: "12px" }}>
              <div>Source Type: <strong>{outfall.sourceType}</strong></div>
              <div style={{ marginTop: "4px" }}>Confidence: <strong style={{ fontFamily: "JetBrains Mono, monospace" }}>{(outfall.confidence * 100).toFixed(0)}%</strong></div>
              <div style={{ fontSize: "11px", color: "var(--ink-soft)", marginTop: "6px", lineHeight: 1.45 }}>
                Simulated source-to-river transport. Synthetic model inputs only; not a physically calibrated dispersion model.
              </div>
            </div>
          </>
        )}

        {/* STERI ENVIRONMENTAL RISK INSPECTOR */}
        {selectedNode.type === "steri_risk" && (
          <>
            <div className="dt-card-surface" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--teal)" }}>STERI AGGREGATE SCORE</span>
                <span style={{ fontSize: "10px", color: "var(--ink-soft)" }}>
                  {selectedNode.timestamp ? new Date(selectedNode.timestamp).toLocaleTimeString() : "on selection"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span style={{ fontSize: "26px", fontWeight: 800, fontFamily: "JetBrains Mono, monospace", color: getStatusColor(selectedNode.riskCategory) }}>
                  {selectedNode.steriScore?.toFixed(3) ?? "—"}
                </span>
                <span style={{ fontSize: "12px", color: "var(--ink-soft)" }}>/ 1.000 ({selectedNode.riskCategory})</span>
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--ink)" }}>
                Dominant Factor: <strong>{selectedNode.dominantFactorLabel}</strong>
              </div>
            </div>

            {/* Component Sub-Scores */}
            {selectedNode.componentScores && (
              <div className="dt-card-surface" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Component Contributions
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11px" }}>
                  <div style={{ background: "var(--paper)", padding: "4px 6px", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink-soft)" }}>Pollution:</span>
                    <strong style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--ink)" }}>{(selectedNode.componentScores.pollution * 100).toFixed(0)}%</strong>
                  </div>
                  <div style={{ background: "var(--paper)", padding: "4px 6px", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink-soft)" }}>Water Quality:</span>
                    <strong style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--ink)" }}>{(selectedNode.componentScores.waterQuality * 100).toFixed(0)}%</strong>
                  </div>
                  <div style={{ background: "var(--paper)", padding: "4px 6px", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink-soft)" }}>Flood Risk:</span>
                    <strong style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--ink)" }}>{(selectedNode.componentScores.flood * 100).toFixed(0)}%</strong>
                  </div>
                  <div style={{ background: "var(--paper)", padding: "4px 6px", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink-soft)" }}>Groundwater:</span>
                    <strong style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--ink)" }}>{(selectedNode.componentScores.groundwater * 100).toFixed(0)}%</strong>
                  </div>
                </div>
              </div>
            )}

            <Link
              href="/steri"
              style={{
                textAlign: "center",
                background: "var(--indigo-soft)",
                color: "var(--indigo)",
                border: "1px solid var(--hairline)",
                padding: "8px",
                borderRadius: "var(--radius-sm)",
                fontSize: "12px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Open STERI Research Module →
            </Link>
          </>
        )}

        {/* DATA PROVENANCE BUTTON FOR UNITS */}
        {industrialSelection && (
          <button
            type="button"
            className="dt-btn"
            style={{ width: "100%", textAlign: "center", background: "var(--teal-soft)", color: "var(--teal)", borderColor: "var(--teal)" }}
            onClick={onOpenProvenance}
          >
            📜 View Data Provenance & Ledger Hash
          </button>
        )}

        {/* UNIFIED DATA PROVENANCE & UNCERTAINTY CARD */}
        <DataProvenanceCard objectId={selectedNode.id} objectType={selectedNode.type} />
      </div>
    </aside>
  );
}
