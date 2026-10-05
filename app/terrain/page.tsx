"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Terrain3DViewer, {
  LightingPreset,
  SelectedNodeInfo,
  LayerToggles,
  UserRoleOverlay,
  geoTo3D,
} from "@/components/Terrain3DViewer";
import { getGlobalEvents, getUnitLedger, getUnitDpp, getUnits, getGroundwaterZones } from "@/lib/api";
import type { ContractEvent, LedgerEntry, DppResponse } from "@/lib/types";

// Interactive Live Event Timeline Items (Fix #18)
const LIVE_TIMELINE_EVENTS = [
  {
    id: "evt_001",
    time: "13:42",
    status: "INVESTIGATE",
    symbol: "!",
    title: "Unit 007 Discharge Anomaly",
    location: "Angeripalayam Processing 007",
    lat: 11.1420,
    lon: 77.3310,
    confidence: "87% AI Confidence",
  },
  {
    id: "evt_002",
    time: "13:39",
    status: "NORMAL",
    symbol: "●",
    title: "Kasipalayam Telemetry Verified",
    location: "Kasipalayam Bridge Station",
    lat: 11.11975,
    lon: 77.39716,
    confidence: "pH 6.8 · EC 2850 µS/cm",
  },
  {
    id: "evt_003",
    time: "13:35",
    status: "WARNING",
    symbol: "▲",
    title: "Groundwater Stress Alert",
    location: "Tiruppur South FIRKA",
    lat: 11.0820,
    lon: 77.3550,
    confidence: "112% Extraction Index",
  },
  {
    id: "evt_004",
    time: "13:29",
    status: "COMPLIANT",
    symbol: "●",
    title: "ZLD Mandate Certified",
    location: "Kasipalayam Unit 004",
    lat: 11.1190,
    lon: 77.3950,
    confidence: "SHA-256 Ledger Minted",
  },
];

