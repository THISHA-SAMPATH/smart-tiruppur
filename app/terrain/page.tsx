"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type {
  LightingPreset,
  SelectedNodeInfo,
  LayerToggles,
  UserRoleOverlay,
} from "@/components/Terrain3DViewer";
import { geoTo3D } from "@/lib/geo/projection";

const Terrain3DViewer = dynamic(
  () => import("@/components/Terrain3DViewer"),
  {
    ssr: false,
    loading: () => (
      <div
        className="dt-viewport"
        style={{ background: "#f8fafc" }}
      />
    ),
  }
);
import LayerPanel from "@/components/digital-twin/LayerPanel";
import ScenarioModePanel from "@/components/digital-twin/ScenarioModePanel";
import InspectorPanel from "@/components/digital-twin/InspectorPanel";
import TelemetryBar from "@/components/digital-twin/TelemetryBar";
import DataProvenanceModal from "@/components/digital-twin/DataProvenanceModal";
import DigitalTwinSearch from "@/components/digital-twin/DigitalTwinSearch";
import AccessibleTableViewer from "@/components/digital-twin/AccessibleTableViewer";
import DataModelProvenancePanel from "@/components/digital-twin/DataModelProvenancePanel";
import DigitalTwinLegend from "@/components/digital-twin/DigitalTwinLegend";
import SourceBadge from "@/components/provenance/SourceBadge";
import { Layers, Beaker, Sliders, FileText, Camera } from "lucide-react";
import { getGlobalEvents, getUnits, getGroundwaterZones } from "@/lib/api";
import type { SteriCityOverview, SteriScenarioInput } from "@/lib/steri/types";
import "@/app/digital-twin.css";

// Interactive Live Event Timeline Items
const SCENARIO_TIMELINE_EVENTS = [
  {
    id: "evt_001",
    time: "19:20",
    status: "INVESTIGATE",
    symbol: "!",
    title: "Unit 007 Scenario Anomaly",
    location: "Angeripalayam Processing 007",
    lat: 11.1420,
    lon: 77.3310,
    confidence: "Synthetic scenario event",
  },
  {
    id: "evt_002",
    time: "19:15",
    status: "NORMAL",
    symbol: "●",
    title: "Kasipalayam Model Input",
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
    title: "Groundwater Stress Scenario",
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
    title: "Reuse Scenario Indicator",
    location: "Kasipalayam Unit 004",
    lat: 11.1190,
    lon: 77.3950,
    confidence: "Synthetic demonstration event",
  },
];

