"use client";

import { useState } from "react";

interface NeighborhoodWaterData {
  id: string;
  name: string;
  tdsPpm: number;
  ph: number;
  hardnessPpm: number;
  safetyRating: "Excellent" | "Good" | "Moderate" | "Action Needed";
  cookingSafe: boolean;
  bathingSafe: boolean;
  drinkingSafeAfterBoiling: boolean;
  lastUpdated: string;
}

const NEIGHBORHOODS: NeighborhoodWaterData[] = [
  {
    id: "n_01",
    name: "Avinashi Road / North City",
    tdsPpm: 210,
    ph: 7.2,
    hardnessPpm: 120,
    safetyRating: "Excellent",
    cookingSafe: true,
    bathingSafe: true,
    drinkingSafeAfterBoiling: true,
    lastUpdated: "Today, 08:30 AM",
  },
  {
    id: "n_02",
    name: "Velampalayam & West Ward",
    tdsPpm: 340,
    ph: 7.5,
    hardnessPpm: 180,
    safetyRating: "Good",
    cookingSafe: true,
    bathingSafe: true,
    drinkingSafeAfterBoiling: true,
    lastUpdated: "Today, 08:15 AM",
  },
  {
    id: "n_03",
    name: "Kumaran Road & Market Hub",
    tdsPpm: 480,
    ph: 7.8,
    hardnessPpm: 240,
    safetyRating: "Moderate",
    cookingSafe: true,
    bathingSafe: true,
    drinkingSafeAfterBoiling: true,
    lastUpdated: "Today, 07:45 AM",
  },
  {
    id: "n_04",
    name: "Dharapuram Road & South Sector",
    tdsPpm: 620,
    ph: 8.1,
    hardnessPpm: 310,
    safetyRating: "Action Needed",
    cookingSafe: false,
    bathingSafe: true,
    drinkingSafeAfterBoiling: true,
    lastUpdated: "Today, 07:30 AM",
  },
];

export default function DailyWaterSafetyCard() {
  const [selectedId, setSelectedId] = useState<string>("n_01");

  const current =
    NEIGHBORHOODS.find((n) => n.id === selectedId) || NEIGHBORHOODS[0];

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "Excellent":
        return "#22c55e";
      case "Good":
        return "#3b82f6";
      case "Moderate":
        return "#f59e0b";
      case "Action Needed":
        return "#ef4444";
      default:
        return "#22c55e";
    }
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
          <span
            className="mono small"
            style={{ color: "#22c55e", fontWeight: 700 }}
          >
            🚰 DAILY CITIZEN UTILITY
          </span>
          <h3 style={{ fontSize: "20px", margin: "4px 0 2px" }}>
            Is My Water Safe Today?
          </h3>
          <p className="small muted" style={{ margin: 0 }}>
            Daily neighborhood tap & groundwater quality index for Tiruppur residents.
          </p>
        </div>

        {/* Neighborhood Selector */}
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid var(--hairline)",
            background: "var(--paper)",
            color: "inherit",
            fontWeight: 600,
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          {NEIGHBORHOODS.map((n) => (
            <option key={n.id} value={n.id}>
              📍 {n.name}
            </option>
          ))}
        </select>
      </div>

      {/* Main Safety Status Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--paper)",
          padding: "16px 20px",
          borderRadius: "8px",
          border: `1px solid ${getRatingColor(current.safetyRating)}33`,
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <span className="small muted">Overall Neighborhood Safety Rating</span>
          <h4
            style={{
              fontSize: "24px",
              margin: "2px 0 0",
              fontWeight: 800,
              color: getRatingColor(current.safetyRating),
            }}
          >
            {current.safetyRating} Quality
          </h4>
          <span className="small muted" style={{ fontSize: "11px" }}>
            Updated: {current.lastUpdated}
          </span>
        </div>

        {/* Quick Safety Badges */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <div
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              background: current.cookingSafe ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
              border: current.cookingSafe ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)",
              fontSize: "12px",
              fontWeight: 600,
              color: current.cookingSafe ? "#166534" : "#991b1b",
            }}
          >
            {current.cookingSafe ? "🍳 Safe for Cooking" : "⚠️ Filter Before Cooking"}
          </div>

          <div
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.3)",
              fontSize: "12px",
              fontWeight: 600,
              color: "#1e40af",
            }}
          >
            🚿 Safe for Bathing
          </div>

          <div
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              background: "rgba(234,179,8,0.1)",
              border: "1px solid rgba(234,179,8,0.3)",
              fontSize: "12px",
              fontWeight: 600,
              color: "#854d0e",
            }}
          >
            🫖 Boil Before Drinking
          </div>
        </div>
      </div>

      {/* Numerical Metrics Grid */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
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
            Total Dissolved Solids (TDS)
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "20px",
              fontWeight: 800,
            }}
          >
            {current.tdsPpm} <span style={{ fontSize: "12px" }}>ppm</span>
          </p>
          <span className="small muted" style={{ fontSize: "11px" }}>
            BIS Limit: 500 ppm
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
            pH Level
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "20px",
              fontWeight: 800,
              color: "#3b82f6",
            }}
          >
            {current.ph}
          </p>
          <span className="small muted" style={{ fontSize: "11px" }}>
            Optimal: 6.5 - 8.5
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
            Water Hardness
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "20px",
              fontWeight: 800,
            }}
          >
            {current.hardnessPpm} <span style={{ fontSize: "12px" }}>ppm</span>
          </p>
          <span className="small muted" style={{ fontSize: "11px" }}>
            Moderate Mineral Content
          </span>
        </div>
      </div>
    </div>
  );
}