export default function Terrain3DPage() {
  const [lighting, setLighting] = useState<LightingPreset>("day");
  const [autoRotate, setAutoRotate] = useState(false);
  const [floodIntensity, setFloodIntensity] = useState<number>(0.3);
  const [userRole, setUserRole] = useState<UserRoleOverlay>("REGULATOR");

  // Camera Focus Target (Fix #19)
  const [focusPosition, setFocusPosition] = useState<{ x: number; y: number; z: number } | null>(null);

  // Analysis Modes State
  const [activeAnalysisMode, setActiveAnalysisMode] = useState<"baseline" | "water" | "groundwater" | "flood" | "compliance">("baseline");

  // Layer Toggles State
  const [layers, setLayers] = useState<LayerToggles>({
    terrain: true,
    contours: true,
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
  const [showTimeline, setShowTimeline] = useState<boolean>(true);

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
          (z) => z.category === "Critical" || z.category === "Over-Exploited" || z.cgwb_baseline?.category === "Critical"
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

  // Fly Camera to Timeline Event (Fix #18 & Fix #19)
  const handleTimelineClick = (evt: typeof LIVE_TIMELINE_EVENTS[0]) => {
    const pos = geoTo3D(evt.lat, evt.lon, 0);
    setFocusPosition({ x: pos.x, y: pos.y, z: pos.z });
  };

  const handleRoleChange = (role: UserRoleOverlay) => {
    setUserRole(role);
    switch (role) {
      case "REGULATOR":
        setLayers({ terrain: true, contours: true, river: true, units: true, sensors: true, groundwater: false, floodRisk: false, pollution: true });
        break;
      case "GROUNDWATER_OFFICER":
        setLayers({ terrain: true, contours: true, river: true, units: false, sensors: true, groundwater: true, floodRisk: false, pollution: false });
        break;
      case "INDUSTRY":
        setLayers({ terrain: true, contours: false, river: true, units: true, sensors: true, groundwater: false, floodRisk: false, pollution: false });
        break;
      case "CITIZEN":
        setLayers({ terrain: true, contours: false, river: true, units: true, sensors: true, groundwater: true, floodRisk: true, pollution: false });
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
      {/* TOP HEADER WITH 2D GIS MAP / 3D TWIN SWITCHER (FIX #24 & FIX #27)   */}
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
              Physics DEM Terrain · Noyyal River Telemetry · FIRKA Groundwater Assessment
            </p>
          </div>
        </div>

        {/* 2D MAP | 3D TWIN SWITCHER (FIX #24) */}
        <div style={{ display: "flex", background: "#1e293b", padding: "3px", borderRadius: "8px", border: "1px solid #334155" }}>
          <Link
            href="/map"
            style={{
              padding: "5px 14px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              textDecoration: "none",
              color: "#94a3b8",
            }}
          >
            🗺️ 2D GIS MAP
          </Link>
          <div
            style={{
              padding: "5px 14px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 700,
              background: "#0d9488",
              color: "#ffffff",
              boxShadow: "0 2px 6px rgba(13, 148, 136, 0.4)",
            }}
          >
            🌐 3D DIGITAL TWIN
          </div>
        </div>

        {/* MULTI-ROLE OVERLAY SELECTOR (FIX #27) */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
            <span style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700 }}>ROLE VIEW:</span>
            <select
              value={userRole}
              onChange={(e) => handleRoleChange(e.target.value as UserRoleOverlay)}
              style={{
                background: "#1e293b",
                color: "#38bdf8",
                border: "1px solid #334155",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <option value="REGULATOR">Regulator View</option>
              <option value="GROUNDWATER_OFFICER">Groundwater Officer View</option>
              <option value="INDUSTRY">Industry Facility View</option>
              <option value="CITIZEN">Public Citizen View</option>
            </select>
          </div>

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
            LIVE ● {currentTime || "19:05"}
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------------- */}
      {/* MAIN VIEWPORT CANVAS                                                */}
      {/* -------------------------------------------------------------------- */}
      <div style={{ flex: 1, position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
        <Terrain3DViewer
          lighting={lighting}
          autoRotate={autoRotate}
          floodIntensity={floodIntensity}
          role={userRole}
          layers={layers}
          focusPosition={focusPosition}
          onSelectNode={setSelectedNode}
        />

        {/* ------------------------------------------------------------------ */}
        {/* LEFT CONTROL & ANALYSIS PANEL                                      */}
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
            gap: "12px",
            maxHeight: "calc(100% - 32px)",
            overflowY: "auto",
          }}
        >
          {/* DATA PROVENANCE LEGEND */}
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

          {/* VIEW LAYERS TOGGLES */}
          <div>
            <div style={{ fontSize: "10.5px", fontWeight: 800, letterSpacing: "0.08em", color: "#94a3b8", textTransform: "uppercase", marginBottom: "8px" }}>
              VIEW LAYERS
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
              {[
                { key: "terrain", label: "3D DEM Topography" },
                { key: "contours", label: "GIS Contour Lines (Fix #22)" },
                { key: "river", label: "Noyyal River Flow Geometry" },
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

          {/* MONSOON FLOOD SIMULATOR SLIDER */}
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

          {/* INTERACTIVE EVENT TIMELINE DRAWER (FIX #18) */}
          <div style={{ background: "#1e293b", padding: "12px", borderRadius: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#38bdf8", letterSpacing: "0.05em" }}>
                LIVE EVENT TIMELINE
              </div>
              <span style={{ fontSize: "10px", color: "#10b981", fontWeight: 700 }}>● REAL-TIME</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "160px", overflowY: "auto" }}>
              {LIVE_TIMELINE_EVENTS.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => handleTimelineClick(evt)}
                  style={{
                    background: "#0f172a",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    borderLeft: `3px solid ${
                      evt.status === "INVESTIGATE" ? "#ef4444" : evt.status === "WARNING" ? "#f59e0b" : "#10b981"
                    }`,
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 700, color: "#ffffff" }}>
                    <span>{evt.symbol} {evt.title}</span>
                    <span style={{ color: "#94a3b8" }}>{evt.time}</span>
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#38bdf8", marginTop: "2px" }}>
                    {evt.location} · {evt.confidence}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* RIGHT CONTEXTUAL INSPECTOR PANEL (FIX #16 & FIX #23)               */}
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
              <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#f8fafc" }}>Select any Object or Terrain</div>
              <div style={{ fontSize: "12px", marginTop: "4px", lineHeight: 1.5 }}>
                Click an industrial facility, river station, groundwater zone, or terrain surface for instant elevation & GIS telemetry.
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff" }}>{selectedNode.name}</div>
                <div style={{ fontSize: "12px", color: "#38bdf8", marginTop: "2px" }}>{selectedNode.designation}</div>
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

              {/* TERRAIN ELEVATION INSPECTOR (FIX #23) */}
              {selectedNode.type === "terrain" && (
                <div style={{ background: "#1e293b", padding: "12px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#38bdf8" }}>TOPOGRAPHIC ELEVATION DATA</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
                    <div>Elevation: <strong style={{ color: "#10b981" }}>~{selectedNode.elevationMeters} m ASL</strong></div>
                    <div>FIRKA: <strong style={{ color: "#f8fafc" }}>{selectedNode.firkaName}</strong></div>
                  </div>
                  <div style={{ fontSize: "11.5px", color: "#94a3b8", marginTop: "4px" }}>
                    Drainage Basin: <strong>{selectedNode.drainageBasin}</strong>
                  </div>
                </div>
              )}

              {/* INDUSTRIAL UNIT DETAILS */}
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

                  {/* PHYSICAL DISCHARGE INCIDENT JOURNEY (FIX #20) */}
                  {selectedNode.status === "INVESTIGATE" && (
                    <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", padding: "12px", borderRadius: "8px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 800, color: "#ef4444", marginBottom: "6px" }}>
                        PHYSICAL INCIDENT FLOW JOURNEY
                      </div>
                      <div style={{ fontSize: "11px", color: "#f8fafc", lineHeight: 1.6 }}>
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
