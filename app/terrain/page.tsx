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
  const [lighting, setLighting] = useState<LightingPreset>("day");
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

  useEffect(() => {
    void (async () => {
      const res = await getGlobalEvents();
      if (res.data) {
        setRecentEvents(res.data.slice(0, 8));
      }
    })();
  }, []);

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
        background: "var(--paper, #eee9dc)",
        color: "var(--ink, #1f2a24)",
        fontFamily: "IBM Plex Sans, sans-serif",
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
      }}
    >
      <Nav />

      {/* Main Container */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
        {/* Top Clean Header */}
        <header
          style={{
            padding: "16px 24px",
            background: "var(--paper-raised, #f6f3ea)",
            borderBottom: "1px solid var(--hairline, #d8d0bc)",
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
                  background: "#2563eb",
                  color: "white",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "4px",
                  letterSpacing: "0.06em",
                }}
              >
                REAL-TIME 3D DIGITAL TWIN
              </span>
              <h1 style={{ margin: 0, fontSize: "22px", fontFamily: "Fraunces, serif", color: "var(--ink, #1f2a24)" }}>
                Smart Tiruppur Monitoring Grid
              </h1>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--ink-soft, #4b5850)" }}>
              Geospatial DEM elevation terrain · Noyyal River flow telemetry · Neural Bayesian inference & Blockchain ledger
            </p>
          </div>

          {/* Navigation Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <Link
              href="/regulator"
              style={{
                background: "var(--paper, #eee9dc)",
                color: "var(--ink, #1f2a24)",
                border: "1px solid var(--hairline, #d8d0bc)",
                fontSize: "13px",
                fontWeight: 600,
                padding: "6px 14px",
                borderRadius: "var(--radius-md, 6px)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              ← Regulator Dashboard
            </Link>

            <Link
              href="/simulator"
              style={{
                background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
                color: "white",
                border: "none",
                fontSize: "13px",
                fontWeight: 600,
                padding: "6px 14px",
                borderRadius: "var(--radius-md, 6px)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 8px rgba(37, 99, 235, 0.2)",
              }}
            >
              Interactive Simulator 🎨
            </Link>
          </div>
        </header>

        {/* 3D Toolbar & Camera View Controls */}
        <div
          style={{
            padding: "10px 24px",
            background: "#ffffff",
            borderBottom: "1px solid var(--hairline, #d8d0bc)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            fontSize: "12.5px",
            zIndex: 15,
          }}
        >
          {/* Camera View Presets */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ color: "var(--ink-soft, #4b5850)", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em", marginRight: "4px" }}>
              CAMERA:
            </span>
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
                  background: viewPreset === preset.id ? "#2563eb" : "var(--paper-raised, #f6f3ea)",
                  color: viewPreset === preset.id ? "white" : "var(--ink, #1f2a24)",
                  border: "1px solid",
                  borderColor: viewPreset === preset.id ? "#2563eb" : "var(--hairline, #d8d0bc)",
                  padding: "4px 12px",
                  borderRadius: "var(--radius-sm, 4px)",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  transition: "all 0.15s ease",
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Lighting & Options */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ color: "var(--ink-soft, #4b5850)", fontWeight: 700, fontSize: "11px", letterSpacing: "0.05em", marginRight: "4px" }}>
                LIGHTING:
              </span>
              {[
                { id: "day", label: "Daylight ☀️" },
                { id: "dusk", label: "Sunset 🌅" },
                { id: "night", label: "Soft Atmosphere ⛅" },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setLighting(mode.id as LightingPreset)}
                  style={{
                    background: lighting === mode.id ? "#ffffff" : "transparent",
                    color: lighting === mode.id ? "#2563eb" : "var(--ink-soft, #4b5850)",
                    border: "1px solid",
                    borderColor: lighting === mode.id ? "#2563eb" : "transparent",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "11.5px",
                    fontWeight: lighting === mode.id ? 600 : 500,
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "var(--ink, #1f2a24)", fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={autoRotate}
                onChange={(e) => setAutoRotate(e.target.checked)}
                style={{ accentColor: "#2563eb" }}
              />
              Orbit Rotate
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "var(--ink, #1f2a24)", fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={livePolling}
                onChange={(e) => setLivePolling(e.target.checked)}
                style={{ accentColor: "#16a34a" }}
              />
              Live Polling (4s)
            </label>
          </div>
        </div>

        {/* 3D Canvas Area */}
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

          {/* INSPECTOR SIDE PANEL (CLEAN WHITE CARD) */}
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
                background: "#ffffff",
                border: "1px solid var(--hairline, #d8d0bc)",
                borderRadius: "var(--radius-md, 6px)",
                boxShadow: "0 12px 32px rgba(31, 42, 36, 0.12)",
                padding: "20px",
                color: "var(--ink, #1f2a24)",
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
                      color: "#2563eb",
                      textTransform: "uppercase",
                    }}
                  >
                    {selectedNode.type} DETAILS
                  </span>
                  <h3 style={{ margin: "2px 0 0", fontSize: "17px", color: "var(--ink, #1f2a24)", fontFamily: "Fraunces, serif" }}>
                    {selectedNode.name}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedNode(null)}
                  style={{
                    background: "var(--paper-raised, #f6f3ea)",
                    border: "1px solid var(--hairline, #d8d0bc)",
                    color: "var(--ink-soft, #4b5850)",
                    width: "28px",
                    height: "28px",
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
              <div style={{ display: "grid", gap: "8px", fontSize: "13px", marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--hairline, #d8d0bc)", paddingBottom: "6px" }}>
                  <span style={{ color: "var(--ink-soft, #4b5850)" }}>Node ID:</span>
                  <span style={{ fontFamily: "IBM Plex Mono, monospace", color: "#2563eb", fontWeight: 600 }}>{selectedNode.id}</span>
                </div>

                {selectedNode.designation && (
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--hairline, #d8d0bc)", paddingBottom: "6px" }}>
                    <span style={{ color: "var(--ink-soft, #4b5850)" }}>Designation:</span>
                    <span>{selectedNode.designation}</span>
                  </div>
                )}

                {selectedNode.latitude && (
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--hairline, #d8d0bc)", paddingBottom: "6px" }}>
                    <span style={{ color: "var(--ink-soft, #4b5850)" }}>GPS Coordinates:</span>
                    <span style={{ fontFamily: "IBM Plex Mono, monospace" }}>
                      {selectedNode.latitude.toFixed(4)}, {selectedNode.longitude?.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>

              {/* Sensor Readouts */}
              {selectedNode.type === "sensor" && selectedNode.raw && (
                <div
                  style={{
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "6px",
                    padding: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#1e40af", marginBottom: "8px" }}>
                    LIVE SENSOR TELEMETRY READINGS
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px" }}>
                    <div>
                      <div style={{ color: "#475569", fontSize: "11px" }}>pH Value</div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "#1e3a8a" }}>{selectedNode.raw.ph}</div>
                    </div>
                    <div>
                      <div style={{ color: "#475569", fontSize: "11px" }}>Conductivity (EC)</div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "#1e3a8a" }}>{selectedNode.raw.ec} µS/cm</div>
                    </div>
                    <div>
                      <div style={{ color: "#475569", fontSize: "11px" }}>Turbidity</div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "#1e3a8a" }}>{selectedNode.raw.turbidity} NTU</div>
                    </div>
                    <div>
                      <div style={{ color: "#475569", fontSize: "11px" }}>Status</div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#16a34a" }}>ONLINE</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Unit DPP & Ledger Section */}
              {selectedNode.type === "unit" && (
                <>
                  {loadingDetails ? (
                    <div style={{ padding: "16px", textAlign: "center", color: "var(--ink-soft)", fontSize: "12.5px" }}>
                      Fetching Ledger & DPP Proofs...
                    </div>
                  ) : (
                    <>
                      {nodeDpp && (
                        <div
                          style={{
                            background: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                            borderRadius: "6px",
                            padding: "12px",
                            marginBottom: "16px",
                          }}
                        >
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#166534", marginBottom: "6px" }}>
                            DIGITAL PRODUCT PASSPORT (DPP)
                          </div>
                          <div style={{ fontSize: "12.5px", marginBottom: "6px", color: "var(--ink)" }}>
                            <strong>Compliance Summary:</strong> {nodeDpp.compliance_summary}
                          </div>
                          <div style={{ fontSize: "12.5px", color: "var(--ink)" }}>
                            <strong>Water Reuse:</strong> {nodeDpp.reuse_and_energy?.reuse_percentage}%
                          </div>
                          <Link
                            href={`/units/${selectedNode.id}`}
                            style={{
                              display: "inline-block",
                              marginTop: "8px",
                              fontSize: "12px",
                              color: "#2563eb",
                              fontWeight: 600,
                              textDecoration: "underline",
                            }}
                          >
                            View Full DPP Certificate →
                          </Link>
                        </div>
                      )}

                      {/* Event History Chain */}
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink-soft, #4b5850)", marginBottom: "8px" }}>
                          LEDGER EVENT HISTORY ({nodeLedger.length})
                        </div>
                        {nodeLedger.length === 0 ? (
                          <div style={{ fontSize: "12.5px", color: "var(--ink-soft)", fontStyle: "italic" }}>
                            No events recorded for this facility yet.
                          </div>
                        ) : (
                          <div style={{ display: "grid", gap: "6px", maxHeight: "160px", overflowY: "auto" }}>
                            {nodeLedger.map((entry, idx) => (
                              <div
                                key={entry.event_id || idx}
                                style={{
                                  background: "var(--paper-raised, #f6f3ea)",
                                  padding: "8px 10px",
                                  borderRadius: "4px",
                                  borderLeft: `3px solid ${
                                    entry.decision === "investigate" ? "var(--madder, #9c3b22)" : "#16a34a"
                                  }`,
                                  fontSize: "11.5px",
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                                  <span style={{ fontWeight: 700, color: entry.decision === "investigate" ? "var(--madder, #9c3b22)" : "#16a34a" }}>
                                    {entry.decision?.toUpperCase()}
                                  </span>
                                  <span style={{ color: "var(--ink-soft)" }}>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <div style={{ color: "var(--ink-soft)", fontFamily: "IBM Plex Mono, monospace", fontSize: "10px" }}>
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

        {/* Clean Footer Live Event Stream Bar */}
        <footer
          style={{
            padding: "12px 24px",
            background: "var(--paper-raised, #f6f3ea)",
            borderTop: "1px solid var(--hairline, #d8d0bc)",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            overflowX: "auto",
            zIndex: 15,
          }}
        >
          <div style={{ whiteSpace: "nowrap", fontSize: "11px", fontWeight: 700, color: "#2563eb", letterSpacing: "0.05em" }}>
            LIVE EVENT STREAM:
          </div>

          {recentEvents.length === 0 ? (
            <div style={{ fontSize: "12px", color: "var(--ink-soft)" }}>Connecting to live ledger feed...</div>
          ) : (
            <div style={{ display: "flex", gap: "12px", flex: 1, overflowX: "auto" }}>
              {recentEvents.map((ev, idx) => (
                <div
                  key={ev.event_id + idx}
                  style={{
                    background: "#ffffff",
                    border: "1px solid var(--hairline, #d8d0bc)",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    minWidth: "220px",
                    fontSize: "11.5px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: ev.decision === "investigate" ? "var(--madder, #9c3b22)" : "#16a34a" }}>
                      {ev.decision?.toUpperCase()}: {ev.most_likely_source || "Network"}
                    </div>
                    <div style={{ color: "var(--ink-soft)", fontSize: "10.5px" }}>
                      {new Date(ev.timestamp).toLocaleTimeString()} · Conf: {Math.round(ev.confidence * 100)}%
                    </div>
                  </div>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: ev.decision === "investigate" ? "var(--madder, #9c3b22)" : "#16a34a",
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