export default function Terrain3DPage() {
  const [lighting, setLighting] = useState<LightingPreset>("day");
  const [autoRotate, setAutoRotate] = useState(false);
  const [userRole, setUserRole] = useState<UserRoleOverlay>("REGULATOR");

  // Active Decision-Support Task: EXPLORE | TRACE | FLOOD | SCENARIO
  const [activeTask, setActiveTask] = useState<"EXPLORE" | "TRACE" | "FLOOD" | "SCENARIO">("EXPLORE");

  // View Mode: 2.5D | 3D | Table (Overview defaults to 2.5D/3D map without forcing full-screen 3D orbit)
  const [viewMode, setViewMode] = useState<"2.5D" | "3D" | "TABLE">("2.5D");

  // Mode Switch: BASELINE vs SCENARIO
  const [mode, setMode] = useState<"BASELINE" | "SCENARIO">("BASELINE");

  // Left Rail & Panel State
  const [activeRailTab, setActiveRailTab] = useState<"layers" | "analysis" | "scenario" | "provenance" | null>("layers");

  // Scenario Mode Parameters
  const [rainfall, setRainfall] = useState<number>(120);
  const [dischargeLoad, setDischargeLoad] = useState<number>(100);
  const [riverFlow, setRiverFlow] = useState<number>(110);
  const [groundwaterDraft, setGroundwaterDraft] = useState<number>(110);
  const [floodIntensity, setFloodIntensity] = useState<number>(0.35);
  const [steriOverview, setSteriOverview] = useState<SteriCityOverview | null>(null);
  const [steriBaseline, setSteriBaseline] = useState<SteriCityOverview | null>(null);
  const [steriUnavailable, setSteriUnavailable] = useState(false);
  const [compareWithBaseline, setCompareWithBaseline] = useState(false);

  // Focus Position for Camera Lerp
  const [focusPosition, setFocusPosition] = useState<{ x: number; y: number; z: number } | null>(null);

  // Analysis Modes State
  const [activeAnalysisMode, setActiveAnalysisMode] = useState<string>("baseline");

  // Interaction Analysis Mode: EXPLORE | TRACE | RISK
  const [interactionMode, setInteractionMode] = useState<"EXPLORE" | "TRACE" | "RISK">("EXPLORE");

  // Layer Toggles State (Physical City dominant by default in Explore mode)
  const [layers, setLayers] = useState<LayerToggles>({
    terrain: true,
    contours: true,
    river: true,
    drainage: true,
    roads: true,
    buildings: true,
    units: true,
    dischargePaths: false,
    infrastructure: true,
    vegetation: true,
    sensors: true,
    groundwater: false,
    floodRisk: false,
    pollution: false,
    sourceSensorInfluence: false,
    steriRisk: false,
  });

  // Dynamic KPI Data
  const [unitCount, setUnitCount] = useState<number>(12);
  const [activeAlerts, setActiveAlerts] = useState<number>(1);
  const [avgReuse, setAvgReuse] = useState<number>(91);
  const [criticalZones, setCriticalZones] = useState<number>(3);

  // Inspector & Data Provenance Modal State (Startup default: NO selection, inspector hidden)
  const [selectedNode, setSelectedNode] = useState<SelectedNodeInfo | null>(null);
  const [isProvenanceOpen, setIsProvenanceOpen] = useState<boolean>(false);

  useEffect(() => {
    const controller = new AbortController();
    const scenario: SteriScenarioInput = mode === "SCENARIO" ? {
      floodPreset: rainfall >= 200 ? "EXTREME_RAIN" : rainfall >= 125 ? "HEAVY_RAIN" : rainfall >= 50 ? "MODERATE_RAIN" : "BASELINE",
      rainfallPctChange: Math.round(((rainfall - 50) / 50) * 100),
      industrialLoadPctChange: dischargeLoad - 100,
      pollutionLoadPctChange: dischargeLoad - 100,
      groundwaterExtractionPctChange: groundwaterDraft - 100,
    } : { floodPreset: "BASELINE", rainfallPctChange: 0, industrialLoadPctChange: 0, pollutionLoadPctChange: 0, groundwaterExtractionPctChange: 0 };
    const postSteri = async (body: object) => {
      const response = await fetch("/api/steri", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
      if (!response.ok) throw new Error("STERI API request failed");
      return response.json() as Promise<SteriCityOverview>;
    };
    void Promise.all([postSteri({ scenario }), postSteri({ scenario: { floodPreset: "BASELINE", rainfallPctChange: 0, industrialLoadPctChange: 0, pollutionLoadPctChange: 0, groundwaterExtractionPctChange: 0 } })])
      .then(([current, baseline]) => {
        if (!controller.signal.aborted) {
          setSteriOverview(current);
          setSteriBaseline(baseline);
          setSteriUnavailable(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSteriOverview(null);
          setSteriBaseline(null);
          setSteriUnavailable(true);
        }
      });
    return () => controller.abort();
  }, [mode, rainfall, dischargeLoad, groundwaterDraft]);

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

  // Esc Keyboard Shortcut Listener to Exit Active Task Focus Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeTask !== "EXPLORE" || selectedNode !== null) {
          handleSelectTask("EXPLORE");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTask, selectedNode]);



  const handleSelectTask = (task: "EXPLORE" | "TRACE" | "FLOOD" | "SCENARIO") => {
    setActiveTask(task);
    setSelectedNode(null);

    switch (task) {
      case "EXPLORE":
        setInteractionMode("EXPLORE");
        setViewMode("2.5D");
        setMode("BASELINE");
        setCompareWithBaseline(false);
        setLayers({
          terrain: true,
          contours: true,
          river: true,
          drainage: true,
          roads: true,
          buildings: true,
          units: true,
          dischargePaths: false,
          infrastructure: true,
          vegetation: true,
          sensors: true,
          groundwater: false,
          floodRisk: false,
          pollution: false,
          sourceSensorInfluence: false,
          steriRisk: false,
        });
        {
          const centerPos = geoTo3D(11.1085, 77.3411, 0);
          setFocusPosition({ x: centerPos.x, y: centerPos.y, z: centerPos.z });
        }
        break;

      case "TRACE":
        setInteractionMode("TRACE");
        setViewMode("3D");
        setMode("BASELINE");
        setActiveRailTab("analysis");
        setLayers((prev) => ({
          ...prev,
          dischargePaths: true,
          pollution: true,
          sensors: true,
          sourceSensorInfluence: true,
        }));
        // Fly camera to Angeripalayam Processing Unit 007 for simulated trace
        {
          const sourcePos = geoTo3D(11.1420, 77.3310, 0);
          setFocusPosition({ x: sourcePos.x, y: sourcePos.y, z: sourcePos.z });
        }
        break;

      case "FLOOD":
        setInteractionMode("EXPLORE");
        setViewMode("3D");
        setMode("SCENARIO");
        setActiveRailTab("scenario");
        setFloodIntensity(0.45);
        setLayers((prev) => ({
          ...prev,
          floodRisk: true,
          contours: true,
          buildings: true,
          river: true,
        }));
        {
          const floodPos = geoTo3D(11.11975, 77.39716, 0);
          setFocusPosition({ x: floodPos.x, y: floodPos.y, z: floodPos.z });
        }
        break;

      case "SCENARIO":
        setInteractionMode("RISK");
        setViewMode("3D");
        setMode("SCENARIO");
        setCompareWithBaseline(true);
        setActiveRailTab("scenario");
        setLayers((prev) => ({
          ...prev,
          steriRisk: true,
          groundwater: true,
          buildings: true,
          river: true,
        }));
        {
          const scenarioPos = geoTo3D(11.1085, 77.3411, 0);
          setFocusPosition({ x: scenarioPos.x, y: scenarioPos.y, z: scenarioPos.z });
        }
        break;
    }
  };

  const handleInteractionModeChange = (newMode: "EXPLORE" | "TRACE" | "RISK") => {
    setInteractionMode(newMode);
    if (newMode === "RISK") {
      setLayers((prev) => ({ ...prev, steriRisk: true, groundwater: true }));
    } else if (newMode === "TRACE") {
      setLayers((prev) => ({ ...prev, dischargePaths: true, pollution: true }));
    } else if (newMode === "EXPLORE") {
      setLayers((prev) => ({ ...prev, steriRisk: false, groundwater: false }));
    }
  };

  const toggleLayer = (key: keyof LayerToggles) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSearchResult = (item: { lat: number; lon: number; name: string }) => {
    const pos = geoTo3D(item.lat, item.lon, 0);
    setFocusPosition({ x: pos.x, y: pos.y, z: pos.z });
    setViewMode("3D");
  };

  const handleLocateMe = () => {
    const pos = geoTo3D(11.1085, 77.3411, 0);
    setFocusPosition({ x: pos.x, y: pos.y, z: pos.z });
  };

  const handleResetView = () => {
    handleSelectTask("EXPLORE");
  };

  const handleOpen3DArea = () => {
    setViewMode("3D");
    if (selectedNode && selectedNode.latitude && selectedNode.longitude) {
      const pos = geoTo3D(selectedNode.latitude, selectedNode.longitude, 0);
      setFocusPosition({ x: pos.x, y: pos.y, z: pos.z });
    }
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

  const handleAnalysisModeChange = (modeKey: "baseline" | "steri" | "water" | "groundwater" | "flood" | "compliance") => {
    setActiveAnalysisMode(modeKey);
    switch (modeKey) {
      case "baseline":
        setLayers({ terrain: true, contours: true, river: true, units: true, sensors: true, groundwater: false, floodRisk: false, pollution: false });
        break;
      case "steri":
        setLayers({ terrain: true, contours: true, river: true, units: true, sensors: true, groundwater: true, floodRisk: true, pollution: true, steriRisk: true });
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
    <div className="twin-page dt-container" style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      {/* -------------------------------------------------------------------- */}
      {/* 1. 56PX MAIN NAVIGATION HEADER                                       */}
      {/* -------------------------------------------------------------------- */}
      <header
        style={{
          height: "56px",
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 10,
          flexShrink: 0,
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ background: "#0f766e", color: "#ffffff", padding: "3px 7px", borderRadius: "4px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.5px" }}>
            DECISION-SUPPORT
          </span>
          <div>
            <h1 style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a", margin: 0, lineHeight: 1.2 }}>
              Tiruppur Environmental Digital Twin
            </h1>
            <p style={{ fontSize: "10px", color: "#64748b", margin: 0 }}>
              Guided spatial decision support & scenario analysis
            </p>
          </div>
        </div>

        {/* Compact summary state metrics */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
            <span style={{ color: "#64748b", fontWeight: 500 }}>STERI Score:</span>
            <strong style={{ color: "#0f172a" }}>{steriOverview?.citywideScore ? steriOverview.citywideScore.toFixed(3) : "0.542"}</strong>
            <SourceBadge type="MODELLED" />
          </div>
          <div style={{ height: "14px", width: "1px", background: "#cbd5e1" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
            <span style={{ color: "#64748b", fontWeight: 500 }}>High-Risk Sectors:</span>
            <strong style={{ color: "#b91c1c" }}>{steriOverview?.units.filter((u) => u.riskCategory === "HIGH" || u.riskCategory === "VERY HIGH" || u.riskCategory === "CRITICAL").length ?? 3} / 6</strong>
            <SourceBadge type="MODELLED" />
          </div>
          <div style={{ height: "14px", width: "1px", background: "#cbd5e1" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
            <span style={{ color: "#64748b", fontWeight: 500 }}>Facilities:</span>
            <strong style={{ color: "#0f172a" }}>{unitCount}</strong>
            <SourceBadge type="SIMULATED" />
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------------- */}
      {/* 2. FULL VIEWPORT CANVAS WORKSPACE (height: calc(100vh - 56px))       */}
      {/* -------------------------------------------------------------------- */}
      <div style={{ height: "calc(100vh - 56px)", width: "100%", position: "relative", overflow: "hidden", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* SINGLE COMPACT FLOATING TOOLBAR WITH GUIDED TASKS CHIP ROW */}
        <div className="dt-toolbar" role="toolbar" aria-label="Digital Twin Controls Toolbar" style={{ margin: "10px 14px", position: "absolute", top: 0, left: 0, right: 0, zIndex: 30 }}>
          <DigitalTwinSearch onSelectResult={handleSearchResult} onLocateMe={handleLocateMe} />

          {/* Compact Guided Tasks Chip Row */}
          <div className="dt-toolbar-group" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", paddingRight: "4px", textTransform: "uppercase" }}>Guided tasks:</span>
            <button
              type="button"
              className={`dt-btn ${activeTask === "EXPLORE" ? "active" : ""}`}
              style={{ padding: "4px 10px", fontSize: "11px", fontWeight: activeTask === "EXPLORE" ? 700 : 500 }}
              onClick={() => handleSelectTask("EXPLORE")}
            >
              🗺️ Explore
            </button>
            <button
              type="button"
              className={`dt-btn ${activeTask === "TRACE" ? "active" : ""}`}
              style={{ padding: "4px 10px", fontSize: "11px", fontWeight: activeTask === "TRACE" ? 700 : 500 }}
              onClick={() => handleSelectTask("TRACE")}
            >
              🌊 Trace pollution
            </button>
            <button
              type="button"
              className={`dt-btn ${activeTask === "FLOOD" ? "active" : ""}`}
              style={{ padding: "4px 10px", fontSize: "11px", fontWeight: activeTask === "FLOOD" ? 700 : 500 }}
              onClick={() => handleSelectTask("FLOOD")}
            >
              🌧️ Flood exposure
            </button>
            <button
              type="button"
              className={`dt-btn ${activeTask === "SCENARIO" ? "active" : ""}`}
              style={{ padding: "4px 10px", fontSize: "11px", fontWeight: activeTask === "SCENARIO" ? 700 : 500 }}
              onClick={() => handleSelectTask("SCENARIO")}
            >
              📊 Compare scenario
            </button>
          </div>

          {/* View Mode Switcher: Overview (2.5D) | Focused 3D | Table */}
          <div className="dt-toolbar-group">
            <button
              type="button"
              className={`dt-btn ${viewMode === "2.5D" ? "active" : ""}`}
              style={{ padding: "4px 9px", fontSize: "11px" }}
              onClick={() => setViewMode("2.5D")}
            >
              Overview (2.5D)
            </button>
            <button
              type="button"
              className={`dt-btn ${viewMode === "3D" ? "active" : ""}`}
              style={{ padding: "4px 9px", fontSize: "11px" }}
              onClick={() => setViewMode("3D")}
            >
              Focused 3D
            </button>
            <button
              type="button"
              className={`dt-btn ${viewMode === "TABLE" ? "active" : ""}`}
              style={{ padding: "4px 9px", fontSize: "11px" }}
              onClick={() => setViewMode("TABLE")}
            >
              Table
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="dt-toolbar-group">
            <button
              type="button"
              className={`dt-btn ${mode === "BASELINE" ? "active" : ""}`}
              style={{ padding: "4px 9px", fontSize: "11px" }}
              onClick={() => setMode("BASELINE")}
            >
              Baseline
            </button>
            <button
              type="button"
              className={`dt-btn ${mode === "SCENARIO" ? "active" : ""}`}
              style={{ padding: "4px 9px", fontSize: "11px" }}
              onClick={() => {
                setMode("SCENARIO");
                setActiveRailTab("scenario");
              }}
            >
              Scenario
            </button>
          </div>

          {/* Clean Camera Fit / Reset & Role Controls */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center", marginLeft: "auto" }}>
            <button type="button" className="dt-btn" style={{ padding: "4px 8px", fontSize: "10.5px" }} onClick={handleLocateMe} title="Fit Tiruppur Urban Center">
              📍 Fit Tiruppur
            </button>
            <button type="button" className="dt-btn" style={{ padding: "4px 8px", fontSize: "10.5px" }} onClick={handleResetView} title="Reset View to Overview">
              🎯 Reset View
            </button>
            <select
              value={userRole}
              onChange={(e) => handleRoleChange(e.target.value as UserRoleOverlay)}
              className="dt-toolbar-select"
              aria-label="Select User Role View"
            >
              <option value="REGULATOR">Regulator View</option>
              <option value="GROUNDWATER_OFFICER">GW Officer View</option>
              <option value="INDUSTRY">Industry View</option>
              <option value="CITIZEN">Citizen View</option>
            </select>
            <button
              type="button"
              className="dt-btn"
              style={{ padding: "4px 8px", fontSize: "10.5px" }}
              onClick={() => window.dispatchEvent(new CustomEvent("export-dt-figure"))}
              title="Download Scientific PNG Figure"
              aria-label="Download Figure PNG"
            >
              <Camera size={13} /> Figure
            </button>
          </div>
        </div>

      {/* -------------------------------------------------------------------- */}
      {/* VIEWPORT CONTENT (MAP OR TABLE)                                      */}
      {/* -------------------------------------------------------------------- */}
      {viewMode === "TABLE" ? (
        <AccessibleTableViewer />
      ) : (
        <div className="dt-viewport" style={{ flex: 1, position: "relative" }}>
          {/* 3D / 2.5D Map Canvas Viewer */}
          <Terrain3DViewer
            lighting={lighting}
            autoRotate={autoRotate}
            floodIntensity={floodIntensity}
            role={userRole}
            layers={layers}
            interactionMode={interactionMode}
            selectedNode={selectedNode}
            viewMode={viewMode}
            focusPosition={focusPosition}
            steriOverview={steriOverview}
            steriBaseline={compareWithBaseline ? steriBaseline : null}
            onSelectNode={setSelectedNode}
            onExitTrace={() => {
              handleSelectTask("EXPLORE");
            }}
          />

          {/* Compact On-Map Legend Card */}
          <DigitalTwinLegend interactionMode={interactionMode} isRiskActive={layers.steriRisk} />

          {/* -------------------------------------------------------------------- */}
          {/* LEFT 48PX ICON RAIL                                                  */}
          {/* -------------------------------------------------------------------- */}
          <nav className="dt-icon-rail" aria-label="Layer Navigation Rail">
            <button
              type="button"
              className={`dt-rail-btn ${activeRailTab === "layers" ? "active" : ""}`}
              onClick={() => setActiveRailTab(activeRailTab === "layers" ? null : "layers")}
              title="View Layers"
              aria-label="View Layers"
              aria-expanded={activeRailTab === "layers"}
            >
              <Layers size={20} />
            </button>
            <button
              type="button"
              className={`dt-rail-btn ${activeRailTab === "analysis" ? "active" : ""}`}
              onClick={() => setActiveRailTab(activeRailTab === "analysis" ? null : "analysis")}
              title="Analysis Modes"
              aria-label="Analysis Modes"
              aria-expanded={activeRailTab === "analysis"}
            >
              <Beaker size={20} />
            </button>
            <button
              type="button"
              className={`dt-rail-btn ${activeRailTab === "scenario" ? "active" : ""}`}
              onClick={() => setActiveRailTab(activeRailTab === "scenario" ? null : "scenario")}
              title="Scenario Simulator"
              aria-label="Scenario Simulator"
              aria-expanded={activeRailTab === "scenario"}
            >
              <Sliders size={20} />
            </button>
            <button
              type="button"
              className={`dt-rail-btn ${activeRailTab === "provenance" ? "active" : ""}`}
              onClick={() => setActiveRailTab(activeRailTab === "provenance" ? null : "provenance")}
              title="Data Provenance"
              aria-label="Data Provenance"
              aria-expanded={activeRailTab === "provenance"}
            >
              <FileText size={20} />
            </button>
          </nav>

          {/* -------------------------------------------------------------------- */}
          {/* EXPANDABLE 320PX LEFT PANEL                                           */}
          {/* -------------------------------------------------------------------- */}
          {activeRailTab !== null && (
            <div style={{ position: "relative" }}>
              <LayerPanel
                layers={layers}
                lighting={lighting}
                activeAnalysisMode={activeAnalysisMode}
                onToggleLayer={toggleLayer}
                onSelectAnalysisMode={handleAnalysisModeChange}
                onChangeLighting={setLighting}
                compareWithBaseline={compareWithBaseline}
                onChangeCompareWithBaseline={setCompareWithBaseline}
                steriDataUnavailable={steriUnavailable}
                onClose={() => setActiveRailTab(null)}
              />

              {/* FLOATING SUB-PANELS ACCORDING TO ACTIVE RAIL TAB */}
              <div style={{ position: "absolute", top: "68px", left: "68px", zIndex: 26, width: "320px", display: "flex", flexDirection: "column", gap: "10px", pointerEvents: "none" }}>
                <div style={{ pointerEvents: "auto" }}>
                  {mode === "SCENARIO" && activeRailTab === "scenario" && (
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

                  {activeRailTab === "provenance" && (
                    <DataModelProvenancePanel steriOverview={steriOverview} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------------- */}
          {/* RIGHT INSPECTOR PANEL (Slide-in 360px, ONLY when entity selected)    */}
          {/* -------------------------------------------------------------------- */}
          <InspectorPanel
            selectedNode={selectedNode}
            viewMode={viewMode}
            onClose={() => setSelectedNode(null)}
            onOpenProvenance={() => setIsProvenanceOpen(true)}
            onTraceToRiver={() => {
              handleSelectTask("TRACE");
            }}
            onShowDownstreamSensors={() => {
              handleSelectTask("TRACE");
              setLayers((prev) => ({ ...prev, sensors: true, sourceSensorInfluence: true }));
            }}
          />
        </div>
      )}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* BOTTOM TELEMETRY STRIP WITH SCENARIO SCRUBBER CONTROLS               */}
      {/* -------------------------------------------------------------------- */}
      <TelemetryBar
        unitCount={unitCount}
        avgReuse={avgReuse}
        criticalZones={criticalZones}
        activeAlerts={activeAlerts}
        isScenarioMode={mode === "SCENARIO"}
      />

      {/* DATA PROVENANCE MODAL */}
      <DataProvenanceModal
        isOpen={isProvenanceOpen}
        unitId={selectedNode?.id}
        unitName={selectedNode?.name}
        onClose={() => setIsProvenanceOpen(false)}
      />
    </div>
  );
}

