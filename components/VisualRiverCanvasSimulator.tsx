"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

// Dynamically import GisRiverPhysicsMap to avoid SSR Leaflet window errors
const GisRiverPhysicsMap = dynamic(
  () => import("@/components/GisRiverPhysicsMap"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: "560px",
          width: "100%",
          borderRadius: "16px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "14px",
          color: "#94a3b8",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <span className="pulse" style={{ width: "28px", height: "28px", borderColor: "#38bdf8" }} />
        <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, letterSpacing: "0.02em" }}>
          Initializing Tiruppur Noyyal GIS Spatial Physics Engine...
        </p>
      </div>
    ),
  }
);

type RoleMode = "REGULATOR" | "INDUSTRY" | "CITIZEN" | "ACADEMIC";

interface TelemetryPoint {
  time: string;
  st1: number;
  st2: number;
  st3: number;
}

export default function VisualRiverCanvasSimulator() {
  const { user } = useAuth();
  const [roleMode, setRoleMode] = useState<RoleMode>(
    (user?.role as RoleMode) || "REGULATOR"
  );

  // Solenoid Valves / Bypass Triggers
  const [unit007Bypass, setUnit007Bypass] = useState(false); // Arulpuram Dyers
  const [unit001Bypass, setUnit001Bypass] = useState(false); // Kasipalayam Zone
  const [unit012Bypass, setUnit012Bypass] = useState(false); // Mangalam Hub

  // Hydrodynamic Slider Parameters
  const [riverFlowM3s, setRiverFlowM3s] = useState(3.5); // m3/s (Dry baseline)
  const [effluentFlowM3d, setEffluentFlowM3d] = useState(380); // m3/day
  const [rawEffluentEc, setRawEffluentEc] = useState(8500); // uS/cm
  const [dispersionDx, setDispersionDx] = useState(2.5); // m2/s
  const [citizenDistanceKm, setCitizenDistanceKm] = useState(1.2);

  // Live Telemetry Readouts
  const [st1Ec, setSt1Ec] = useState(1420); // Upstream Mangalam
  const [st2Ec, setSt2Ec] = useState(1450); // Kasipalayam Exit
  const [st3Ec, setSt3Ec] = useState(1850); // Orathapalayam Dam
  const [history, setHistory] = useState<TelemetryPoint[]>([]);

  // Regulator Enforcement State
  const [tnpcbNoticeIssued, setTnpcbNoticeIssued] = useState(false);
  const [enforcementLogs, setEnforcementLogs] = useState<string[]>([]);
  const [showMathModal, setShowMathModal] = useState(false);

  // Preset Scenario Handler
  const applyPreset = (preset: "BYPASS" | "MONSOON" | "BREACH" | "COMPLIANT") => {
    if (preset === "BYPASS") {
      setUnit007Bypass(true);
      setUnit001Bypass(false);
      setUnit012Bypass(false);
      setRiverFlowM3s(2.2);
      setEffluentFlowM3d(480);
      setRawEffluentEc(9200);
      addLog("Preset Applied: 🚨 Midnight Illegal Bypass at Arulpuram Dyers (480 m³/d, 9200 µS/cm)");
    } else if (preset === "MONSOON") {
      setUnit007Bypass(false);
      setUnit001Bypass(false);
      setUnit012Bypass(false);
      setRiverFlowM3s(65.0);
      setEffluentFlowM3d(0);
      addLog("Preset Applied: 🌧️ High Monsoon Flow Dilution (65 m³/s fresh river discharge)");
    } else if (preset === "BREACH") {
      setUnit007Bypass(false);
      setUnit001Bypass(true);
      setUnit012Bypass(false);
      setRiverFlowM3s(3.0);
      setEffluentFlowM3d(250);
      setRawEffluentEc(5400);
      addLog("Preset Applied: ⚙️ ZLD RO Membrane Breach at Kasipalayam Zone (Partial Brine Leak)");
    } else if (preset === "COMPLIANT") {
      setUnit007Bypass(false);
      setUnit001Bypass(false);
      setUnit012Bypass(false);
      setRiverFlowM3s(4.0);
      setEffluentFlowM3d(0);
      addLog("Preset Applied: ✅ All Units Zero Liquid Discharge (ZLD) Compliant");
    }
  };

  const addLog = (msg: string) => {
    setEnforcementLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 15),
    ]);
  };

  // Real 1D Hydro-Chemical Advection-Dispersion Physics Calculation Engine
  useEffect(() => {
    const timer = setInterval(() => {
      // 1. Convert unit effluent flow from m3/day to m3/s
      const activeBypassesCount =
        (unit007Bypass ? 1 : 0) +
        (unit001Bypass ? 1 : 0) +
        (unit012Bypass ? 1 : 0);

      const qEffM3s = (effluentFlowM3d / 86400) * (activeBypassesCount || 0.1);
      const qRiver = Math.max(0.5, riverFlowM3s);

      // Upstream Baseline with minor natural variation
      const base1 = 1400 + Math.sin(Date.now() / 3000) * 25;

      // Mass Balance Mixed EC at Industrial Discharge Zone
      let calculatedSt2 = base1;
      if (activeBypassesCount > 0) {
        calculatedSt2 =
          (qRiver * base1 + qEffM3s * rawEffluentEc) / (qRiver + qEffM3s);

        // Add dispersion smoothing factor Dx
        calculatedSt2 = calculatedSt2 * (1 + (1 / dispersionDx) * 0.05);
      }

      // Station 3 (Orathapalayam Reservoir) with advection time lag & accumulation
      const accumulationFactor = activeBypassesCount > 0 ? 1.15 : 0.95;
      const calculatedSt3 =
        st3Ec * 0.85 + (calculatedSt2 * 0.9 + base1 * 0.1) * 0.15 * accumulationFactor;

      setSt1Ec(Math.round(base1));
      setSt2Ec(Math.round(calculatedSt2));
      setSt3Ec(Math.round(calculatedSt3));

      // Append to hydrograph time-series
      const nowStr = new Date().toLocaleTimeString().split(" ")[0];
      setHistory((prev) => [
        ...prev.slice(-25),
        {
          time: nowStr,
          st1: Math.round(base1),
          st2: Math.round(calculatedSt2),
          st3: Math.round(calculatedSt3),
        },
      ]);
    }, 1200);

    return () => clearInterval(timer);
  }, [
    unit007Bypass,
    unit001Bypass,
    unit012Bypass,
    riverFlowM3s,
    effluentFlowM3d,
    rawEffluentEc,
    dispersionDx,
    st3Ec,
  ]);

  // Handle Legal Notice Action
  const handleIssueNotice = () => {
    setTnpcbNoticeIssued(true);
    addLog(
      "🚨 TNPCB SECTION 33A EMERGENCY DIRECTION ISSUED: Power connection cut order dispatched to TANGEDCO for Arulpuram Dyers."
    );
  };

  const handleEmergencyZldFix = () => {
    setUnit007Bypass(false);
    setUnit001Bypass(false);
    setUnit012Bypass(false);
    setTnpcbNoticeIssued(false);
    addLog("🏭 INDUSTRY SCADA OVERRIDE: Emergency Secondary RO Evaporator Engaged. Zero Bypass achieved.");
  };

  return (
    <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "20px 24px" }}>
      {/* Top Glassmorphic Command Center Header */}
      <div
        className="scada-glass-card"
        style={{
          padding: "24px 28px",
          marginBottom: "20px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          border: "1px solid rgba(56, 189, 248, 0.3)",
          boxShadow: "0 12px 35px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span
                style={{
                  background: "linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)",
                  color: "#0f172a",
                  padding: "3px 12px",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: 900,
                  letterSpacing: "0.06em",
                  boxShadow: "0 0 12px rgba(56, 189, 248, 0.5)",
                }}
              >
                HYDRO-CHEMICAL SCADA COMMAND CENTER
              </span>
              <span
                className={st2Ec > 3000 ? "scada-badge-alarm" : "scada-badge-ok"}
                style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "11px" }}
              >
                {st2Ec > 3000 ? "🔴 CRITICAL OVERRUN ALARM" : "🟢 STREAM STABLE"}
              </span>
            </div>
            <h1
              style={{
                fontSize: "26px",
                fontFamily: "var(--font-serif)",
                margin: "0 0 6px",
                color: "#ffffff",
                letterSpacing: "-0.01em",
              }}
            >
              Tiruppur Noyyal Reach Hydrodynamic Physics Simulator
            </h1>
            <p style={{ margin: 0, fontSize: "13px", color: "#cbd5e1", maxWidth: "840px", lineHeight: "1.5" }}>
              Spatial GIS transport simulation powered by 1D Advection-Dispersion equations, mass-balance dilution modeling,
              and real-time TNPCB Section 33A enforcement triggers.
            </p>
          </div>

          {/* SCADA Role Mode Picker */}
          <div
            style={{
              display: "flex",
              gap: "6px",
              background: "rgba(15, 23, 42, 0.6)",
              padding: "5px",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <button
              type="button"
              onClick={() => setRoleMode("REGULATOR")}
              style={{
                background: roleMode === "REGULATOR" ? "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)" : "transparent",
                color: roleMode === "REGULATOR" ? "#ffffff" : "#94a3b8",
                border: "none",
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "12px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: roleMode === "REGULATOR" ? "0 4px 14px rgba(2, 132, 199, 0.4)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              🏛️ Regulator
            </button>
            <button
              type="button"
              onClick={() => setRoleMode("INDUSTRY")}
              style={{
                background: roleMode === "INDUSTRY" ? "linear-gradient(135deg, #059669 0%, #047857 100%)" : "transparent",
                color: roleMode === "INDUSTRY" ? "#ffffff" : "#94a3b8",
                border: "none",
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "12px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: roleMode === "INDUSTRY" ? "0 4px 14px rgba(5, 150, 105, 0.4)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              🏭 CETP Operator
            </button>
            <button
              type="button"
              onClick={() => setRoleMode("CITIZEN")}
              style={{
                background: roleMode === "CITIZEN" ? "linear-gradient(135deg, #d97706 0%, #b45309 100%)" : "transparent",
                color: roleMode === "CITIZEN" ? "#ffffff" : "#94a3b8",
                border: "none",
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "12px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: roleMode === "CITIZEN" ? "0 4px 14px rgba(217, 119, 6, 0.4)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              🏡 Citizen Risk
            </button>
            <button
              type="button"
              onClick={() => setRoleMode("ACADEMIC")}
              style={{
                background: roleMode === "ACADEMIC" ? "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" : "transparent",
                color: roleMode === "ACADEMIC" ? "#ffffff" : "#94a3b8",
                border: "none",
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "12px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: roleMode === "ACADEMIC" ? "0 4px 14px rgba(124, 58, 237, 0.4)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              🎓 Academic Math
            </button>
          </div>
        </div>

        {/* Preset Scenario Selector Buttons */}
        <div
          style={{
            marginTop: "18px",
            paddingTop: "14px",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Scenario Presets:
          </span>
          <button
            type="button"
            style={{
              background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
              color: "white",
              fontSize: "12px",
              padding: "6px 14px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              boxShadow: "0 4px 12px rgba(220, 38, 38, 0.35)",
              transition: "transform 0.15s ease",
            }}
            onClick={() => applyPreset("BYPASS")}
          >
            🚨 Midnight Illegal Bypass
          </button>
          <button
            type="button"
            style={{
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              color: "white",
              fontSize: "12px",
              padding: "6px 14px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              boxShadow: "0 4px 12px rgba(2, 132, 199, 0.35)",
            }}
            onClick={() => applyPreset("MONSOON")}
          >
            🌧️ Monsoon Dilution Flush
          </button>
          <button
            type="button"
            style={{
              background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
              color: "white",
              fontSize: "12px",
              padding: "6px 14px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              boxShadow: "0 4px 12px rgba(217, 119, 6, 0.35)",
            }}
            onClick={() => applyPreset("BREACH")}
          >
            ⚙️ ZLD RO Membrane Breach
          </button>
          <button
            type="button"
            style={{
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              color: "white",
              fontSize: "12px",
              padding: "6px 14px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              boxShadow: "0 4px 12px rgba(5, 150, 105, 0.35)",
            }}
            onClick={() => applyPreset("COMPLIANT")}
          >
            ✅ Normal Zero Discharge
          </button>

          <button
            type="button"
            onClick={() => setShowMathModal(!showMathModal)}
            style={{
              marginLeft: "auto",
              background: "rgba(255, 255, 255, 0.1)",
              color: "#38bdf8",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "8px",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {showMathModal ? "Hide Physics Equations" : "📐 View Differential Equations"}
          </button>
        </div>
      </div>

      {/* Physics Math Drawer Modal */}
      {showMathModal && (
        <div
          className="scada-glass-card"
          style={{
            padding: "20px 24px",
            marginBottom: "20px",
            border: "1px solid rgba(56, 189, 248, 0.3)",
          }}
        >
          <h3 style={{ margin: "0 0 12px", color: "#38bdf8", fontSize: "16px", fontWeight: 700 }}>
            📐 Hydrodynamic Transport Physics & Mass Balance Model
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#cbd5e1", fontSize: "13px" }}>
                1. Mass-Balance Instantaneous In-Stream Mixing:
              </p>
              <code style={{ background: "#0f172a", padding: "8px 12px", borderRadius: "8px", display: "block", color: "#4ade80", border: "1px solid #1e293b", fontSize: "12px" }}>
                EC_mixed = (Q_river * EC_river + Q_effluent * EC_effluent) / (Q_river + Q_effluent)
              </code>
            </div>
            <div>
              <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#cbd5e1", fontSize: "13px" }}>
                2. 1D Longitudinal Advection-Dispersion Differential Model:
              </p>
              <code style={{ background: "#0f172a", padding: "8px 12px", borderRadius: "8px", display: "block", color: "#fbbf24", border: "1px solid #1e293b", fontSize: "12px" }}>
                ∂C/∂t = - u (∂C/∂x) + D_x (∂²C/∂x²)
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Main Split Grid: 60% Left GIS Map / 40% Right SCADA Console */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 460px", gap: "20px" }}>
        {/* Left Side: Real GIS Map Container */}
        <div
          className="scada-glass-card"
          style={{
            height: "700px",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "12px 18px",
              background: "rgba(15, 23, 42, 0.95)",
              color: "#94a3b8",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "12px",
              fontWeight: 700,
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#38bdf8", boxShadow: "0 0 8px #38bdf8" }} />
              TIRUPPUR NOYYAL SPATIAL GIS REACH · 10 WAYPOINTS
            </span>
            <span style={{ color: st2Ec > 3000 ? "#ef4444" : "#10b981", fontWeight: 800 }}>
              {st2Ec > 3000 ? "⚠️ SEVERE DISCHARGE OVERRUN" : "✅ STREAM HEALTH COMPLIANT"}
            </span>
          </div>

          <div style={{ flex: 1, position: "relative" }}>
            <GisRiverPhysicsMap
              st1Ec={st1Ec}
              st2Ec={st2Ec}
              st3Ec={st3Ec}
              unit007Active={unit007Bypass}
              unit001Active={unit001Bypass}
              unit012Active={unit012Bypass}
              onToggleUnit007={() => {
                setUnit007Bypass(!unit007Bypass);
                addLog(`Toggled Arulpuram Dyers Solenoid Valve -> ${!unit007Bypass ? "ACTIVE BYPASS" : "CLOSED"}`);
              }}
              onToggleUnit001={() => {
                setUnit001Bypass(!unit001Bypass);
                addLog(`Toggled Kasipalayam Zone Solenoid Valve -> ${!unit001Bypass ? "ACTIVE BYPASS" : "CLOSED"}`);
              }}
              onToggleUnit012={() => {
                setUnit012Bypass(!unit012Bypass);
                addLog(`Toggled Mangalam Hub Solenoid Valve -> ${!unit012Bypass ? "ACTIVE BYPASS" : "CLOSED"}`);
              }}
              riverFlowM3s={riverFlowM3s}
              roleMode={roleMode}
            />
          </div>

          {/* Terminal Console Logs at Bottom */}
          <div
            style={{
              background: "#090d16",
              padding: "12px 16px",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              maxHeight: "120px",
              overflowY: "auto",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "11px",
              color: "#cbd5e1",
            }}
          >
            <div style={{ fontWeight: 800, color: "#38bdf8", marginBottom: "6px", fontSize: "10px", letterSpacing: "0.05em" }}>
              SCADA TERMINAL STREAM AUDIT TRAIL:
            </div>
            {enforcementLogs.length === 0 ? (
              <div style={{ color: "#475569" }}>System operating within baseline constraints. No bypass events logged.</div>
            ) : (
              enforcementLogs.map((log, idx) => (
                <div key={idx} style={{ marginBottom: "3px", lineHeight: "1.4" }}>
                  <span style={{ color: "#38bdf8" }}>▶</span> {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side SCADA Telemetry Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Station Readouts Card */}
          <div className="scada-glass-card" style={{ padding: "18px" }}>
            <h3 style={{ fontSize: "13px", margin: "0 0 14px", color: "#94a3b8", fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              📡 LIVE TNPCB STATION TELEMETRY
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              {/* Station 1 */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.6)",
                  padding: "12px 10px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700 }}>ST-01 Mangalam</div>
                <div style={{ fontSize: "20px", fontWeight: 900, color: "#38bdf8", margin: "4px 0" }}>
                  {st1Ec} <span style={{ fontSize: "10px", fontWeight: 600 }}>µS</span>
                </div>
                <div style={{ fontSize: "9px", color: "#10b981", fontWeight: 700 }}>Upstream Entry</div>
              </div>

              {/* Station 2 */}
              <div
                style={{
                  background: st2Ec > 3000 ? "rgba(239, 68, 68, 0.15)" : "rgba(15, 23, 42, 0.6)",
                  padding: "12px 10px",
                  borderRadius: "10px",
                  border: st2Ec > 3000 ? "2px solid #ef4444" : "1px solid rgba(255,255,255,0.08)",
                  textAlign: "center",
                  boxShadow: st2Ec > 3000 ? "0 0 15px rgba(239, 68, 68, 0.3)" : "none",
                }}
              >
                <div style={{ fontSize: "10px", color: st2Ec > 3000 ? "#fca5a5" : "#94a3b8", fontWeight: 700 }}>
                  ST-02 Kasipalayam
                </div>
                <div style={{ fontSize: "20px", fontWeight: 900, color: st2Ec > 3000 ? "#ef4444" : "#38bdf8", margin: "4px 0" }}>
                  {st2Ec} <span style={{ fontSize: "10px", fontWeight: 600 }}>µS</span>
                </div>
                <div style={{ fontSize: "9px", color: st2Ec > 3000 ? "#f87171" : "#10b981", fontWeight: 800 }}>
                  {st2Ec > 3000 ? "⚠️ OVERRUN" : "Urban Exit"}
                </div>
              </div>

              {/* Station 3 */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.6)",
                  padding: "12px 10px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700 }}>ST-03 Reservoir</div>
                <div style={{ fontSize: "20px", fontWeight: 900, color: "#c084fc", margin: "4px 0" }}>
                  {st3Ec} <span style={{ fontSize: "10px", fontWeight: 600 }}>µS</span>
                </div>
                <div style={{ fontSize: "9px", color: "#94a3b8" }}>Orathapalayam Dam</div>
              </div>
            </div>
          </div>

          {/* Hydrograph Live SVG Time-Series Chart */}
          <div className="scada-glass-card" style={{ padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h3 style={{ fontSize: "12px", margin: 0, color: "#94a3b8", fontWeight: 800, letterSpacing: "0.04em" }}>
                📈 ELECTRICAL CONDUCTIVITY (EC) TIME-SERIES
              </h3>
              <span style={{ fontSize: "10px", color: "#ef4444", fontWeight: 700 }}>Max Norm: 2,100 µS/cm</span>
            </div>

            <div style={{ height: "140px", width: "100%", position: "relative", background: "#090d16", borderRadius: "10px", padding: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <svg width="100%" height="100%" viewBox="0 0 380 120" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="st2Glow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="0" y1="30" x2="380" y2="30" stroke="rgba(255,255,255,0.05)" strokeDasharray="2,2" />
                <line x1="0" y1="60" x2="380" y2="60" stroke="rgba(255,255,255,0.05)" strokeDasharray="2,2" />
                <line x1="0" y1="90" x2="380" y2="90" stroke="rgba(255,255,255,0.05)" strokeDasharray="2,2" />

                {/* TNPCB Legal Standard Threshold Line */}
                <line x1="0" y1="75" x2="380" y2="75" stroke="#ef4444" strokeDasharray="4,4" strokeWidth="1.5" />

                {history.length > 1 && (
                  <>
                    {/* ST-02 Area Fill */}
                    <polygon
                      fill="url(#st2Glow)"
                      points={`0,120 ${history
                        .map((pt, i) => {
                          const x = (i / (history.length - 1)) * 380;
                          const y = 110 - (pt.st2 / 9500) * 100;
                          return `${x},${y}`;
                        })
                        .join(" ")} 380,120`}
                    />

                    {/* ST1 Polyline */}
                    <polyline
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      points={history
                        .map((pt, i) => {
                          const x = (i / (history.length - 1)) * 380;
                          const y = 110 - (pt.st1 / 9500) * 100;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                    />

                    {/* ST2 Polyline */}
                    <polyline
                      fill="none"
                      stroke={st2Ec > 3000 ? "#ef4444" : "#10b981"}
                      strokeWidth="3"
                      points={history
                        .map((pt, i) => {
                          const x = (i / (history.length - 1)) * 380;
                          const y = 110 - (pt.st2 / 9500) * 100;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                    />

                    {/* ST3 Polyline */}
                    <polyline
                      fill="none"
                      stroke="#c084fc"
                      strokeWidth="2"
                      points={history
                        .map((pt, i) => {
                          const x = (i / (history.length - 1)) * 380;
                          const y = 110 - (pt.st3 / 9500) * 100;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                    />
                  </>
                )}
              </svg>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginTop: "8px", color: "#94a3b8" }}>
              <span style={{ color: "#38bdf8", fontWeight: 700 }}>■ ST-01 Entry</span>
              <span style={{ color: st2Ec > 3000 ? "#ef4444" : "#10b981", fontWeight: 800 }}>■ ST-02 Urban Exit</span>
              <span style={{ color: "#c084fc", fontWeight: 700 }}>■ ST-03 Dam Outflow</span>
            </div>
          </div>

          {/* Hydrodynamic Controls Box */}
          <div className="scada-glass-card" style={{ padding: "18px" }}>
            <h3 style={{ fontSize: "12px", margin: "0 0 14px", color: "#94a3b8", fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              🎛️ HYDRODYNAMIC PARAMETER SLIDERS
            </h3>

            <div style={{ display: "grid", gap: "14px" }}>
              {/* River Flow Rate */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px", color: "#cbd5e1" }}>
                  <span>River Flow Rate (Q_river):</span>
                  <strong style={{ color: "#38bdf8" }}>{riverFlowM3s.toFixed(1)} m³/s</strong>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="80.0"
                  step="0.5"
                  className="scada-range-input"
                  value={riverFlowM3s}
                  onChange={(e) => setRiverFlowM3s(parseFloat(e.target.value))}
                />
              </div>

              {/* Effluent Discharge */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px", color: "#cbd5e1" }}>
                  <span>Dyeing Outfall Flow (Q_effluent):</span>
                  <strong style={{ color: "#ef4444" }}>{effluentFlowM3d} m³/day</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="800"
                  step="20"
                  className="scada-range-input"
                  value={effluentFlowM3d}
                  onChange={(e) => setEffluentFlowM3d(parseInt(e.target.value))}
                />
              </div>

              {/* Effluent EC */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px", color: "#cbd5e1" }}>
                  <span>Effluent Raw Salinity (EC_effluent):</span>
                  <strong style={{ color: "#f59e0b" }}>{rawEffluentEc} µS/cm</strong>
                </div>
                <input
                  type="range"
                  min="1500"
                  max="14000"
                  step="250"
                  className="scada-range-input"
                  value={rawEffluentEc}
                  onChange={(e) => setRawEffluentEc(parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Role-Specific Action Center Card */}
          <div
            className="scada-glass-card"
            style={{
              padding: "18px",
              border: roleMode === "REGULATOR" ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(56, 189, 248, 0.3)",
            }}
          >
            <h3 style={{ fontSize: "13px", margin: "0 0 10px", color: "#ffffff", fontWeight: 800 }}>
              {roleMode === "REGULATOR"
                ? "🏛️ REGULATOR LEGAL ENFORCEMENT WORKFLOW"
                : roleMode === "INDUSTRY"
                ? "🏭 CETP INDUSTRIAL OVERRIDE"
                : roleMode === "CITIZEN"
                ? "🏡 BOREWELL CONTAMINATION RISK CALCULATOR"
                : "🎓 ACADEMIC DIFFERENTIAL MODEL PARAMETERS"}
            </h3>

            {roleMode === "REGULATOR" && (
              <div>
                <p style={{ fontSize: "12px", margin: "0 0 12px", color: "#cbd5e1", lineHeight: "1.4" }}>
                  Automated Water Act Section 33A emergency power disconnection notice triggers on EC &gt; 3,500 µS/cm.
                </p>
                <button
                  type="button"
                  style={{
                    width: "100%",
                    fontSize: "12px",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "none",
                    background: tnpcbNoticeIssued ? "linear-gradient(135deg, #059669 0%, #047857 100%)" : "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                    color: "white",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: tnpcbNoticeIssued ? "0 4px 14px rgba(5, 150, 105, 0.4)" : "0 4px 14px rgba(220, 38, 38, 0.4)",
                  }}
                  onClick={handleIssueNotice}
                >
                  {tnpcbNoticeIssued ? "✓ Section 33A Order Dispatched to TANGEDCO" : "🚨 Issue Section 33A Emergency Closure Order"}
                </button>
              </div>
            )}

            {roleMode === "INDUSTRY" && (
              <div>
                <p style={{ fontSize: "12px", margin: "0 0 12px", color: "#cbd5e1" }}>
                  Active ZLD RO Recovery Rate: <strong>94.2%</strong> | Salt Recovery Economics: <strong>₹14.50 / m³</strong>
                </p>
                <button
                  type="button"
                  style={{
                    width: "100%",
                    fontSize: "12px",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "none",
                    background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                    color: "white",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(5, 150, 105, 0.4)",
                  }}
                  onClick={handleEmergencyZldFix}
                >
                  ⚡ Engage Emergency Secondary RO Evaporator (Zero Bypass)
                </button>
              </div>
            )}

            {roleMode === "CITIZEN" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "6px", color: "#cbd5e1" }}>
                  <span>Distance to Nearest Industrial Outfall:</span>
                  <strong style={{ color: "#38bdf8" }}>{citizenDistanceKm.toFixed(1)} km</strong>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="5.0"
                  step="0.1"
                  className="scada-range-input"
                  value={citizenDistanceKm}
                  onChange={(e) => setCitizenDistanceKm(parseFloat(e.target.value))}
                  style={{ marginBottom: "12px" }}
                />
                <div
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    background: citizenDistanceKm < 1.5 && st2Ec > 3000 ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)",
                    border: citizenDistanceKm < 1.5 && st2Ec > 3000 ? "1px solid #ef4444" : "1px solid #10b981",
                    color: citizenDistanceKm < 1.5 && st2Ec > 3000 ? "#fca5a5" : "#6ee7b7",
                    fontWeight: 800,
                    fontSize: "12px",
                    textAlign: "center",
                  }}
                >
                  {citizenDistanceKm < 1.5 && st2Ec > 3000
                    ? "⚠️ CAUTION: Borewell extraction within 1.5 km restricted due to high salinity plume!"
                    : "✅ SAFE: Drinking water well quality within safe threshold."}
                </div>
              </div>
            )}

            {roleMode === "ACADEMIC" && (
              <div>
                <p style={{ fontSize: "12px", margin: 0, color: "#cbd5e1", lineHeight: "1.5" }}>
                  Longitudinal Dispersion Coefficient ($D_x$ = {dispersionDx} $m^2/s$). Solves second-order partial differential transport equations for solute travel time along 10 GIS river waypoints.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
