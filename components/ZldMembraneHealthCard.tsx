"use client";

import { useState } from "react";

export default function ZldMembraneHealthCard() {
  const [operatingHours, setOperatingHours] = useState<number>(42);
  const [backwashDone, setBackwashDone] = useState<boolean>(false);
  const [dosingOk, setDosingOk] = useState<boolean>(true);

  // Membrane scaling risk calculation
  const scalingRisk = Math.min(Math.round((operatingHours / 48) * 100), 100);
  const hoursUntilBackwash = Math.max(48 - operatingHours, 0);

  const getStatusColor = (risk: number) => {
    if (risk > 85) return "#ef4444";
    if (risk > 60) return "#f59e0b";
    return "#22c55e";
  };

  return (
    <div className="card" style={{ marginBottom: "24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div>
          <span className="mono small" style={{ color: "#06b6d4", fontWeight: 700 }}>
            🔧 WORKER & TECHNICIAN TOOL
          </span>
          <h3 style={{ fontSize: "18px", margin: "4px 0 2px" }}>
            ZLD Membrane Health & Maintenance Monitor
          </h3>
          <p className="small muted" style={{ margin: 0 }}>
            Predictive chemical scaling meter & shift maintenance checklist to prevent RO membrane downtime.
          </p>
        </div>

        <span
          className="badge"
          style={{
            background: getStatusColor(scalingRisk) + "22",
            border: `1px solid ${getStatusColor(scalingRisk)}55`,
            color: getStatusColor(scalingRisk),
            fontWeight: 700,
          }}
        >
          <span className="badge-dot" />{" "}
          {scalingRisk > 85
            ? "CRITICAL BACKWASH NEEDED"
            : scalingRisk > 60
            ? "SCALING WARNING"
            : "MEMBRANE HEALTH OPTIMAL"}
        </span>
      </div>

      {/* Main Meter Grid */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            background: "var(--paper)",
            padding: "12px",
            borderRadius: "6px",
            border: "1px solid var(--hairline)",
          }}
        >
          <p className="small muted" style={{ margin: 0 }}>
            RO Membrane Scaling Risk
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "22px",
              fontWeight: 800,
              color: getStatusColor(scalingRisk),
            }}
          >
            {scalingRisk}%
          </p>
          <span className="small muted" style={{ fontSize: "11px" }}>
            Calcium Sulfate Flux Baseline
          </span>
        </div>

        <div
          style={{
            background: "var(--paper)",
            padding: "12px",
            borderRadius: "6px",
            border: "1px solid var(--hairline)",
          }}
        >
          <p className="small muted" style={{ margin: 0 }}>
            Next Filter Backwash
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "22px",
              fontWeight: 800,
              color: hoursUntilBackwash < 6 ? "#ef4444" : "#3b82f6",
            }}
          >
            {hoursUntilBackwash} <span style={{ fontSize: "12px" }}>hours</span>
          </p>
          <span className="small muted" style={{ fontSize: "11px" }}>
            Continuous Run: {operatingHours}h
          </span>
        </div>

        <div
          style={{
            background: "var(--paper)",
            padding: "12px",
            borderRadius: "6px",
            border: "1px solid var(--hairline)",
          }}
        >
          <p className="small muted" style={{ margin: 0 }}>
            Anti-Scalant Dosing Pump
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "15px",
              fontWeight: 700,
              color: dosingOk ? "#22c55e" : "#ef4444",
            }}
          >
            {dosingOk ? "✓ Dosing Active (4.2 L/h)" : "⚠️ Pump Pressure Low"}
          </p>
          <span className="small muted" style={{ fontSize: "11px" }}>
            Phosphonate Chemical Tank
          </span>
        </div>
      </div>

      {/* Shift Operator Interactive Controls */}
      <div
        style={{
          background: "var(--paper)",
          padding: "14px",
          borderRadius: "6px",
          border: "1px solid var(--hairline)",
        }}
      >
        <p className="small muted" style={{ margin: "0 0 10px", fontWeight: 600 }}>
          📋 Shift Operator Maintenance Controls:
        </p>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            className="btn"
            onClick={() => {
              setOperatingHours(0);
              setBackwashDone(true);
            }}
            style={{ fontSize: "12px", padding: "6px 12px" }}
          >
            ⚡ Log Backwash & Flushing Completed
          </button>

          <button
            className="btn-ghost"
            onClick={() => setDosingOk(!dosingOk)}
            style={{
              fontSize: "12px",
              padding: "6px 12px",
              border: "1px solid var(--hairline)",
            }}
          >
            {dosingOk ? "Simulate Dosing Fault" : "Reset Dosing Pump"}
          </button>

          <span className="small muted" style={{ marginLeft: "auto" }}>
            {backwashDone ? "✓ Shift log updated" : "Last backwash: 42 hours ago"}
          </span>
        </div>
      </div>
    </div>
  );
}
