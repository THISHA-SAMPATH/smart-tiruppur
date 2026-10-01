"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Terrain3DViewer, {
  LightingPreset,
  CameraViewPreset,
  SelectedNodeInfo,
} from "@/components/Terrain3DViewer";
import { getGlobalEvents, getUnitLedger, getUnitDpp } from "@/lib/api";
import type { ContractEvent, LedgerEntry, DppResponse } from "@/lib/types";

export default function Terrain3DPage() {
  const [lighting, setLighting] = useState<LightingPreset>("night");
  const [viewPreset, setViewPreset] = useState<CameraViewPreset>("overview");
  const [autoRotate, setAutoRotate] = useState(false);
  const [livePolling, setLivePolling] = useState(true);
  const [tourActive, setTourActive] = useState(false);

  // Inspector Panel State
  const [selectedNode, setSelectedNode] = useState<SelectedNodeInfo | null>(null);
  const [nodeLedger, setNodeLedger] = useState<LedgerEntry[]>([]);
  const [nodeDpp, setNodeDpp] = useState<DppResponse | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Live Event Stream
  const [recentEvents, setRecentEvents] = useState<ContractEvent[]>([]);

  // Initial load of global events
  useEffect(() => {
    void (async () => {
      const res = await getGlobalEvents();
      if (res.data) {
        setRecentEvents(res.data.slice(0, 8));
      }
    })();
  }, []);

  // Fetch node history when a node is selected in 3D scene
  useEffect(() => {
    if (!selectedNode) {
      setNodeLedger([]);
      setNodeDpp(null);
      return;
    }

    if (selectedNode.type === "unit") {
      setLoadingDetails(true);
      void (async () => {
        const [ledgerRes, dppRes] = await Promise.all([
          getUnitLedger(selectedNode.id),
          getUnitDpp(selectedNode.id),
        ]);
        if (ledgerRes.data) setNodeLedger(ledgerRes.data.entries || []);
        if (dppRes.data) setNodeDpp(dppRes.data);
        setLoadingDetails(false);
      })();
    }
  }, [selectedNode]);

  const handleEventTriggered = (newEvent: ContractEvent) => {
    setRecentEvents((prev) => [newEvent, ...prev.slice(0, 7)]);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#090d16",
        color: "#f8fafc",
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
      }}
    >
      <Nav />

      {/* Main Container */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
        {/* Top Control Toolbar & Title */}
        <header
          style={{
            padding: "16px 24px",
            background: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
            zIndex: 20,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  background: "linear-gradient(135deg, #0284c7, #38bdf8)",
                  color: "white",
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "3px 8px",
                  borderRadius: "4px",
                  letterSpacing: "0.08em",
                }}
              >
                REAL-TIME 3D DIGITAL TWIN
              </span>
              <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "white" }}>
                Smart Tiruppur Monitoring Grid
              </h1>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94a3b8" }}>
              Geospatial DEM elevation terrain · Noyyal River flow telemetry · Neural Bayesian inference & Blockchain ledger
            </p>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <Link
              href="/regulator"
              className="btn"
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                color: "#e2e8f0",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                fontSize: "12.5px",
                padding: "6px 14px",
                borderRadius: "6px",
                textDecoration: "none",
              }}
            >
              ← Regulator Dashboard
            </Link>

            <Link
              href="/simulator"
              className="btn"
              style={{
                background: "rgba(14, 165, 233, 0.15)",
                color: "#38bdf8",
                border: "1px solid rgba(14, 165, 233, 0.3)",
                fontSize: "12.5px",
                padding: "6px 14px",
                borderRadius: "6px",
                textDecoration: "none",
              }}
            >
              Interactive Simulator 🎨
            </Link>
          </div>
        </header>

        {/* 3D Viewport Controls & Lighting Toolbar */}
        <div
          style={{
            padding: "10px 24px",
            background: "#0f172a",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            fontSize: "12px",
            zIndex: 15,
          }}
        >
          {/* Camera View Presets */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ color: "#64748b", fontWeight: 600, marginRight: "4px" }}>CAMERA:</span>
            {[
              { id: "overview", label: "Overview 🌐" },
              { id: "datacenter", label: "AI Data Center 🧠" },
              { id: "river", label: "Noyyal River 💧" },
              { id: "industrial", label: "Textile Corridor 🏭" },
              { id: "ledger", label: "Ledger Vault 🔗" },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setViewPreset(preset.id as CameraViewPreset)}
                style={{
                  background: viewPreset === preset.id ? "#0284c7" : "rgba(255, 255, 255, 0.05)",
                  color: viewPreset === preset.id ? "white" : "#cbd5e1",
                  border: "1px solid",
                  borderColor: viewPreset === preset.id ? "#38bdf8" : "rgba(255, 255, 255, 0.1)",
                  padding: "4px 10px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontSize: "11.5px",
                  fontWeight: 500,
                  transition: "all 0.15s ease",
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Lighting & Options Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
            {/* Lighting Mode Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ color: "#64748b", fontWeight: 600, marginRight: "4px" }}>LIGHTING:</span>
              {[
                { id: "day", label: "Day ☀️" },
                { id: "dusk", label: "Dusk 🌅" },
                { id: "night", label: "Cyberpunk 🌙" },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setLighting(mode.id as LightingPreset)}
                  style={{
                    background: lighting === mode.id ? "#334155" : "transparent",
                    color: lighting === mode.id ? "#38bdf8" : "#94a3b8",
                    border: "1px solid",
                    borderColor: lighting === mode.id ? "#38bdf8" : "transparent",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "11px",
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {/* Orbit Auto-Rotate Toggle */}
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "#cbd5e1" }}>
              <input
                type="checkbox"
                checked={autoRotate}
                onChange={(e) => setAutoRotate(e.target.checked)}
                style={{ accentColor: "#0284c7" }}
              />
              Orbit Rotate
            </label>

            {/* Live Polling Toggle */}
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "#cbd5e1" }}>
              <input
                type="checkbox"
                checked={livePolling}
                onChange={(e) => setLivePolling(e.target.checked)}
                style={{ accentColor: "#10b981" }}
              />
              Live Polling (4s)
            </label>
          </div>
        </div>

        {/* Main 3D Canvas Area with Side Inspector Drawer */}
        <div style={{ flex: 1, height: "calc(100vh - 180px)", position: "relative" }}>
          <Terrain3DViewer
            lighting={lighting}
            viewPreset={viewPreset}
            autoRotate={autoRotate}
            livePolling={livePolling}
            onSelectNode={(node) => setSelectedNode(node)}
            onEventTriggered={handleEventTriggered}
            tourActive={tourActive}
            onTourEnd={() => setTourActive(false)}
          />

          {/* SIDE INSPECTOR PANEL (Click-to-Trace Interaction) */}
          {selectedNode && (
            <div
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                width: "360px",
                maxHeight: "calc(100% - 40px)",
                overflowY: "auto",
                zIndex: 30,
                background: "rgba(15, 23, 42, 0.94)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "14px",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
                padding: "20px",
                color: "#f8fafc",
                animation: "fadeIn 0.2s ease-out",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                <div>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      color: "#38bdf8",
                      textTransform: "uppercase",
                    }}
                  >
                    {selectedNode.type} DETAILS
                  </span>
                  <h3 style={{ margin: "2px 0 0", fontSize: "16px", color: "white", fontFamily: "Fraunces, serif" }}>
                    {selectedNode.name}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedNode(null)}
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "none",
                    color: "#94a3b8",
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "14px",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Node Metadata Badges */}
              <div style={{ display: "grid", gap: "8px", fontSize: "12.5px", marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "6px" }}>
                  <span style={{ color: "#94a3b8" }}>Node ID:</span>
                  <span style={{ fontFamily: "monospace", color: "#38bdf8" }}>{selectedNode.id}</span>
                </div>

                {selectedNode.designation && (
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "6px" }}>
                    <span style={{ color: "#94a3b8" }}>Designation:</span>
                    <span>{selectedNode.designation}</span>
                  </div>
                )}

                {selectedNode.latitude && (
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "6px" }}>
                    <span style={{ color: "#94a3b8" }}>GPS Coordinates:</span>
                    <span style={{ fontFamily: "monospace" }}>
                      {selectedNode.latitude.toFixed(4)}, {selectedNode.longitude?.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>

              {/* Sensor Telemetry Parameters if Sensor Node */}
              {selectedNode.type === "sensor" && selectedNode.raw && (
                <div
                  style={{
                    background: "rgba(2, 132, 199, 0.12)",
                    border: "1px solid rgba(2, 132, 199, 0.3)",
                    borderRadius: "8px",
                    padding: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#38bdf8", marginBottom: "8px" }}>
                    LIVE SENSOR TELEMETRY READINGS
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px" }}>
                    <div>
                      <div style={{ color: "#94a3b8", fontSize: "10.5px" }}>pH Value</div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "#38bdf8" }}>{selectedNode.raw.ph}</div>
                    </div>
                    <div>
                      <div style={{ color: "#94a3b8", fontSize: "10.5px" }}>Conductivity (EC)</div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "#38bdf8" }}>{selectedNode.raw.ec} µS/cm</div>
                    </div>
                    <div>
                      <div style={{ color: "#94a3b8", fontSize: "10.5px" }}>Turbidity</div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "#38bdf8" }}>{selectedNode.raw.turbidity} NTU</div>
                    </div>
                    <div>
                      <div style={{ color: "#94a3b8", fontSize: "10.5px" }}>Status</div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#10b981" }}>ONLINE</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Industrial Unit DPP & Ledger Section */}
              {selectedNode.type === "unit" && (
                <>
                  {loadingDetails ? (
                    <div style={{ padding: "16px", textAlign: "center", color: "#94a3b8", fontSize: "12px" }}>
                      Fetching Ledger & DPP Proofs...
                    </div>
                  ) : (
                    <>
                      {nodeDpp && (
                        <div
                          style={{
                            background: "rgba(16, 185, 129, 0.1)",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                            borderRadius: "8px",
                            padding: "12px",
                            marginBottom: "16px",
                          }}
                        >
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#34d399", marginBottom: "6px" }}>
                            DIGITAL PRODUCT PASSPORT (DPP)
                          </div>
                          <div style={{ fontSize: "12px", marginBottom: "6px" }}>
                            <strong>Compliance Summary:</strong> {nodeDpp.compliance_summary}
                          </div>
                          <div style={{ fontSize: "12px" }}>
                            <strong>Water Reuse:</strong> {nodeDpp.reuse_and_energy?.reuse_percentage}%
                          </div>
                          <Link
                            href={`/units/${selectedNode.id}`}
                            style={{
                              display: "inline-block",
                              marginTop: "8px",
                              fontSize: "11.5px",
                              color: "#38bdf8",
                              textDecoration: "underline",
                            }}
                          >
                            View Full DPP Certificate →
                          </Link>
                        </div>
                      )}

                      {/* Event History Chain */}
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", marginBottom: "8px" }}>
                          LEDGER EVENT HISTORY ({nodeLedger.length})
                        </div>
                        {nodeLedger.length === 0 ? (
                          <div style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>
                            No events recorded for this facility yet.
                          </div>
                        ) : (
                          <div style={{ display: "grid", gap: "6px", maxHeight: "160px", overflowY: "auto" }}>
                            {nodeLedger.map((entry, idx) => (
                              <div
                                key={entry.event_id || idx}
                                style={{
                                  background: "rgba(255, 255, 255, 0.04)",
                                  padding: "8px",
                                  borderRadius: "6px",
                                  borderLeft: `3px solid ${
                                    entry.decision === "investigate" ? "#ef4444" : "#10b981"
                                  }`,
                                  fontSize: "11px",
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                                  <span style={{ fontWeight: 700, color: entry.decision === "investigate" ? "#f87171" : "#34d399" }}>
                                    {entry.decision?.toUpperCase()}
                                  </span>
                                  <span style={{ color: "#64748b" }}>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <div style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: "10px" }}>
                                  Hash: {entry.current_hash?.substring(0, 16)}...
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Bottom Real-Time Event Stream Bar */}
        <footer
          style={{
            padding: "12px 24px",
            background: "#0f172a",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            overflowX: "auto",
            zIndex: 15,
          }}
        >
          <div style={{ whiteSpace: "nowrap", fontSize: "11px", fontWeight: 700, color: "#38bdf8", letterSpacing: "0.05em" }}>
            LIVE EVENT STREAM:
          </div>

          {recentEvents.length === 0 ? (
            <div style={{ fontSize: "12px", color: "#64748b" }}>Connecting to live ledger feed...</div>
          ) : (
            <div style={{ display: "flex", gap: "12px", flex: 1, overflowX: "auto" }}>
              {recentEvents.map((ev, idx) => (
                <div
                  key={ev.event_id + idx}
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    minWidth: "220px",
                    fontSize: "11px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: ev.decision === "investigate" ? "#f87171" : "#34d399" }}>
                      {ev.decision?.toUpperCase()}: {ev.most_likely_source || "Network"}
                    </div>
                    <div style={{ color: "#64748b", fontSize: "10px" }}>
                      {new Date(ev.timestamp).toLocaleTimeString()} · Conf: {Math.round(ev.confidence * 100)}%
                    </div>
                  </div>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: ev.decision === "investigate" ? "#ef4444" : "#10b981",
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </footer>
      </main>
    </div>
  );
}
