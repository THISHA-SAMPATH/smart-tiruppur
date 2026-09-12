"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

type RoleMode = "ADMIN" | "REGULATOR" | "INDUSTRY" | "CITIZEN";

interface PlumeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
}

interface SteamParticle {
  x: number;
  y: number;
  vy: number;
  radius: number;
  alpha: number;
}

export default function VisualRiverCanvasSimulator() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { user } = useAuth();

  // Role mode selection (defaults to user.role or REGULATOR)
  const [roleMode, setRoleMode] = useState<RoleMode>(
    (user?.role as RoleMode) || "REGULATOR"
  );

  // Solenoid Valves
  const [unit007Valved, setUnit007Valved] = useState(false);
  const [unit001Valved, setUnit001Valved] = useState(false);
  const [unit012Valved, setUnit012Valved] = useState(false);

  // Operational Controls
  const [pipeFlowRateM3h, setPipeFlowRateM3h] = useState(120);
  const [riverVelocity, setRiverVelocity] = useState(0.85);

  // Live Telemetry Readouts
  const [node1Ec, setNode1Ec] = useState(1400);
  const [node2Ec, setNode2Ec] = useState(1400);
  const [node3Ec, setNode3Ec] = useState(1400);
  const [bayesPosterior, setBayesPosterior] = useState(8);
  const [bayesDecision, setBayesDecision] = useState<"NORMAL" | "ABSTAIN" | "INVESTIGATE">("NORMAL");
  const [inspectorDispatched, setInspectorDispatched] = useState(false);
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);

  const plumeParticlesRef = useRef<PlumeParticle[]>([]);
  const steamParticlesRef = useRef<SteamParticle[]>([]);

  // Sync Telemetry & Bayesian Model Physics
  useEffect(() => {
    const syncInterval = setInterval(() => {
      let anyDischarge = unit007Valved || unit001Valved || unit012Valved;
      let activeUnit = unit007Valved ? "unit_007" : unit001Valved ? "unit_001" : "unit_012";

      let ec1 = 1400 + (unit001Valved ? Math.round(pipeFlowRateM3h * 18) : 0);
      let ec2 = 1400 + (unit007Valved ? Math.round(pipeFlowRateM3h * 24) : 0);
      let ec3 = 1400 + (unit012Valved ? Math.round(pipeFlowRateM3h * 16) : 0);

      setNode1Ec(ec1);
      setNode2Ec(ec2);
      setNode3Ec(ec3);

      let peakEc = Math.max(ec1, ec2, ec3);

      if (anyDischarge) {
        let prob = Math.min(94, 25 + Math.round((peakEc - 1400) / 35));
        setBayesPosterior(prob);

        if (prob > 75) setBayesDecision("INVESTIGATE");
        else if (prob > 35) setBayesDecision("ABSTAIN");
        else setBayesDecision("NORMAL");

        const logMsg = `[${new Date().toLocaleTimeString()}] HTTP POST /api/telemetry → Node: ${activeUnit} | EC Peak: ${peakEc} µS/cm | P(Source) = ${prob}% | Model: Bayesian v2.4`;
        setTelemetryLogs((prev) => [logMsg, ...prev.slice(0, 5)]);
      } else {
        setBayesPosterior(8);
        setBayesDecision("NORMAL");
      }
    }, 1200);

    return () => clearInterval(syncInterval);
  }, [unit007Valved, unit001Valved, unit012Valved, pipeFlowRateM3h]);

  // High-Fidelity 2.5D Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let tick = 0;

    // Steam particles from factory chimneys
    for (let i = 0; i < 20; i++) {
      steamParticlesRef.current.push({
        x: 100 + Math.random() * 700,
        y: 35 + Math.random() * 15,
        vy: 0.3 + Math.random() * 0.4,
        radius: 3 + Math.random() * 4,
        alpha: 0.6,
      });
    }

    const render = () => {
      tick++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw 2.5D Landscape Terrain (Grassy Riverbanks & Industrial Parks)
      ctx.fillStyle = "#0f172a"; // Dark Tech Canvas Base
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Top Grassy Bank
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, canvas.width, 100);
      ctx.fillStyle = "#14532d"; // Green riverbank trim
      ctx.fillRect(0, 95, canvas.width, 10);

      // Noyyal River Channel (Curved 2.5D Water Body)
      const riverGradient = ctx.createLinearGradient(0, 105, 0, 215);
      riverGradient.addColorStop(0, "#0284c7");
      riverGradient.addColorStop(0.5, "#0369a1");
      riverGradient.addColorStop(1, "#075985");
      ctx.fillStyle = riverGradient;
      ctx.fillRect(0, 105, canvas.width, 110);

      // Bottom Grassy Bank & City Ward
      ctx.fillStyle = "#14532d";
      ctx.fillRect(0, 215, canvas.width, 10);
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 225, canvas.width, 125);

      // 2. Animate Water Surface Waves & Flow Direction Vectors
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1.2;
      for (let y = 120; y <= 195; y += 22) {
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x += 30) {
          const shift = Math.sin((x + tick * 3 * riverVelocity) * 0.04) * 3;
          ctx.lineTo(x, y + shift);
        }
        ctx.stroke();
      }

      // Flow Velocity Direction Arrows
      ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
      for (let x = (tick * 2 * riverVelocity) % 150; x < canvas.width; x += 150) {
        ctx.beginPath();
        ctx.moveTo(x, 160);
        ctx.lineTo(x - 12, 155);
        ctx.lineTo(x - 12, 165);
        ctx.fill();
      }

      // 3. Chimney Steam Smoke Particles
      steamParticlesRef.current.forEach((sp) => {
        sp.y -= sp.vy;
        sp.radius += 0.05;
        sp.alpha -= 0.005;

        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226, 232, 240, ${Math.max(sp.alpha, 0)})`;
        ctx.fill();

        if (sp.y < 5 || sp.alpha <= 0) {
          sp.x = 100 + Math.random() * 700;
          sp.y = 40;
          sp.radius = 3;
          sp.alpha = 0.6;
        }
      });

      // 4. Generate & Animate Chemical Plume Dispersion
      const emitPlume = (x: number, color: string) => {
        if (Math.random() < 0.75) {
          plumeParticlesRef.current.push({
            x: x,
            y: 110 + Math.random() * 20,
            vx: (0.8 + Math.random() * 0.6) * riverVelocity,
            vy: (Math.random() - 0.5) * 0.4,
            radius: 4 + Math.random() * 5,
            alpha: 0.9,
            color: color,
          });
        }
      };

      if (unit001Valved) emitPlume(130, "#ec4899"); // Pink dye
      if (unit007Valved) emitPlume(420, "#ef4444"); // Red toxic plume
      if (unit012Valved) emitPlume(720, "#eab308"); // Yellow acid plume

      // Render & Expand Plumes (Gaussian Advection-Dispersion)
      for (let i = plumeParticlesRef.current.length - 1; i >= 0; i--) {
        const p = plumeParticlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.radius += 0.09; // Plume dispersion expansion
        p.alpha -= 0.0025; // Chemical dilution

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(p.alpha, 0);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        if (p.x > canvas.width || p.alpha <= 0) {
          plumeParticlesRef.current.splice(i, 1);
        }
      }

      // 5. Draw 2.5D Factory Architecture & Solenoid Valves
      const factories = [
        { id: "unit_001", name: "Dyeing Unit 001", x: 130, valved: unit001Valved, toggle: () => setUnit001Valved(!unit001Valved) },
        { id: "unit_007", name: "Dyeing Unit 007", x: 420, valved: unit007Valved, toggle: () => setUnit007Valved(!unit007Valved) },
        { id: "unit_012", name: "Dyeing Unit 012", x: 720, valved: unit012Valved, toggle: () => setUnit012Valved(!unit012Valved) },
      ];

      factories.forEach((f) => {
        // Factory Main Body
        ctx.fillStyle = "#334155";
        ctx.fillRect(f.x - 40, 25, 80, 55);
        ctx.strokeStyle = f.valved ? "#ef4444" : "#475569";
        ctx.lineWidth = 2;
        ctx.strokeRect(f.x - 40, 25, 80, 55);

        // RO Membrane Tower Silo
        ctx.fillStyle = "#475569";
        ctx.fillRect(f.x + 15, 10, 20, 70);

        // Chimney
        ctx.fillStyle = "#64748b";
        ctx.fillRect(f.x - 30, 10, 12, 20);

        // Effluent Pipe to River
        ctx.strokeStyle = f.valved ? "#ef4444" : "#64748b";
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(f.x, 80);
        ctx.lineTo(f.x, 110);
        ctx.stroke();

        // Solenoid Valve Indicator
        ctx.fillStyle = f.valved ? "#ef4444" : "#22c55e";
        ctx.beginPath();
        ctx.arc(f.x, 95, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Factory Labels
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(f.name, f.x - 5, 45);
        ctx.font = "10px sans-serif";
        ctx.fillStyle = f.valved ? "#f87171" : "#86efac";
        ctx.fillText(f.valved ? "⚠️ DISCHARGING" : "✓ ZLD OPERATIONAL", f.x - 5, 62);
      });

      // 6. Draw Glowing Neon Cyber-HUD Sensor Nodes
      const sensors = [
        { id: "S_01", name: "Node 01: Orathupalayam", x: 270, ec: node1Ec },
        { id: "S_02", name: "Node 02: Kasipalayam", x: 570, ec: node2Ec },
        { id: "S_03", name: "Node 03: Mangalam", x: 860, ec: node3Ec },
      ];

      sensors.forEach((s) => {
        const isAlert = s.ec > 2000;
        const color = isAlert ? "#ef4444" : "#22c55e";

        // Probe Line
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(s.x, 215);
        ctx.lineTo(s.x, 250);
        ctx.stroke();

        // Neon Pulse Ring
        const pulse = 12 + Math.sin(tick * 0.1) * 4;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(s.x, 215, pulse, 0, Math.PI * 2);
        ctx.stroke();

        // HUD Box
        ctx.fillStyle = "#090d16";
        ctx.fillRect(s.x - 48, 250, 96, 50);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(s.x - 48, 250, 96, 50);

        // LED Indicator
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(s.x - 36, 262, 4, 0, Math.PI * 2);
        ctx.fill();

        // Text
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(s.id, s.x - 26, 265);

        ctx.font = "bold 12px monospace";
        ctx.fillStyle = color;
        ctx.fillText(`${s.ec}`, s.x - 38, 284);
        ctx.font = "9px monospace";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("µS/cm", s.x + 2, 284);
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [unit001Valved, unit007Valved, unit012Valved, riverVelocity, pipeFlowRateM3h, node1Ec, node2Ec, node3Ec]);

  return (
    <div className="workspace-page">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">HIGH-FIDELITY 2.5D SIMULATOR WORKSPACE</p>
          <h1>Interactive River & Pipe Network Simulator</h1>
          <p>
            Visually realistic physical model of Noyyal River transport, industrial pipe valves, downstream telemetry probes, and role-based decision engines.
          </p>
        </div>

        {/* Role Perspective Selector Bar */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            background: "var(--paper)",
            padding: "4px",
            borderRadius: "8px",
            border: "1px solid var(--hairline)",
          }}
        >
          <button
            onClick={() => setRoleMode("REGULATOR")}
            className="btn-ghost"
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: roleMode === "REGULATOR" ? 700 : 400,
              background: roleMode === "REGULATOR" ? "var(--indigo-soft)" : "transparent",
              borderRadius: "4px",
            }}
          >
            🛡️ Regulator Perspective
          </button>
          <button
            onClick={() => setRoleMode("INDUSTRY")}
            className="btn-ghost"
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: roleMode === "INDUSTRY" ? 700 : 400,
              background: roleMode === "INDUSTRY" ? "var(--indigo-soft)" : "transparent",
              borderRadius: "4px",
            }}
          >
            🏭 Industry Perspective
          </button>

          <button
            onClick={() => setRoleMode("ADMIN")}
            className="btn-ghost"
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: roleMode === "ADMIN" ? 700 : 400,
              background: roleMode === "ADMIN" ? "var(--indigo-soft)" : "transparent",
              borderRadius: "4px",
            }}
          >
            👑 Admin Control
          </button>

          <button
            onClick={() => setRoleMode("CITIZEN")}
            className="btn-ghost"
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: roleMode === "CITIZEN" ? 700 : 400,
              background: roleMode === "CITIZEN" ? "var(--indigo-soft)" : "transparent",
              borderRadius: "4px",
            }}
          >
            👤 Citizen View
          </button>
        </div>
      </header>

      {/* 2.5D Animated Canvas Viewport */}
      <div className="card" style={{ padding: "16px", marginBottom: "20px", background: "#090d16" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <span className="mono small" style={{ color: "#38bdf8", fontWeight: 700 }}>
              🌐 NOYYAL RIVER HYDRAULIC CANVAS — PERSPECTIVE: [{roleMode}]
            </span>
            <p className="small muted" style={{ margin: "2px 0 0", color: "#94a3b8" }}>
              Toggle solenoid valves to release chemical dye plumes & watch downstream sensor LEDs respond.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span className="small muted" style={{ color: "#94a3b8" }}>River Velocity:</span>
            <input
              type="range"
              min="0.3"
              max="2.5"
              step="0.1"
              value={riverVelocity}
              onChange={(e) => setRiverVelocity(parseFloat(e.target.value))}
              style={{ width: "100px", accentColor: "#38bdf8" }}
            />
            <span className="mono small" style={{ color: "#38bdf8", fontWeight: 700 }}>
              {riverVelocity.toFixed(1)} m/s
            </span>
          </div>
        </div>

        {/* The 2.5D Canvas Element */}
        <div style={{ overflowX: "auto" }}>
          <canvas
            ref={canvasRef}
            width={960}
            height={325}
            style={{ width: "100%", height: "auto", borderRadius: "8px", border: "1px solid #1e293b", background: "#0f172a" }}
          />
        </div>
      </div>

      {/* ROLE-CONTEXTUAL CONTROLS & HUD PERSPECTIVES */}

      {/* 1. REGULATOR ROLE VIEW */}
      {roleMode === "REGULATOR" && (
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div className="card" style={{ borderLeft: "4px solid var(--indigo-bright, #818cf8)" }}>
            <span className="mono small" style={{ color: "#818cf8", fontWeight: 700 }}>
              🛡️ REGULATOR BAYESIAN EVIDENCE HUD
            </span>
            <h3 style={{ fontSize: "18px", margin: "4px 0 10px" }}>3-Tier Evidence Decision Engine</h3>
            
            <div style={{ background: "var(--paper)", padding: "12px", borderRadius: "6px", border: "1px solid var(--hairline)", marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="small muted">Attribution Decision:</span>
                <span className="badge" style={{ background: bayesDecision === "INVESTIGATE" ? "#ef4444" : "#22c55e", color: "#fff", fontWeight: 800 }}>
                  {bayesDecision}
                </span>
              </div>
              <p style={{ margin: "8px 0 4px", fontSize: "13px" }}>
                P(unit_007 | Telemetry) = <strong>{bayesPosterior}%</strong>
              </p>
              <div style={{ width: "100%", height: "6px", background: "var(--hairline)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ width: `${bayesPosterior}%`, height: "100%", background: bayesPosterior > 75 ? "#ef4444" : "#22c55e", transition: "width 0.3s" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                className="btn"
                onClick={() => setInspectorDispatched(true)}
                disabled={bayesDecision !== "INVESTIGATE" || inspectorDispatched}
                style={{ flex: 1, padding: "8px" }}
              >
                {inspectorDispatched ? "✓ Inspector Dispatched to Site" : "🚨 Dispatch Field Inspector"}
              </button>
              <Link href="/evidence" className="btn-ghost" style={{ border: "1px solid var(--hairline)" }}>
                View Evidence Ledger ↗
              </Link>
            </div>
          </div>

          {/* Solenoid Valve Triggers */}
          <div className="card">
            <h3 style={{ fontSize: "18px", marginBottom: "10px" }}>Regulator Override & Valve Monitor</h3>
            <div className="grid" style={{ gap: "8px" }}>
              <button
                className="btn-ghost"
                onClick={() => setUnit007Valved(!unit007Valved)}
                style={{ textAlign: "left", padding: "10px", borderRadius: "6px", background: unit007Valved ? "rgba(239,68,68,0.1)" : "var(--paper)", border: unit007Valved ? "1px solid #ef4444" : "1px solid var(--hairline)" }}
              >
                <strong style={{ display: "block", color: unit007Valved ? "#ef4444" : "inherit" }}>
                  Factory Unit 007 (Mangalam) — {unit007Valved ? "🔴 VALVE OPEN (DISCHARGING)" : "🟢 ZLD CLOSED"}
                </strong>
                <span className="small muted">Click to toggle pipe discharge simulation</span>
              </button>

              <button
                className="btn-ghost"
                onClick={() => setUnit001Valved(!unit001Valved)}
                style={{ textAlign: "left", padding: "10px", borderRadius: "6px", background: unit001Valved ? "rgba(236,72,153,0.1)" : "var(--paper)", border: unit001Valved ? "1px solid #ec4899" : "1px solid var(--hairline)" }}
              >
                <strong style={{ display: "block", color: unit001Valved ? "#ec4899" : "inherit" }}>
                  Factory Unit 001 (Sirupooluvapatti) — {unit001Valved ? "🔴 VALVE OPEN" : "🟢 ZLD CLOSED"}
                </strong>
                <span className="small muted">Click to toggle pipe discharge simulation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. INDUSTRY ROLE VIEW */}
      {roleMode === "INDUSTRY" && (
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div className="card" style={{ borderLeft: "4px solid #16a34a" }}>
            <span className="mono small" style={{ color: "#16a34a", fontWeight: 700 }}>
              🏭 INDUSTRY FACILITY SOLENOID PIPELINE HUD
            </span>
            <h3 style={{ fontSize: "18px", margin: "4px 0 10px" }}>Facility Valve & Pipe Flow Controls</h3>

            <div style={{ background: "var(--paper)", padding: "12px", borderRadius: "6px", border: "1px solid var(--hairline)", marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span className="small muted">Pipe Flow Rate (m³/hr):</span>
                <span className="mono" style={{ fontWeight: 700 }}>{pipeFlowRateM3h} m³/hr</span>
              </div>
              <input
                type="range"
                min="40"
                max="300"
                value={pipeFlowRateM3h}
                onChange={(e) => setPipeFlowRateM3h(parseInt(e.target.value, 10))}
                style={{ width: "100%", accentColor: "#16a34a" }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="btn"
                onClick={() => setUnit007Valved(!unit007Valved)}
                style={{ flex: 1, background: unit007Valved ? "#ef4444" : "#16a34a" }}
              >
                {unit007Valved ? "🛑 Emergency Solenoid Auto-Shutoff" : "🚰 Open Solenoid Pipe Valve"}
              </button>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: "18px", marginBottom: "10px" }}>Chemical Effluent Composition Breakdown</h3>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div style={{ background: "var(--paper)", padding: "10px", borderRadius: "6px", border: "1px solid var(--hairline)" }}>
                <span className="small muted">Azo Dye Salinity</span>
                <p style={{ margin: "2px 0 0", fontWeight: 800, fontSize: "18px", color: unit007Valved ? "#ef4444" : "#22c55e" }}>
                  {unit007Valved ? "4,250 mg/L" : "120 mg/L"}
                </p>
              </div>
              <div style={{ background: "var(--paper)", padding: "10px", borderRadius: "6px", border: "1px solid var(--hairline)" }}>
                <span className="small muted">ZLD RO Recovery</span>
                <p style={{ margin: "2px 0 0", fontWeight: 800, fontSize: "18px", color: "#3b82f6" }}>
                  {unit007Valved ? "45% (Bypassed)" : "94% Optimal"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. ADMIN ROLE VIEW */}
      {roleMode === "ADMIN" && (
        <div className="card">
          <span className="mono small" style={{ color: "#3b82f6", fontWeight: 700 }}>
            👑 ADMIN SYSTEM THROUGHPUT & API LOG STREAM
          </span>
          <h3 style={{ fontSize: "18px", margin: "4px 0 12px" }}>Server Telemetry Stream Log</h3>
          <div style={{ background: "#090d16", padding: "12px", borderRadius: "6px", fontFamily: "monospace", fontSize: "11.5px", color: "#38bdf8", minHeight: "90px" }}>
            {telemetryLogs.length === 0 ? (
              <span style={{ color: "#64748b" }}>System listening for sensor telemetry payloads...</span>
            ) : (
              telemetryLogs.map((l, i) => <div key={i}>{l}</div>)
            )}
          </div>
        </div>
      )}

      {/* 4. CITIZEN ROLE VIEW */}
      {roleMode === "CITIZEN" && (
        <div className="card" style={{ borderLeft: "4px solid #0284c7" }}>
          <span className="mono small" style={{ color: "#0284c7", fontWeight: 700 }}>
            👤 CITIZEN PUBLIC TRANSPARENCY HUD
          </span>
          <h3 style={{ fontSize: "18px", margin: "4px 0 10px" }}>Public River Health Index</h3>
          <p className="small muted" style={{ margin: "0 0 12px" }}>
            Noyyal River baseline water quality index for downstream villages and wards.
          </p>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <Link href="/citizen" className="btn">
              View Public Citizen Portal ↗
            </Link>
            <span className="small muted">
              Current Noyyal Basin Water Quality: <strong>{bayesDecision === "NORMAL" ? "🟢 Good" : "⚠️ Discharge Detected"}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
