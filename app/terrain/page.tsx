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
import LayerPanel from "@/components/digital-twin/LayerPanel";
import ScenarioModePanel from "@/components/digital-twin/ScenarioModePanel";
import InspectorPanel from "@/components/digital-twin/InspectorPanel";
import TelemetryBar from "@/components/digital-twin/TelemetryBar";
import DataProvenanceModal from "@/components/digital-twin/DataProvenanceModal";
import { getGlobalEvents, getUnits, getGroundwaterZones } from "@/lib/api";
import "@/app/digital-twin.css";

// Interactive Live Event Timeline Items (Fix #18)
const LIVE_TIMELINE_EVENTS = [
  {
    id: "evt_001",
    time: "19:20",
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
    time: "19:15",
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
    time: "19:10",
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
    time: "19:02",
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
  const [userRole, setUserRole] = useState<UserRoleOverlay>("REGULATOR");

  // Mode Switch (Fix #28): LIVE vs SCENARIO
  const [mode, setMode] = useState<"LIVE" | "SCENARIO">("LIVE");

  // Scenario Mode Parameters (Fix #28)
  const [rainfall, setRainfall] = useState<number>(120);
  const [dischargeLoad, setDischargeLoad] = useState<number>(100);
  const [riverFlow, setRiverFlow] = useState<number>(110);
  const [groundwaterDraft, setGroundwaterDraft] = useState<number>(110);
  const [floodIntensity, setFloodIntensity] = useState<number>(0.35);

  // Focus Position for Camera Lerp (Fix #19)
  const [focusPosition, setFocusPosition] = useState<{ x: number; y: number; z: number } | null>(null);

  // Analysis Modes State
  const [activeAnalysisMode, setActiveAnalysisMode] = useState<string>("baseline");

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

  // Inspector & Data Provenance Modal State
  const [selectedNode, setSelectedNode] = useState<SelectedNodeInfo | null>(null);
  const [isProvenanceOpen, setIsProvenanceOpen] = useState<boolean>(false);

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

  // Fetch Dynamic KPI Data
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

  const toggleLayer = (key: keyof LayerToggles) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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

  const handleAnalysisModeChange = (modeKey: "baseline" | "water" | "groundwater" | "flood" | "compliance") => {
    setActiveAnalysisMode(modeKey);
    switch (modeKey) {
      case "baseline":
        setLayers({ terrain: true, contours: true, river: true, units: true, sensors: true, groundwater: false, floodRisk: false, pollution: false });
        break;
      case "water":
        setLayers({ terrain: true, contours: true, river: true, units: true, sensors: true, groundwater: false, floodRisk: false, pollution: true });
        break;
      case "groundwater":
        setLayers({ terrain: true, contours: true, river: true, units: false, sensors: true, groundwater: true, floodRisk: false, pollution: false });
        break;
      case "flood":
        setLayers({ terrain: true, contours: true, river: true, units: true, sensors: true, groundwater: false, floodRisk: true, pollution: false });
        break;
      case "compliance":
        setLayers({ terrain: true, contours: true, river: true, units: true, sensors: true, groundwater: true, floodRisk: false, pollution: true });
        break;
    }
  };

  const handleRunScenario = () => {
    const calculatedFlood = (rainfall - 50) / 250;
    setFloodIntensity(Math.min(1, Math.max(0, calculatedFlood)));
    setLayers((prev) => ({ ...prev, floodRisk: true, pollution: dischargeLoad > 110 }));
  };

  return (
    <div className="dt-container">
      {/* -------------------------------------------------------------------- */}
      {/* HEADER WITH MODE SWITCH & 2D GIS / 3D TWIN SWITCHER (FIX #24 & #28)  */}
      {/* -------------------------------------------------------------------- */}
      <header className="dt-header">
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div className="dt-badge-brand">SMART TIRUPPUR</div>

          <div>
            <h1 style={{ margin: 0, fontSize: "15px", color: "#ffffff", fontWeight: 700 }}>
              3D Environmental Digital Twin
            </h1>
            <p style={{ margin: 0, fontSize: "11px", color: "var(--color-slate-muted)" }}>
              Physics DEM Terrain · Noyyal River Telemetry · FIRKA Groundwater Assessment
            </p>
          </div>
        </div>

        {/* LIVE MODE vs SCENARIO MODE SWITCH (FIX #28) */}
        <div style={{ display: "flex", background: "var(--color-slate-surface)", padding: "3px", borderRadius: "8px", border: "1px solid var(--color-slate-border)" }}>
          <button
            type="button"
            className={`dt-btn ${mode === "LIVE" ? "active" : ""}`}
            style={{ padding: "4px 12px", fontSize: "11.5px" }}
            onClick={() => setMode("LIVE")}
          >
            ● LIVE MODE
          </button>
          <button
            type="button"
            className={`dt-btn ${mode === "SCENARIO" ? "active" : ""}`}
            style={{ padding: "4px 12px", fontSize: "11.5px" }}
            onClick={() => setMode("SCENARIO")}
          >
            ⚙ SCENARIO MODE
          </button>
        </div>

        {/* 2D MAP | 3D TWIN SWITCHER (FIX #24) */}
        <div style={{ display: "flex", background: "var(--color-slate-surface)", padding: "3px", borderRadius: "8px", border: "1px solid var(--color-slate-border)" }}>
          <Link
            href="/map"
            style={{
              padding: "5px 14px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              textDecoration: "none",
              color: "var(--color-slate-muted)",
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
              background: "var(--color-cyan)",
              color: "#ffffff",
              boxShadow: "0 2px 6px rgba(13, 148, 136, 0.4)",
            }}
          >
            🌐 3D DIGITAL TWIN
          </div>
        </div>

        {/* ROLE VIEW SELECTOR */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
            <span style={{ color: "var(--color-slate-muted)", fontSize: "11px", fontWeight: 700 }}>ROLE VIEW:</span>
            <select
              value={userRole}
              onChange={(e) => handleRoleChange(e.target.value as UserRoleOverlay)}
              style={{
                background: "var(--color-slate-surface)",
                color: "var(--color-teal)",
                border: "1px solid var(--color-slate-border)",
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
              background: "var(--color-slate-surface)",
              border: "1px solid var(--color-slate-border)",
              padding: "5px 12px",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--color-green)",
            }}
          >
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--color-green)", boxShadow: "0 0 8px var(--color-green)" }} />
            LIVE ● {currentTime || "19:25"}
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------------- */}
      {/* THREE.JS VIEWPORT & MODULAR PANELS                                  */}
      {/* -------------------------------------------------------------------- */}
      <div className="dt-viewport">
        <Terrain3DViewer
          lighting={lighting}
          autoRotate={autoRotate}
          floodIntensity={floodIntensity}
          role={userRole}
          layers={layers}
          focusPosition={focusPosition}
          onSelectNode={setSelectedNode}
        />

        {/* LEFT PANEL */}
        <div style={{ position: "absolute", top: "16px", left: "16px", zIndex: 20, width: "310px", display: "flex", flexDirection: "column", gap: "10px", maxHeight: "calc(100% - 32px)", overflowY: "auto" }}>
          <LayerPanel
            layers={layers}
            lighting={lighting}
            activeAnalysisMode={activeAnalysisMode}
            onToggleLayer={toggleLayer}
            onSelectAnalysisMode={handleAnalysisModeChange}
            onChangeLighting={setLighting}
          />

          {/* SCENARIO MODE PANEL (FIX #28 & FIX #29) */}
          {mode === "SCENARIO" && (
            <ScenarioModePanel
              rainfall={rainfall}
              dischargeLoad={dischargeLoad}
              riverFlow={riverFlow}
              groundwaterDraft={groundwaterDraft}
              onChangeRainfall={setRainfall}
              onChangeDischargeLoad={setDischargeLoad}
              onChangeRiverFlow={setRiverFlow}
              onChangeGroundwaterDraft={setGroundwaterDraft}
              onRunScenario={handleRunScenario}
            />
          )}

          {/* LIVE EVENT TIMELINE DRAWER (FIX #18) */}
          <div className="dt-card-surface">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--color-teal)", letterSpacing: "0.05em" }}>
                LIVE EVENT TIMELINE
              </div>
              <span style={{ fontSize: "10px", color: "var(--color-green)", fontWeight: 700 }}>● REAL-TIME</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "160px", overflowY: "auto" }}>
              {LIVE_TIMELINE_EVENTS.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => handleTimelineClick(evt)}
                  style={{
                    background: "var(--color-slate-bg)",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    borderLeft: `3px solid ${
                      evt.status === "INVESTIGATE" ? "var(--color-red)" : evt.status === "WARNING" ? "var(--color-amber)" : "var(--color-green)"
                    }`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 700, color: "#ffffff" }}>
                    <span>{evt.symbol} {evt.title}</span>
                    <span style={{ color: "var(--color-slate-muted)" }}>{evt.time}</span>
                  </div>
                  <div style={{ fontSize: "10.5px", color: "var(--color-teal)", marginTop: "2px" }}>
                    {evt.location} · {evt.confidence}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT INSPECTOR PANEL */}
        <InspectorPanel
          selectedNode={selectedNode}
          onClose={() => setSelectedNode(null)}
          onOpenProvenance={() => setIsProvenanceOpen(true)}
        />
      </div>

      {/* FOOTER TELEMETRY STRIP (FIX #17 & FIX #34) */}
      <TelemetryBar
        unitCount={unitCount}
        avgReuse={avgReuse}
        criticalZones={criticalZones}
        activeAlerts={activeAlerts}
      />

      {/* DATA PROVENANCE MODAL (FIX #36 & FIX #37) */}
      <DataProvenanceModal
        isOpen={isProvenanceOpen}
        unitId={selectedNode?.id}
        unitName={selectedNode?.name}
        onClose={() => setIsProvenanceOpen(false)}
      />
    </div>
  );
}
