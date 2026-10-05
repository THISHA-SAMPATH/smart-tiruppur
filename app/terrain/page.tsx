"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Terrain3DViewer, {
  LightingPreset,
  CameraViewPreset,
  SelectedNodeInfo,
  LayerToggles,
} from "@/components/Terrain3DViewer";
import { getGlobalEvents, getUnitLedger, getUnitDpp } from "@/lib/api";
import type { ContractEvent, LedgerEntry, DppResponse } from "@/lib/types";

export default function Terrain3DPage() {
  const [lighting, setLighting] = useState<LightingPreset>("day");
  const [viewPreset, setViewPreset] = useState<CameraViewPreset>("overview");
  const [autoRotate, setAutoRotate] = useState(false);
  const [livePolling, setLivePolling] = useState(true);

  // Layer Toggles State
  const [layers, setLayers] = useState<LayerToggles>({
    terrain: true,
    river: true,
    units: true,
    sensors: true,
    groundwater: true,
    floodRisk: false,
  });

  // Inspector Panel State
  const [selectedNode, setSelectedNode] = useState<SelectedNodeInfo | null>(null);
  const [nodeLedger, setNodeLedger] = useState<LedgerEntry[]>([]);
  const [nodeDpp, setNodeDpp] = useState<DppResponse | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");

  // Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Node Details Loader
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

  const toggleLayer = (key: keyof LayerToggles) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div
      style={{
        width: "100%",
        height: "calc(100vh - 65px)",
        position: "relative",
        background: "#0f172a",
        color: "#f8fafc",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* TOP COMMAND BAR */}
      <header
        style={{
          padding: "10px 24px",
          background: "rgba(15, 23, 42, 0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #1e293b",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 30,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #0d9488 0%, #2563eb 100%)",
              color: "white",
              fontSize: "11px",
              fontWeight: 800,
              padding: "4px 12px",
              borderRadius: "999px",
              letterSpacing: "0.08em",
              boxShadow: "0 2px 8px rgba(13, 148, 136, 0.3)",
            }}
          >
            SMART TIRUPPUR
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "16px", color: "#ffffff", fontWeight: 700, letterSpacing: "-0.01em" }}>
              3D Urban & Environmental Digital Twin
            </h1>
            <p style={{ margin: 0, fontSize: "11.5px", color: "#94a3b8" }}>
              Physics DEM Terrain · Noyyal River Telemetry · FIRKA Groundwater Stress
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "#1e293b",
              border: "1px solid #334155",
              padding: "5px 12px",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#38bdf8",
            }}
          >
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
            LIVE ● {currentTime || "14:15"}
          </div>

          <Link
            href="/regulator"
            style={{
              background: "#1e293b",
              color: "#f8fafc",
              border: "1px solid #334155",
              fontSize: "12.5px",
              fontWeight: 600,
              padding: "6px 14px",
              borderRadius: "8px",
              textDecoration: "none",
            }}
          >
            Regulator Dashboard →
          </Link>

          <Link
            href="/simulator"
            style={{
              background: "linear-gradient(135deg, #0d9488 0%, #2563eb 100%)",
              color: "white",
              fontSize: "12.5px",
              fontWeight: 600,
              padding: "6px 14px",
              borderRadius: "8px",
              textDecoration: "none",
              boxShadow: "0 2px 10px rgba(37, 99, 235, 0.3)",
            }}
          >
            Simulator 🎨
          </Link>
        </div>
      </header>

      {/* MAIN VIEWPORT CONTAINER */}
      <div style={{ flex: 1, position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
        {/* THREE.JS VIEWPORT CANVAS */}
        <Terrain3DViewer
          lighting={lighting}
          viewPreset={viewPreset}
          autoRotate={autoRotate}
          livePolling={livePolling}
          layers={layers}
          onSelectNode={setSelectedNode}
          tourActive={false}
        />

        {/* LEFT FLOATING PANEL: LAYERS & CONTROLS */}
        <div
          style={{
            position: "absolute",
            top: "16px",
            left: "16px",
            zIndex: 20,
            width: "280px",
            background: "rgba(15, 23, 42, 0.88)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(51, 65, 85, 0.8)",
            borderRadius: "12px",
            padding: "16px",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {/* Layer Checkboxes */}
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", color: "#0d9488", textTransform: "uppercase", marginBottom: "8px" }}>
              LAYERS & DATA SOURCES
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12.5px" }}>
              {[
                { key: "terrain", label: "3D DEM Terrain" },
                { key: "river", label: "Noyyal River Geometry" },
                { key: "units", label: "Industrial Facilities (12 Units)" },
                { key: "sensors", label: "Telemetry Stations" },
                { key: "groundwater", label: "Groundwater FIRKA Stress" },
                { key: "floodRisk", label: "Flood Risk Overlay" },
              ].map((item) => (
                <label key={item.key} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "#cbd5e1" }}>
                  <input
                    type="checkbox"
                    checked={layers[item.key as keyof LayerToggles]}
                    onChange={() => toggleLayer(item.key as keyof LayerToggles)}
                    style={{ accentColor: "#0d9488", cursor: "pointer" }}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ height: "1px", background: "#334155" }} />

          {/* Camera View Presets */}
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", color: "#94a3b8", textTransform: "uppercase", marginBottom: "8px" }}>
              CAMERA VIEWS
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {[
                { id: "overview", label: "Overview 🌐" },
                { id: "datacenter", label: "AI Center 🧠" },
                { id: "river", label: "Noyyal River 💧" },
                { id: "industrial", label: "Corridor 🏭" },
                { id: "ledger", label: "Ledger 🔗" },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setViewPreset(preset.id as CameraViewPreset)}
                  style={{
                    background: viewPreset === preset.id ? "#2563eb" : "#1e293b",
                    color: viewPreset === preset.id ? "#ffffff" : "#94a3b8",
                    border: "1px solid",
                    borderColor: viewPreset === preset.id ? "#3b82f6" : "#334155",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "11.5px",
                    fontWeight: 600,
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: "1px", background: "#334155" }} />

          {/* Lighting Mode */}
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", color: "#94a3b8", textTransform: "uppercase", marginBottom: "8px" }}>
              LIGHTING MODE
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              {[
                { id: "day", label: "Day ☀️" },
                { id: "dusk", label: "Dusk 🌅" },
                { id: "night", label: "Night 🌙" },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setLighting(mode.id as LightingPreset)}
                  style={{
                    flex: 1,
                    background: lighting === mode.id ? "#0d9488" : "#1e293b",
                    color: lighting === mode.id ? "#ffffff" : "#94a3b8",
                    border: "1px solid",
                    borderColor: lighting === mode.id ? "#0d9488" : "#334155",
                    padding: "5px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "11.5px",
                    fontWeight: 600,
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT FLOATING PANEL: INSPECTOR CARD */}
        <div
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            zIndex: 20,
            width: "320px",
            background: "rgba(15, 23, 42, 0.88)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(51, 65, 85, 0.8)",
            borderRadius: "12px",
            padding: "16px",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)",
            maxHeight: "calc(100% - 32px)",
            overflowY: "auto",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", color: "#38bdf8", textTransform: "uppercase", marginBottom: "10px" }}>
            INSPECTOR / NODE DETAILS
          </div>

          {!selectedNode ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>🌐</div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#f8fafc" }}>No Location Selected</div>
              <div style={{ fontSize: "12px", marginTop: "4px" }}>
                Click any 3D facility building, sensor beacon, or groundwater zone in the viewer.
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff" }}>{selectedNode.name}</div>
                <div style={{ fontSize: "12px", color: "#38bdf8", marginTop: "2px" }}>{selectedNode.designation}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "6px" }}>
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>LATITUDE</div>
                  <div style={{ fontSize: "12px", fontWeight: 600, fontFamily: "monospace" }}>{selectedNode.latitude?.toFixed(4)}° N</div>
                </div>
                <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "6px" }}>
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>LONGITUDE</div>
                  <div style={{ fontSize: "12px", fontWeight: 600, fontFamily: "monospace" }}>{selectedNode.longitude?.toFixed(4)}° E</div>
                </div>
              </div>

              {selectedNode.type === "sensor" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                  <div style={{ background: "#1e293b", padding: "8px", borderRadius: "6px", textAlign: "center" }}>
                    <div style={{ fontSize: "10px", color: "#94a3b8" }}>pH</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#10b981" }}>{selectedNode.raw?.ph || 7.2}</div>
                  </div>
                  <div style={{ background: "#1e293b", padding: "8px", borderRadius: "6px", textAlign: "center" }}>
                    <div style={{ fontSize: "10px", color: "#94a3b8" }}>EC</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#38bdf8" }}>{selectedNode.raw?.ec || 1420}</div>
                  </div>
                  <div style={{ background: "#1e293b", padding: "8px", borderRadius: "6px", textAlign: "center" }}>
                    <div style={{ fontSize: "10px", color: "#94a3b8" }}>TURBIDITY</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#f59e0b" }}>{selectedNode.raw?.turbidity || 18}</div>
                  </div>
                </div>
              )}

              {selectedNode.type === "unit" && (
                <div>
                  <div style={{ background: "#1e293b", padding: "10px", borderRadius: "6px", marginBottom: "8px" }}>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>COMPLIANCE STATUS</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#10b981", marginTop: "2px" }}>
                      ✔ ZERO LIQUID DISCHARGE (ZLD) MANDATED
                    </div>
                  </div>
                  <Link
                    href={`/units/${selectedNode.id}`}
                    style={{
                      display: "block",
                      textAlign: "center",
                      background: "#2563eb",
                      color: "white",
                      padding: "8px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    View Unit Passport & Ledger →
                  </Link>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                style={{
                  background: "transparent",
                  color: "#94a3b8",
                  border: "1px solid #334155",
                  padding: "6px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Close Inspector
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM TELEMETRY STRIP */}
      <footer
        style={{
          padding: "10px 24px",
          background: "rgba(15, 23, 42, 0.95)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid #1e293b",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          fontSize: "12px",
          zIndex: 30,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ fontSize: "16px" }}>💧</div>
          <div>
            <div style={{ color: "#94a3b8", fontSize: "10.5px", fontWeight: 700 }}>WATER QUALITY (NOYYAL)</div>
            <div style={{ fontWeight: 600, color: "#f8fafc" }}>pH 7.2 · EC 1420 µS/cm · Normal</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ fontSize: "16px" }}>🏭</div>
          <div>
            <div style={{ color: "#94a3b8", fontSize: "10.5px", fontWeight: 700 }}>INDUSTRIAL UNITS</div>
            <div style={{ fontWeight: 600, color: "#f8fafc" }}>12 Connected Facilities · 100% ZLD</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ fontSize: "16px" }}>🌐</div>
          <div>
            <div style={{ color: "#94a3b8", fontSize: "10.5px", fontWeight: 700 }}>GROUNDWATER STRESS</div>
            <div style={{ fontWeight: 600, color: "#f8fafc" }}>6 FIRKA Zones · 62% Extraction</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ fontSize: "16px" }}>📜</div>
          <div>
            <div style={{ color: "#94a3b8", fontSize: "10.5px", fontWeight: 700 }}>LEDGER INTEGRITY</div>
            <div style={{ fontWeight: 600, color: "#10b981" }}>SHA-256 Chain Active · 0 Alerts</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
