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
          height: "540px",
          width: "100%",
          borderRadius: "12px",
          background: "#0f172a",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          color: "#94a3b8",
        }}
      >
        <span className="pulse" style={{ width: "24px", height: "24px", borderColor: "#3b82f6" }} />
        <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
          Initializing Tiruppur Noyyal Reach GIS Map Engine...
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
      // EC_mix = (Q_river * EC_river + Q_eff * EC_eff) / (Q_river + Q_eff)
      let calculatedSt2 = base1;
      if (activeBypassesCount > 0) {
        calculatedSt2 =
          (qRiver * base1 + qEffM3s * rawEffluentEc) / (qRiver + qEffM3s);

        // Add dispersion smoothing factorDx
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
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "20px" }}>
      {/* Top Header Card */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#ffffff",
          padding: "24px",
          borderRadius: "16px",
          marginBottom: "20px",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
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
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <span
                style={{
                  background: "#3b82f6",
                  color: "white",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "0.05em",
                }}
              >
                HYDRO-CHEMICAL SCADA V3.0
              </span>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                Tiruppur Noyyal Reach (Mangalam → Kasipalayam → Orathapalayam)
              </span>
            </div>
            <h1
              style={{
                fontSize: "24px",
                fontFamily: "var(--font-serif)",
                margin: "0 0 6px",
                color: "#ffffff",
              }}
            >
              Noyyal Hydro-Chemical Advection & Enforcement Simulator
            </h1>
            <p style={{ margin: 0, fontSize: "13px", color: "#cbd5e1", maxWidth: "800px" }}>
              Authentic spatial GIS physics simulation of industrial textile effluent mixing, chemical transport,
              and automated TNPCB regulatory enforcement workflows.
            </p>
          </div>

          {/* Role Context Selector */}
          <div style={{ display: "flex", gap: "6px", background: "rgba(255,255,255,0.08)", padding: "4px", borderRadius: "10px" }}>
            <button
              type="button"
              onClick={() => setRoleMode("REGULATOR")}
              style={{
                background: roleMode === "REGULATOR" ? "#3b82f6" : "transparent",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              🏛️ Regulator View
            </button>
            <button
              type="button"
              onClick={() => setRoleMode("INDUSTRY")}
              style={{
                background: roleMode === "INDUSTRY" ? "#3b82f6" : "transparent",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              🏭 CETP Operator
            </button>
            <button
              type="button"
              onClick={() => setRoleMode("CITIZEN")}
              style={{
                background: roleMode === "CITIZEN" ? "#3b82f6" : "transparent",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              🏡 Citizen View
            </button>
            <button
              type="button"
              onClick={() => setRoleMode("ACADEMIC")}
              style={{
                background: roleMode === "ACADEMIC" ? "#3b82f6" : "transparent",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              🎓 Academic / Math
            </button>
          </div>
        </div>

        {/* Preset Scenarios Quick Bar */}
        <div
          style={{
            marginTop: "16px",
            paddingTop: "14px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
            Quick Scenario Presets:
          </span>
          <button
            type="button"
            className="btn"
            style={{
              background: "#ef4444",
              color: "white",
              fontSize: "12px",
              padding: "4px 12px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
            onClick={() => applyPreset("BYPASS")}
          >
            🚨 Midnight Illegal Bypass
          </button>
          <button
            type="button"
            className="btn"
            style={{
              background: "#0284c7",
              color: "white",
              fontSize: "12px",
              padding: "4px 12px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
            onClick={() => applyPreset("MONSOON")}
          >
            🌧️ Monsoon Dilution Flush
          </button>
          <button
            type="button"
            className="btn"
            style={{
              background: "#d97706",
              color: "white",
              fontSize: "12px",
              padding: "4px 12px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
            onClick={() => applyPreset("BREACH")}
          >
            ⚙️ ZLD RO Membrane Breach
          </button>
          <button
            type="button"
            className="btn"
            style={{
              background: "#10b981",
              color: "white",
              fontSize: "12px",
              padding: "4px 12px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
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
              background: "rgba(255,255,255,0.12)",
              color: "#ffffff",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "6px",
              padding: "4px 10px",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {showMathModal ? "Hide Math Equations" : "📐 View Physics Model Formulas"}
          </button>
        </div>
      </div>

      {/* Physics Math Formula Drawer */}
      {showMathModal && (
        <div
          style={{
            background: "#1e293b",
            color: "#f8fafc",
            padding: "16px 20px",
            borderRadius: "12px",
            marginBottom: "20px",
            border: "1px solid #334155",
            fontSize: "13px",
            lineHeight: "1.6",
          }}
        >
          <h3 style={{ margin: "0 0 8px", color: "#38bdf8", fontSize: "16px" }}>
            📐 Hydro-Chemical Physics Transport Equations
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#cbd5e1" }}>
                1. Mass-Balance In-Stream EC Mixing Equation:
              </p>
              <code style={{ background: "#0f172a", padding: "6px 12px", borderRadius: "6px", display: "block", color: "#4ade80" }}>
                EC_mixed = (Q_river * EC_river + Q_effluent * EC_effluent) / (Q_river + Q_effluent)
              </code>
            </div>
            <div>
              <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#cbd5e1" }}>
                2. 1D Longitudinal Advection-Dispersion Differential Equation:
              </p>
              <code style={{ background: "#0f172a", padding: "6px 12px", borderRadius: "6px", display: "block", color: "#fbbf24" }}>
                ∂C/∂t = - u (∂C/∂x) + D_x (∂²C/∂x²)
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Main Split Grid: 60% Left GIS Map / 40% Right SCADA Console */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 440px", gap: "20px" }}>
        {/* Left Side: Real GIS Map */}
        <div
          className="card"
          style={{
            height: "680px",
            position: "relative",
            borderRadius: "16px",
            overflow: "hidden",
            border: "1px solid var(--hairline)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "10px 16px",
              background: "#0f172a",
              color: "#94a3b8",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            <span>🌐 TIRUPPUR NOYYAL GIS REACH MAP · LIVE PLUME CANVAS</span>
            <span style={{ color: st2Ec > 3000 ? "#ef4444" : "#10b981" }}>
              {st2Ec > 3000 ? "⚠️ SEVERE CONTAMINATION PLUME" : "✅ NORMAL RIVER FLOW"}
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
                addLog(`Toggled Arulpuram Dyers Bypass Valve -> ${!unit007Bypass ? "ACTIVE" : "CLOSED"}`);
              }}
              onToggleUnit001={() => {
                setUnit001Bypass(!unit001Bypass);
                addLog(`Toggled Kasipalayam Zone Bypass Valve -> ${!unit001Bypass ? "ACTIVE" : "CLOSED"}`);
              }}
              onToggleUnit012={() => {
                setUnit012Bypass(!unit012Bypass);
                addLog(`Toggled Mangalam Hub Bypass Valve -> ${!unit012Bypass ? "ACTIVE" : "CLOSED"}`);
              }}
              riverFlowM3s={riverFlowM3s}
              roleMode={roleMode}
            />
          </div>

          {/* Bottom Live Activity Feed Overlay */}
          <div
            style={{
              background: "#0f172a",
              padding: "10px 14px",
              borderTop: "1px solid #1e293b",
              maxHeight: "110px",
              overflowY: "auto",
              fontFamily: "monospace",
              fontSize: "11px",
              color: "#cbd5e1",
            }}
          >
            <div style={{ fontWeight: 700, color: "#94a3b8", marginBottom: "4px" }}>
              SYSTEM ENFORCEMENT & SCADA LOGS:
            </div>
            {enforcementLogs.length === 0 ? (
              <div style={{ color: "#64748b" }}>System normal. No bypass events logged.</div>
            ) : (
              enforcementLogs.map((log, idx) => (
                <div key={idx} style={{ marginBottom: "2px" }}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: SCADA Telemetry & Physics Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Station Readouts Card */}
          <div className="card" style={{ padding: "16px", borderRadius: "14px" }}>
            <h3 style={{ fontSize: "14px", margin: "0 0 12px", color: "var(--ink-soft)" }}>
              📡 LIVE TNPCB STATION TELEMETRY GAUGES
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              {/* Station 1 */}
              <div
                style={{
                  background: "#f8fafc",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 700 }}>ST-01 Mangalam</div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#0284c7" }}>
                  {st1Ec} <span style={{ fontSize: "10px" }}>µS</span>
                </div>
                <div style={{ fontSize: "9px", color: "#059669" }}>Upstream Entry</div>
              </div>

              {/* Station 2 */}
              <div
                style={{
                  background: st2Ec > 3000 ? "#fef2f2" : "#f8fafc",
                  padding: "10px",
                  borderRadius: "8px",
                  border: st2Ec > 3000 ? "2px solid #ef4444" : "1px solid #e2e8f0",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "10px", color: st2Ec > 3000 ? "#b91c1c" : "#64748b", fontWeight: 700 }}>
                  ST-02 Kasipalayam
                </div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: st2Ec > 3000 ? "#dc2626" : "#0284c7" }}>
                  {st2Ec} <span style={{ fontSize: "10px" }}>µS</span>
                </div>
                <div style={{ fontSize: "9px", color: st2Ec > 3000 ? "#b91c1c" : "#059669", fontWeight: 700 }}>
                  {st2Ec > 3000 ? "⚠️ HIGH VIOLATION" : "Urban Exit"}
                </div>
              </div>

              {/* Station 3 */}
              <div
                style={{
                  background: "#f8fafc",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 700 }}>ST-03 Orathapalayam</div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#475569" }}>
                  {st3Ec} <span style={{ fontSize: "10px" }}>µS</span>
                </div>
                <div style={{ fontSize: "9px", color: "#64748b" }}>Dam Reservoir</div>
              </div>
            </div>
          </div>

          {/* Hydrograph Live SVG Time-Series Chart */}
          <div className="card" style={{ padding: "16px", borderRadius: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h3 style={{ fontSize: "13px", margin: 0, color: "var(--ink-soft)" }}>
                📈 REAL-TIME ELECTRICAL CONDUCTIVITY (EC) HYDROGRAPH
              </h3>
              <span style={{ fontSize: "10px", color: "#64748b" }}>Norm: 2,100 µS/cm</span>
            </div>

            <div style={{ height: "130px", width: "100%", position: "relative", background: "#0f172a", borderRadius: "8px", padding: "8px" }}>
              <svg width="100%" height="100%" viewBox="0 0 380 110" preserveAspectRatio="none">
                {/* TNPCB Threshold Line */}
                <line x1="0" y1="70" x2="380" y2="70" stroke="#ef4444" strokeDasharray="4,4" strokeWidth="1.5" />
                <text x="310" y="66" fill="#ef4444" fontSize="8" fontWeight="bold">TNPCB 2100 µS Limit</text>

                {/* Plot ST1 (Blue), ST2 (Red/Orange), ST3 (Purple) */}
                {history.length > 1 && (
                  <>
                    {/* ST1 Line */}
                    <polyline
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      points={history
                        .map((pt, i) => {
                          const x = (i / (history.length - 1)) * 380;
                          const y = 100 - (pt.st1 / 9000) * 90;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                    />

                    {/* ST2 Line */}
                    <polyline
                      fill="none"
                      stroke={st2Ec > 3000 ? "#ef4444" : "#10b981"}
                      strokeWidth="2.5"
                      points={history
                        .map((pt, i) => {
                          const x = (i / (history.length - 1)) * 380;
                          const y = 100 - (pt.st2 / 9000) * 90;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                    />

                    {/* ST3 Line */}
                    <polyline
                      fill="none"
                      stroke="#a855f7"
                      strokeWidth="2"
                      points={history
                        .map((pt, i) => {
                          const x = (i / (history.length - 1)) * 380;
                          const y = 100 - (pt.st3 / 9000) * 90;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                    />
                  </>
                )}
              </svg>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginTop: "6px", color: "#64748b" }}>
              <span style={{ color: "#3b82f6", fontWeight: 700 }}>■ ST-01 Entry</span>
              <span style={{ color: st2Ec > 3000 ? "#ef4444" : "#10b981", fontWeight: 700 }}>■ ST-02 Urban Exit</span>
              <span style={{ color: "#a855f7", fontWeight: 700 }}>■ ST-03 Dam Outflow</span>
            </div>
          </div>

          {/* Hydrodynamic Controls Box */}
          <div className="card" style={{ padding: "16px", borderRadius: "14px" }}>
            <h3 style={{ fontSize: "13px", margin: "0 0 12px", color: "var(--ink-soft)" }}>
              🎛️ HYDRODYNAMIC PHYSICS PARAMETER SLIDERS
            </h3>

            <div style={{ display: "grid", gap: "10px" }}>
              {/* River Flow Rate */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "3px" }}>
                  <span>River Flow Rate (Q_river):</span>
                  <strong>{riverFlowM3s.toFixed(1)} m³/s</strong>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="80.0"
                  step="0.5"
                  value={riverFlowM3s}
                  onChange={(e) => setRiverFlowM3s(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "#3b82f6" }}
                />
              </div>

              {/* Effluent Discharge */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "3px" }}>
                  <span>Dyeing Outfall Flow (Q_effluent):</span>
                  <strong>{effluentFlowM3d} m³/day</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="800"
                  step="20"
                  value={effluentFlowM3d}
                  onChange={(e) => setEffluentFlowM3d(parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: "#ef4444" }}
                />
              </div>

              {/* Effluent EC */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "3px" }}>
                  <span>Effluent Raw Salinity (EC_effluent):</span>
                  <strong>{rawEffluentEc} µS/cm</strong>
                </div>
                <input
                  type="range"
                  min="1500"
                  max="14000"
                  step="250"
                  value={rawEffluentEc}
                  onChange={(e) => setRawEffluentEc(parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: "#d97706" }}
                />
              </div>
            </div>
          </div>

          {/* Role-Specific Dynamic Action Card */}
          <div
            className="card"
            style={{
              padding: "16px",
              borderRadius: "14px",
              background: roleMode === "REGULATOR" ? "#eff6ff" : roleMode === "INDUSTRY" ? "#f0fdf4" : "#fefce8",
              border: "1px solid var(--hairline)",
            }}
          >
            <h3 style={{ fontSize: "13px", margin: "0 0 8px", color: "var(--ink)" }}>
              {roleMode === "REGULATOR"
                ? "🏛️ REGULATOR ENFORCEMENT ACTIONS"
                : roleMode === "INDUSTRY"
                ? "🏭 CETP INDUSTRIAL OVERRIDE"
                : "🏡 CITIZEN SAFETY ADVISORY"}
            </h3>

            {roleMode === "REGULATOR" && (
              <div>
                <p style={{ fontSize: "12px", margin: "0 0 10px", color: "#334155" }}>
                  Automated Water Act Section 33A emergency notice triggers on EC &gt; 3,500 µS/cm.
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1, fontSize: "12px", background: tnpcbNoticeIssued ? "#059669" : "#dc2626" }}
                    onClick={handleIssueNotice}
                  >
                    {tnpcbNoticeIssued ? "✓ Section 33A Notice Dispatched" : "🚨 Issue Section 33A Closure Notice"}
                  </button>
                </div>
              </div>
            )}

            {roleMode === "INDUSTRY" && (
              <div>
                <p style={{ fontSize: "12px", margin: "0 0 10px", color: "#334155" }}>
                  Active ZLD RO Recovery: 94.2%. Emergency secondary evaporator available.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: "100%", fontSize: "12px", background: "#059669" }}
                  onClick={handleEmergencyZldFix}
                >
                  ⚡ Engage Emergency Secondary RO Evaporator (Zero Bypass)
                </button>
              </div>
            )}

            {roleMode === "CITIZEN" && (
              <div>
                <p style={{ fontSize: "12px", margin: "0 0 8px", color: "#334155" }}>
                  Neighborhood Groundwater Safety Status within 2 km of Kasipalayam Reach:
                </p>
                <div
                  style={{
                    padding: "8px",
                    borderRadius: "6px",
                    background: st2Ec > 3000 ? "#fee2e2" : "#dcfce7",
                    color: st2Ec > 3000 ? "#991b1b" : "#166534",
                    fontWeight: 700,
                    fontSize: "12px",
                    textAlign: "center",
                  }}
                >
                  {st2Ec > 3000
                    ? "⚠️ CAUTION: Borewell extraction within 1.5 km restricted due to high salinity plume!"
                    : "✅ SAFE: Groundwater quality normal."}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
