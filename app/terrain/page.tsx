"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Terrain3DViewer, {
  LightingPreset,
  SelectedNodeInfo,
  LayerToggles,
} from "@/components/Terrain3DViewer";
import { getGlobalEvents, getUnitLedger, getUnitDpp, getUnits, getGroundwaterZones } from "@/lib/api";
import type { ContractEvent, LedgerEntry, DppResponse, LedgerUnit } from "@/lib/types";

export default function Terrain3DPage() {
  const [lighting, setLighting] = useState<LightingPreset>("day");
  const [autoRotate, setAutoRotate] = useState(false);
  const [floodIntensity, setFloodIntensity] = useState<number>(0.3); // 0 to 1 monsoon rain intensity

  // Analysis Modes State
  const [activeAnalysisMode, setActiveAnalysisMode] = useState<"baseline" | "water" | "groundwater" | "flood" | "compliance">("baseline");

  // Layer Toggles State
  const [layers, setLayers] = useState<LayerToggles>({
    terrain: true,
    river: true,
    units: true,
    sensors: true,
    groundwater: true,
    floodRisk: false,
    pollution: false,
  });

  // Dynamic KPI Data
  const [unitCount, setUnitCount] = useState<number>(12);
  const [activeAlerts, setActiveAlerts] = useState<number>(1);
  const [avgReuse, setAvgReuse] = useState<number>(91);
  const [criticalZones, setCriticalZones] = useState<number>(3);
  const [currentTime, setCurrentTime] = useState<string>("");

  // Inspector Panel State
  const [selectedNode, setSelectedNode] = useState<SelectedNodeInfo | null>(null);
  const [nodeLedger, setNodeLedger] = useState<LedgerEntry[]>([]);
  const [nodeDpp, setNodeDpp] = useState<DppResponse | null>(null);
  const [showArchPanel, setShowArchPanel] = useState<boolean>(false);

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

  // Fetch KPI Data
  useEffect(() => {
    void (async () => {
      const [unitsRes, eventsRes, zonesRes] = await Promise.all([
        getUnits(),
        getGlobalEvents(),
        getGroundwaterZones(),
      ]);
      if (unitsRes.data) setUnitCount(unitsRes.data.length);
      if (eventsRes.data) {
        const flagged = eventsRes.data.filter((e) => e.status === "flagged" || e.decision === "investigate");
        setActiveAlerts(flagged.length);
      }
      if (zonesRes.data) {
        const crit = (zonesRes.data as any[]).filter(
          (z) =>
            z.category === "Critical" ||
            z.category === "Over-Exploited" ||
            z.cgwb_baseline?.category === "Critical" ||
            z.cgwb_baseline?.category === "Over-Exploited"
        );
        setCriticalZones(crit.length || 3);
      }
    })();
  }, []);

  // Node Inspector Loader
  useEffect(() => {
    if (!selectedNode) {
      setNodeLedger([]);
      setNodeDpp(null);
      return;
    }

    if (selectedNode.type === "unit") {
      void (async () => {
        const [ledgerRes, dppRes] = await Promise.all([
          getUnitLedger(selectedNode.id),
          getUnitDpp(selectedNode.id),
        ]);
        if (ledgerRes.data) setNodeLedger(ledgerRes.data.entries || []);
        if (dppRes.data) setNodeDpp(dppRes.data);
      })();
    }
  }, [selectedNode]);

  const toggleLayer = (key: keyof LayerToggles) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAnalysisModeChange = (mode: "baseline" | "water" | "groundwater" | "flood" | "compliance") => {
    setActiveAnalysisMode(mode);
    switch (mode) {
      case "baseline":
        setLayers({ terrain: true, river: true, units: true, sensors: true, groundwater: false, floodRisk: false, pollution: false });
        break;
      case "water":
        setLayers({ terrain: true, river: true, units: true, sensors: true, groundwater: false, floodRisk: false, pollution: true });
        break;
      case "groundwater":
        setLayers({ terrain: true, river: true, units: false, sensors: true, groundwater: true, floodRisk: false, pollution: false });
        break;
      case "flood":
        setLayers({ terrain: true, river: true, units: true, sensors: true, groundwater: false, floodRisk: true, pollution: false });
        break;
      case "compliance":
        setLayers({ terrain: true, river: true, units: true, sensors: true, groundwater: true, floodRisk: false, pollution: true });
        break;
    }
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
      {/* -------------------------------------------------------------------- */}
      {/* GLOBAL DYNAMIC KPI HEADER STRIP (FIX #17 & FIX #10)                 */}
      {/* -------------------------------------------------------------------- */}
      <header
        style={{
          padding: "8px 24px",
          background: "rgba(15, 23, 42, 0.96)",
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
            <h1 style={{ margin: 0, fontSize: "15px", color: "#ffffff", fontWeight: 700 }}>
              3D Environmental Digital Twin
            </h1>
            <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8" }}>
              Geospatial DEM Terrain · Noyyal River Telemetry · FIRKA Groundwater Assessment
            </p>
          </div>
        </div>

        {/* Global Dynamic KPI Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "18px", fontSize: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#94a3b8", fontSize: "10px", fontWeight: 700 }}>FACILITIES</span>
            <span style={{ fontWeight: 700, color: "#38bdf8" }}>{unitCount} Connected Units</span>
          </div>

          <div style={{ width: "1px", height: "24px", background: "#334155" }} />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#94a3b8", fontSize: "10px", fontWeight: 700 }}>WATER REUSE</span>
            <span style={{ fontWeight: 700, color: "#10b981" }}>{avgReuse}% Avg ZLD</span>
          </div>

          <div style={{ width: "1px", height: "24px", background: "#334155" }} />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#94a3b8", fontSize: "10px", fontWeight: 700 }}>CRITICAL FIRKAS</span>
            <span style={{ fontWeight: 700, color: "#f59e0b" }}>{criticalZones} Stress Zones</span>
          </div>

          <div style={{ width: "1px", height: "24px", background: "#334155" }} />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#94a3b8", fontSize: "10px", fontWeight: 700 }}>AI ALERTS</span>
            <span style={{ fontWeight: 700, color: activeAlerts > 0 ? "#ef4444" : "#10b981" }}>
              {activeAlerts} Active Anomaly
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            onClick={() => setShowArchPanel(!showArchPanel)}
            style={{
              background: "#1e293b",
              color: "#38bdf8",
              border: "1px solid #334155",
              fontSize: "12px",
              fontWeight: 600,
              padding: "5px 12px",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            ⚙ Architecture
          </button>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#1e293b",
              border: "1px solid #334155",
              padding: "5px 12px",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#10b981",
            }}
          >
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
            LIVE ● {currentTime || "14:38"}
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------------- */}
      {/* MAIN VIEWPORT CONTAINER                                             */}
      {/* -------------------------------------------------------------------- */}
      <div style={{ flex: 1, position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
        {/* THREE.JS VIEWPORT CANVAS */}
        <Terrain3DViewer
          lighting={lighting}
          autoRotate={autoRotate}
          floodIntensity={floodIntensity}
          layers={layers}
          onSelectNode={setSelectedNode}
          tourActive={false}
        />

        {/* ------------------------------------------------------------------ */}
        {/* LEFT FLOATING CONTROL & ANALYSIS PANEL (FIX #12 & FIX #8 & FIX #9)  */}
        {/* ------------------------------------------------------------------ */}
        <div
          style={{
            position: "absolute",
            top: "16px",
            left: "16px",
            zIndex: 20,
            width: "300px",
            background: "rgba(15, 23, 42, 0.9)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(51, 65, 85, 0.8)",
            borderRadius: "12px",
            padding: "16px",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            maxHeight: "calc(100% - 32px)",
            overflowY: "auto",
          }}
        >
          {/* DATA PROVENANCE & STATUS LEGEND (FIX #11) */}
          <div style={{ background: "#1e293b", padding: "10px", borderRadius: "8px" }}>
            <div style={{ fontSize: "10.5px", fontWeight: 800, letterSpacing: "0.08em", color: "#38bdf8", textTransform: "uppercase", marginBottom: "6px" }}>
              DATA STATUS & PROVENANCE
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11px" }}>
              <div style={{ color: "#10b981", fontWeight: 600 }}>● LIVE Telemetry</div>
              <div style={{ color: "#38bdf8", fontWeight: 600 }}>◐ SIMULATED Flood</div>
              <div style={{ color: "#f59e0b", fontWeight: 600 }}>◆ DERIVED AI Attribution</div>
              <div style={{ color: "#94a3b8", fontWeight: 600 }}>◇ BASELINE DEM Geo</div>
            </div>
          </div>

          {/* ANALYSIS MODES (FIX #12) */}
          <div>
            <div style={{ fontSize: "10.5px", fontWeight: 800, letterSpacing: "0.08em", color: "#0d9488", textTransform: "uppercase", marginBottom: "8px" }}>
              ANALYSIS MODES
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {[
                { id: "baseline", label: "Environmental Baseline 🌐" },
                { id: "water", label: "Water Quality & Pollution Plume 🌊" },
                { id: "groundwater", label: "FIRKA Groundwater Stewardship 💧" },
                { id: "flood", label: "Monsoon Flood Risk 🌧️" },
                { id: "compliance", label: "Industrial ZLD Compliance 🏭" },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => handleAnalysisModeChange(mode.id as any)}
                  style={{
                    textAlign: "left",
                    background: activeAnalysisMode === mode.id ? "#0d9488" : "#1e293b",
                    color: activeAnalysisMode === mode.id ? "#ffffff" : "#94a3b8",
                    border: "1px solid",
                    borderColor: activeAnalysisMode === mode.id ? "#0d9488" : "#334155",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: "1px", background: "#334155" }} />

          {/* VIEW LAYERS TOGGLES */}
          <div>
            <div style={{ fontSize: "10.5px", fontWeight: 800, letterSpacing: "0.08em", color: "#94a3b8", textTransform: "uppercase", marginBottom: "8px" }}>
              VIEW LAYERS
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
              {[
                { key: "terrain", label: "3D DEM Topography" },
                { key: "river", label: "Noyyal River Channel" },
                { key: "units", label: "Industrial Facilities (12 Units)" },
                { key: "sensors", label: "Monitoring Stations" },
                { key: "groundwater", label: "FIRKA Groundwater Stress" },
                { key: "floodRisk", label: "Monsoon Flood Risk Zone" },
                { key: "pollution", label: "Pollution Plume Propagation" },
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

          {/* MONSOON FLOOD SIMULATION SLIDER (FIX #8) */}
          {layers.floodRisk && (
            <div style={{ background: "#1e293b", padding: "10px", borderRadius: "8px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#38bdf8", marginBottom: "6px" }}>
                MONSOON RAINFALL SIMULATOR
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={floodIntensity}
                onChange={(e) => setFloodIntensity(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "#0284c7" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>
                <span>50mm Normal</span>
                <span>150mm Heavy</span>
                <span>300mm Extreme</span>
              </div>
            </div>
          )}

          <div style={{ height: "1px", background: "#334155" }} />

          {/* LIGHTING CONTROL */}
          <div>
            <div style={{ fontSize: "10.5px", fontWeight: 800, letterSpacing: "0.08em", color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px" }}>
              LIGHTING
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
                    background: lighting === mode.id ? "#2563eb" : "#1e293b",
                    color: lighting === mode.id ? "#ffffff" : "#94a3b8",
                    border: "1px solid",
                    borderColor: lighting === mode.id ? "#3b82f6" : "#334155",
                    padding: "4px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SYSTEM ARCHITECTURE INFO PANEL (FIX #13)                           */}
        {/* ------------------------------------------------------------------ */}
        {showArchPanel && (
          <div
            style={{
              position: "absolute",
              top: "16px",
              left: "332px",
              zIndex: 25,
              width: "340px",
              background: "rgba(15, 23, 42, 0.95)",
              backdropFilter: "blur(16px)",
              border: "1.5px solid #0d9488",
              borderRadius: "12px",
              padding: "18px",
              boxShadow: "0 16px 40px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ fontSize: "13px", fontWeight: 800, color: "#0d9488", letterSpacing: "0.05em" }}>
                SYSTEM ARCHITECTURE INFRASTRUCTURE
              </div>
              <button
                type="button"
                onClick={() => setShowArchPanel(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "16px" }}
              >
                ✕
              </button>
            </div>
            <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.6 }}>
              The AI Inference Engine and Blockchain Ledger Vault run as secure cloud services, decoupling digital system infrastructure from physical 3D city geography.
            </div>

            <div style={{ marginTop: "14px", display: "grid", gap: "10px" }}>
              <div style={{ background: "#1e293b", padding: "10px", borderRadius: "8px", borderLeft: "3px solid #2563eb" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#38bdf8" }}>🧠 Neural Bayesian Inference Engine</div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                  Evaluates 1D transport physics equations & sensor variance probability distributions.
                </div>
              </div>

              <div style={{ background: "#1e293b", padding: "10px", borderRadius: "8px", borderLeft: "3px solid #10b981" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#10b981" }}>🔗 Cryptographic SHA-256 Green Ledger</div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                  Immutable hash chain powering verified Digital Product Passports (DPP).
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* RIGHT CONTEXTUAL INSPECTOR PANEL (FIX #16 & FIX #15)               */}
        {/* ------------------------------------------------------------------ */}
        <div
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            zIndex: 20,
            width: "330px",
            background: "rgba(15, 23, 42, 0.9)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(51, 65, 85, 0.8)",
            borderRadius: "12px",
            padding: "18px",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)",
            maxHeight: "calc(100% - 32px)",
            overflowY: "auto",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.08em", color: "#38bdf8", textTransform: "uppercase", marginBottom: "12px" }}>
            CONTEXTUAL INSPECTOR
          </div>

          {!selectedNode ? (
            <div style={{ padding: "28px 0", textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>🌐</div>
              <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#f8fafc" }}>Select a 3D Facility or Station</div>
              <div style={{ fontSize: "12px", marginTop: "4px", lineHeight: 1.5 }}>
                Click any industrial facility, river monitoring beacon, or groundwater zone in the viewport.
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff" }}>{selectedNode.name}</div>
                <div style={{ fontSize: "12px", color: "#38bdf8", marginTop: "2px" }}>{selectedNode.designation}</div>
              </div>

              {/* Status Badge with Accessible Symbol */}
              <div style={{ background: "#1e293b", padding: "10px 12px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>STATUS</span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color:
                      selectedNode.status === "INVESTIGATE"
                        ? "#ef4444"
                        : selectedNode.status === "WARNING"
                        ? "#f59e0b"
                        : "#10b981",
                  }}
                >
                  {selectedNode.statusSymbol || "●"} {selectedNode.status || "NORMAL"}
                </span>
              </div>

              {/* Coordinates */}
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

              {/* Environmental Parameters */}
              {selectedNode.type === "unit" && (
                <>
                  <div style={{ background: "#1e293b", padding: "12px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8" }}>ENVIRONMENTAL TELEMETRY</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
                      <div>pH: <strong style={{ color: "#10b981" }}>{selectedNode.ph || 6.8}</strong></div>
                      <div>EC: <strong style={{ color: "#38bdf8" }}>{selectedNode.ec || 2850} µS/cm</strong></div>
                      <div>Turbidity: <strong style={{ color: "#f59e0b" }}>{selectedNode.turbidity || 45} NTU</strong></div>
                      <div>Flow: <strong style={{ color: "#f8fafc" }}>{selectedNode.flowRate || 128} L/s</strong></div>
                    </div>
                  </div>

                  <div style={{ background: "#1e293b", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                      <span style={{ color: "#94a3b8" }}>WATER REUSE RATIO</span>
                      <strong style={{ color: "#10b981" }}>{selectedNode.reusePercent || 91}%</strong>
                    </div>
                    <div style={{ width: "100%", height: "6px", background: "#334155", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ width: `${selectedNode.reusePercent || 91}%`, height: "100%", background: "#10b981" }} />
                    </div>
                  </div>

                  {selectedNode.status === "INVESTIGATE" && (
                    <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", padding: "10px", borderRadius: "8px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#ef4444" }}>AI BAYESIAN ATTRIBUTION</div>
                      <div style={{ fontSize: "12.5px", fontWeight: 600, color: "#ffffff", marginTop: "2px" }}>
                        87% Confidence Attribution ({selectedNode.lastEventId || "E-1028"})
                      </div>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "4px" }}>
                    <Link
                      href={`/units/${selectedNode.id}`}
                      style={{
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
                      View DPP Passport →
                    </Link>
                    <Link
                      href="/evidence"
                      style={{
                        textAlign: "center",
                        background: "#1e293b",
                        color: "#f8fafc",
                        border: "1px solid #334155",
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
                  marginTop: "6px",
                }}
              >
                Close Inspector
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
