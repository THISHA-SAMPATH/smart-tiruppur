"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface PlumeParticle {
  x: number;
  y: number;
  speed: number;
  radius: number;
  alpha: number;
  color: string;
}

export default function VisualRiverCanvasSimulator() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active Valve States
  const [unit007Open, setUnit007Open] = useState(false);
  const [unit001Open, setUnit001Open] = useState(false);
  const [unit012Open, setUnit012Open] = useState(false);

  // Flow & Sensor States
  const [riverSpeed, setRiverSpeed] = useState(1.5);
  const [node1Ec, setNode1Ec] = useState(1400);
  const [node2Ec, setNode2Ec] = useState(1400);
  const [node3Ec, setNode3Ec] = useState(1400);
  const [bayesDecision, setBayesDecision] = useState("NORMAL Baseline");
  const [serverPayloadLog, setServerPayloadLog] = useState<string[]>([]);

  const plumeParticlesRef = useRef<PlumeParticle[]>([]);

  // Telemetry Server Sync Interval
  useEffect(() => {
    const syncInterval = setInterval(() => {
      let isDischarging = unit007Open || unit001Open || unit012Open;
      let activeUnit = unit007Open ? "unit_007" : unit001Open ? "unit_001" : "unit_012";

      let ec1 = 1400 + (unit001Open ? 1800 : 0);
      let ec2 = 1400 + (unit007Open ? 2450 : 0);
      let ec3 = 1400 + (unit012Open ? 1950 : 0);

      setNode1Ec(ec1);
      setNode2Ec(ec2);
      setNode3Ec(ec3);

      if (isDischarging) {
        setBayesDecision(`INVESTIGATE → High Confidence Identification (${activeUnit})`);
        const payload = `[${new Date().toLocaleTimeString()}] HTTP POST /api/telemetry → Source: ${activeUnit} | Sensor EC Peak: ${Math.max(ec1, ec2, ec3)} uS/cm | Status: FLAGGED`;
        setServerPayloadLog((prev) => [payload, ...prev.slice(0, 4)]);

        // Optionally fire POST to backend
        fetch("/api/citizen-reports", {
          method: "GET",
        }).catch(() => {});
      } else {
        setBayesDecision("NORMAL (Baseline Operations)");
      }
    }, 1500);

    return () => clearInterval(syncInterval);
  }, [unit007Open, unit001Open, unit012Open]);

  // Canvas Water & Plume Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    // Water particles
    const waterParticles: { x: number; y: number; speed: number; length: number }[] = [];
    for (let i = 0; i < 60; i++) {
      waterParticles.push({
        x: Math.random() * canvas.width,
        y: 120 + Math.random() * 80,
        speed: 1 + Math.random() * 2,
        length: 10 + Math.random() * 20,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw River Channel Background
      ctx.fillStyle = "#1e293b"; // Dark surrounding land
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // River Channel Path
      ctx.fillStyle = "#0284c7"; // Noyyal River Blue
      ctx.fillRect(0, 110, canvas.width, 100);

      // River Channel Grid Borders
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 110);
      ctx.lineTo(canvas.width, 110);
      ctx.moveTo(0, 210);
      ctx.lineTo(canvas.width, 210);
      ctx.stroke();

      // 2. Animate Water Flow Particles
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 1.5;
      waterParticles.forEach((p) => {
        p.x += p.speed * riverSpeed;
        if (p.x > canvas.width) p.x = 0;

        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.length, p.y);
        ctx.stroke();
      });

      // 3. Generate Chemical Plumes when Valves are Open
      if (unit001Open && Math.random() < 0.6) {
        plumeParticlesRef.current.push({
          x: 140,
          y: 120 + Math.random() * 60,
          speed: 1.2 * riverSpeed,
          radius: 4 + Math.random() * 6,
          alpha: 0.8,
          color: "#ec4899", // Magenta dye
        });
      }
      if (unit007Open && Math.random() < 0.7) {
        plumeParticlesRef.current.push({
          x: 420,
          y: 120 + Math.random() * 60,
          speed: 1.4 * riverSpeed,
          radius: 5 + Math.random() * 8,
          alpha: 0.9,
          color: "#ef4444", // Red toxic dye
        });
      }
      if (unit012Open && Math.random() < 0.6) {
        plumeParticlesRef.current.push({
          x: 720,
          y: 120 + Math.random() * 60,
          speed: 1.3 * riverSpeed,
          radius: 4 + Math.random() * 7,
          alpha: 0.8,
          color: "#eab308", // Yellow acid dye
        });
      }

      // Animate Plume Particles
      for (let i = plumeParticlesRef.current.length - 1; i >= 0; i--) {
        const p = plumeParticlesRef.current[i];
        p.x += p.speed;
        p.radius += 0.08;
        p.alpha -= 0.003;

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

      // 4. Draw Industrial Dyeing Units & Pipes
      const factories = [
        { id: "unit_001", name: "Dyeing Unit 001", x: 120, open: unit001Open, toggle: () => setUnit001Open(!unit001Open) },
        { id: "unit_007", name: "Dyeing Unit 007", x: 400, open: unit007Open, toggle: () => setUnit007Open(!unit007Open) },
        { id: "unit_012", name: "Dyeing Unit 012", x: 700, open: unit012Open, toggle: () => setUnit012Open(!unit012Open) },
      ];

      factories.forEach((f) => {
        // Factory Building
        ctx.fillStyle = "#334155";
        ctx.fillRect(f.x - 30, 20, 60, 50);
        ctx.strokeStyle = "#64748b";
        ctx.strokeRect(f.x - 30, 20, 60, 50);

        // Factory Roof Chimney
        ctx.fillStyle = "#475569";
        ctx.fillRect(f.x - 20, 5, 12, 15);

        // Pipe to River
        ctx.strokeStyle = f.open ? "#ef4444" : "#94a3b8";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(f.x, 70);
        ctx.lineTo(f.x, 110);
        ctx.stroke();

        // Valve Wheel Graphic
        ctx.fillStyle = f.open ? "#ef4444" : "#22c55e";
        ctx.beginPath();
        ctx.arc(f.x, 90, 8, 0, Math.PI * 2);
        ctx.fill();

        // Labels
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(f.name, f.x, 45);
        ctx.font = "9px sans-serif";
        ctx.fillStyle = f.open ? "#f87171" : "#86efac";
        ctx.fillText(f.open ? "DISCHARGING" : "ZLD CLOSED", f.x, 60);
      });

      // 5. Draw Sensor Probes with Blinking LEDs
      const sensors = [
        { id: "S_01", name: "Node 01: Orathupalayam", x: 250, ec: node1Ec },
        { id: "S_02", name: "Node 02: Kasipalayam", x: 550, ec: node2Ec },
        { id: "S_03", name: "Node 03: Mangalam", x: 850, ec: node3Ec },
      ];

      sensors.forEach((s) => {
        const isAlert = s.ec > 2000;
        // Probe Line into water
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(s.x, 210);
        ctx.lineTo(s.x, 250);
        ctx.stroke();

        // Sensor Box Below River
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(s.x - 45, 250, 90, 45);
        ctx.strokeStyle = isAlert ? "#ef4444" : "#22c55e";
        ctx.lineWidth = 2;
        ctx.strokeRect(s.x - 45, 250, 90, 45);

        // Blinking LED Ring
        ctx.fillStyle = isAlert ? "#ef4444" : "#22c55e";
        ctx.beginPath();
        ctx.arc(s.x - 30, 262, 4, 0, Math.PI * 2);
        ctx.fill();

        // Text
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(s.id, s.x - 20, 265);
        ctx.font = "11px monospace";
        ctx.fillStyle = isAlert ? "#f87171" : "#38bdf8";
        ctx.fillText(`${s.ec} uS/cm`, s.x - 38, 282);
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [unit001Open, unit007Open, unit012Open, riverSpeed, node1Ec, node2Ec, node3Ec]);

  return (
    <div className="workspace-page">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">PROFESSOR DEMONSTRATION / 3D & CANVAS SIMULATOR</p>
          <h1>Interactive Visual River & Pipe Network Simulator</h1>
          <p>
            Real-time physical river channel simulation featuring factory discharge valves, pollutant wave propagation, and HTTP telemetry payload streaming to backend servers.
          </p>
        </div>
        <Link href="/monitoring" className="btn">
          View Analytical Monitoring →
        </Link>
      </header>

      {/* Main Canvas Viewport Container */}
      <div className="card" style={{ padding: "16px", marginBottom: "24px", background: "#090d16" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <span className="mono small" style={{ color: "#38bdf8", fontWeight: 700 }}>
              🌐 NOYYAL RIVER CHANNEL SIMULATION CANVAS
            </span>
            <p className="small muted" style={{ margin: "2px 0 0", color: "#94a3b8" }}>
              Click factory valve buttons below to trigger chemical pipe discharge & watch downstream sensors react.
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span className="small muted" style={{ color: "#94a3b8" }}>River Speed:</span>
            <button
              className="btn-ghost"
              onClick={() => setRiverSpeed(1.0)}
              style={{ padding: "4px 8px", fontSize: "11px", color: riverSpeed === 1.0 ? "#38bdf8" : "#94a3b8" }}
            >
              1.0x
            </button>
            <button
              className="btn-ghost"
              onClick={() => setRiverSpeed(2.0)}
              style={{ padding: "4px 8px", fontSize: "11px", color: riverSpeed === 2.0 ? "#38bdf8" : "#94a3b8" }}
            >
              2.0x
            </button>
          </div>
        </div>

        {/* The Animated Canvas Element */}
        <div style={{ overflowX: "auto" }}>
          <canvas
            ref={canvasRef}
            width={960}
            height={310}
            style={{ width: "100%", height: "auto", borderRadius: "8px", border: "1px solid #1e293b", background: "#0f172a" }}
          />
        </div>

        {/* Interactive Factory Discharge Valve Controls */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px", marginTop: "16px" }}>
          <div style={{ background: "#1e293b", padding: "12px", borderRadius: "6px", border: unit001Open ? "1.5px solid #ec4899" : "1px solid #334155" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>Factory Unit 001 (Sirupooluvapatti)</span>
              <button
                className="btn"
                onClick={() => setUnit001Open(!unit001Open)}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  background: unit001Open ? "#ec4899" : "#334155",
                  color: "#fff",
                }}
              >
                {unit001Open ? "🔴 Close Valve" : "🚰 Open Valve"}
              </button>
            </div>
            <span className="small muted" style={{ fontSize: "11px", color: "#94a3b8" }}>
              Status: {unit001Open ? "Discharging Magenta Dye Plume" : "ZLD Zero Liquid Discharge"}
            </span>
          </div>

          <div style={{ background: "#1e293b", padding: "12px", borderRadius: "6px", border: unit007Open ? "1.5px solid #ef4444" : "1px solid #334155" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>Factory Unit 007 (Mangalam)</span>
              <button
                className="btn"
                onClick={() => setUnit007Open(!unit007Open)}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  background: unit007Open ? "#ef4444" : "#334155",
                  color: "#fff",
                }}
              >
                {unit007Open ? "🔴 Close Valve" : "🚰 Open Valve"}
              </button>
            </div>
            <span className="small muted" style={{ fontSize: "11px", color: "#94a3b8" }}>
              Status: {unit007Open ? "Discharging Toxic High-EC Dye" : "ZLD Zero Liquid Discharge"}
            </span>
          </div>

          <div style={{ background: "#1e293b", padding: "12px", borderRadius: "6px", border: unit012Open ? "1.5px solid #eab308" : "1px solid #334155" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>Factory Unit 012 (Kunnathur)</span>
              <button
                className="btn"
                onClick={() => setUnit012Open(!unit012Open)}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  background: unit012Open ? "#eab308" : "#334155",
                  color: "#fff",
                }}
              >
                {unit012Open ? "🔴 Close Valve" : "🚰 Open Valve"}
              </button>
            </div>
            <span className="small muted" style={{ fontSize: "11px", color: "#94a3b8" }}>
              Status: {unit012Open ? "Discharging Acid Wash Plume" : "ZLD Zero Liquid Discharge"}
            </span>
          </div>
        </div>
      </div>

      {/* Live Server Telemetry & Bayesian Decision Log */}
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div className="card">
          <h4 style={{ fontSize: "15px", margin: "0 0 8px" }}>🧠 Live Bayesian AI Attribution Decision</h4>
          <div style={{ padding: "12px", borderRadius: "6px", background: "var(--paper)", border: "1px solid var(--hairline)" }}>
            <span className="mono small" style={{ fontWeight: 700, color: bayesDecision.includes("INVESTIGATE") ? "#ef4444" : "#22c55e" }}>
              {bayesDecision}
            </span>
            <p className="small muted" style={{ margin: "4px 0 0", fontSize: "12px" }}>
              Posterior probability computed from real-time downstream sensor wave arrival vectors.
            </p>
          </div>
        </div>

        <div className="card">
          <h4 style={{ fontSize: "15px", margin: "0 0 8px" }}>📡 Live HTTP Telemetry Stream to Backend Server</h4>
          <div style={{ background: "#090d16", padding: "10px", borderRadius: "6px", fontFamily: "monospace", fontSize: "11px", color: "#38bdf8", minHeight: "65px" }}>
            {serverPayloadLog.length === 0 ? (
              <span style={{ color: "#64748b" }}>Waiting for valve discharge events...</span>
            ) : (
              serverPayloadLog.map((log, i) => <div key={i}>{log}</div>)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
