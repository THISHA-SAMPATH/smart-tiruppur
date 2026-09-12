"use client";

import { useState } from "react";

interface CetpCluster {
  id: string;
  name: string;
  location: string;
  connectedUnits: number;
  designCapacityMld: number; // Million Litres per Day
  currentLoadMld: number;
  zldMembraneStatus: string;
}

const CETP_CLUSTERS: CetpCluster[] = [
  {
    id: "cetp_01",
    name: "Arulpuram CETP Co-Op",
    location: "Palladam Road Cluster",
    connectedUnits: 48,
    designCapacityMld: 12.5,
    currentLoadMld: 10.2,
    zldMembraneStatus: "Optimal (4-stage RO active)",
  },
  {
    id: "cetp_02",
    name: "Kasipalayam CETP Association",
    location: "Noyyal North Bank Cluster",
    connectedUnits: 62,
    designCapacityMld: 18.0,
    currentLoadMld: 16.8,
    zldMembraneStatus: "High Hydraulic Load (3-stage RO active)",
  },
  {
    id: "cetp_03",
    name: "Murugampalayam CETP Unit",
    location: "Tiruppur South Cluster",
    connectedUnits: 34,
    designCapacityMld: 8.5,
    currentLoadMld: 5.9,
    zldMembraneStatus: "Optimal (Multi-effect Evaporator active)",
  },
];

export default function CetpCapacitySimulator() {
  const [selectedClusterId, setSelectedClusterId] = useState<string>("cetp_01");
  const [productionShiftLoad, setProductionShiftLoad] = useState<number>(100); // % of standard shift

  const selectedCluster =
    CETP_CLUSTERS.find((c) => c.id === selectedClusterId) || CETP_CLUSTERS[0];

  const simulatedLoadMld = (
    selectedCluster.currentLoadMld *
    (productionShiftLoad / 100)
  ).toFixed(1);
  const utilizationPercent = Math.round(
    (parseFloat(simulatedLoadMld) / selectedCluster.designCapacityMld) * 100
  );

  const isOverloaded = utilizationPercent > 100;
  const isWarning = utilizationPercent > 85 && utilizationPercent <= 100;

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
          <span className="mono small" style={{ color: "#d97706", fontWeight: 700 }}>
            🏭 CETP HYDRAULIC STRAIN & BOTTLENECK SIMULATOR
          </span>
          <h3 style={{ fontSize: "18px", margin: "4px 0 2px" }}>
            Common Effluent Treatment Plant Peak Capacity Load
          </h3>
          <p className="small muted" style={{ margin: 0 }}>
            Simulate shift production peaks across Tiruppur CETP dyeing clusters and monitor hydraulic overload risk.
          </p>
        </div>

        {/* CETP Selector Pills */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {CETP_CLUSTERS.map((cluster) => (
            <button
              key={cluster.id}
              onClick={() => setSelectedClusterId(cluster.id)}
              className="btn-ghost"
              style={{
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: selectedClusterId === cluster.id ? 700 : 400,
                background:
                  selectedClusterId === cluster.id
                    ? "var(--indigo-soft)"
                    : "transparent",
                borderRadius: "4px",
              }}
            >
              {cluster.name}
            </button>
          ))}
        </div>
      </div>

      {/* Production Shift Intensity Slider */}
      <div
        style={{
          background: "var(--paper)",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid var(--hairline)",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <label style={{ fontSize: "13px", fontWeight: 600 }}>
            Industrial Shift Processing Load (% of Baseline):
          </label>
          <span
            className="mono"
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: isOverloaded
                ? "#ef4444"
                : isWarning
                ? "#f59e0b"
                : "#22c55e",
            }}
          >
            {productionShiftLoad}% Peak Load
          </span>
        </div>
        <input
          type="range"
          min="50"
          max="150"
          value={productionShiftLoad}
          onChange={(e) => setProductionShiftLoad(parseInt(e.target.value, 10))}
          style={{ width: "100%", accentColor: "#d97706", cursor: "pointer" }}
        />
      </div>

      {/* Real-Time CETP Status Grid */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
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
            Connected Dyeing Units
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "18px",
              fontWeight: 800,
            }}
          >
            {selectedCluster.connectedUnits}{" "}
            <span style={{ fontSize: "12px" }}>facilities</span>
          </p>
          <span className="small muted" style={{ fontSize: "11px" }}>
            {selectedCluster.location}
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
            Design Hydraulic Capacity
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "18px",
              fontWeight: 800,
            }}
          >
            {selectedCluster.designCapacityMld}{" "}
            <span style={{ fontSize: "12px" }}>MLD</span>
          </p>
          <span className="small muted" style={{ fontSize: "11px" }}>
            Million Litres / Day
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
            Simulated Effluent Flow
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "18px",
              fontWeight: 800,
              color: isOverloaded
                ? "#ef4444"
                : isWarning
                ? "#f59e0b"
                : "#22c55e",
            }}
          >
            {simulatedLoadMld} <span style={{ fontSize: "12px" }}>MLD</span>
          </p>
          <span className="small muted" style={{ fontSize: "11px" }}>
            {utilizationPercent}% Plant Capacity
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
            ZLD System Risk Status
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "13px",
              fontWeight: 700,
              color: isOverloaded
                ? "#ef4444"
                : isWarning
                ? "#f59e0b"
                : "#22c55e",
            }}
          >
            {isOverloaded
              ? "⚠️ HYDRAULIC BOTTLENECK RISK"
              : isWarning
              ? "⚡ HIGH CAPACITY UTILIZATION"
              : "✓ NORMAL ZLD FLUX RATE"}
          </p>
          <span className="small muted" style={{ fontSize: "11px" }}>
            {selectedCluster.zldMembraneStatus}
          </span>
        </div>
      </div>
    </div>
  );
}
