"use client";

import { useState } from "react";

export default function WaterRecyclingRoiCard() {
  const [recycledKlPerDay, setRecycledKlPerDay] = useState<number>(450); // Kilolitres / day
  const tankerCostPerKl = 120; // ₹ 120 per kilolitre of fresh water tanker
  const zldOperatingCostPerKl = 42; // ₹ 42 per kilolitre for ZLD evaporator energy/chem

  const netSavingsPerKl = tankerCostPerKl - zldOperatingCostPerKl; // ₹ 78 / KL
  const dailySavingsRupees = recycledKlPerDay * netSavingsPerKl;
  const monthlySavingsRupees = dailySavingsRupees * 30;
  const annualSavingsRupees = dailySavingsRupees * 365;

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
          <span className="mono small" style={{ color: "#16a34a", fontWeight: 700 }}>
            💰 INDUSTRY MANAGER FINANCIAL TOOL
          </span>
          <h3 style={{ fontSize: "18px", margin: "4px 0 2px" }}>
            Daily Water Recycling ROI & Rupee (₹) Savings Calculator
          </h3>
          <p className="small muted" style={{ margin: 0 }}>
            Calculate exact financial returns from ZLD water recycling vs purchasing fresh water tankers in Tiruppur.
          </p>
        </div>

        <div
          style={{
            background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
            color: "#fff",
            padding: "6px 14px",
            borderRadius: "6px",
            textAlign: "right",
          }}
        >
          <span style={{ fontSize: "10px", textTransform: "uppercase", opacity: 0.9 }}>
            Estimated Net Savings
          </span>
          <p style={{ margin: "2px 0 0", fontSize: "20px", fontWeight: 800 }}>
            ₹{(annualSavingsRupees / 100000).toFixed(2)} Lakh <span style={{ fontSize: "11px" }}>/ yr</span>
          </p>
        </div>
      </div>

      {/* Recycled Volume Slider */}
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
            Daily Recycled Effluent Volume (Kilolitres / Day):
          </label>
          <span
            className="mono"
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "var(--indigo-bright, #818cf8)",
            }}
          >
            {recycledKlPerDay} KL/day ({recycledKlPerDay * 1000} Litres)
          </span>
        </div>
        <input
          type="range"
          min="50"
          max="1500"
          step="50"
          value={recycledKlPerDay}
          onChange={(e) => setRecycledKlPerDay(parseInt(e.target.value, 10))}
          style={{ width: "100%", accentColor: "#16a34a", cursor: "pointer" }}
        />
      </div>

      {/* Financial ROI Metrics Breakdown */}
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
            Fresh Water Tanker Avoided
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "18px",
              fontWeight: 800,
              color: "#ef4444",
            }}
          >
            ₹{(recycledKlPerDay * tankerCostPerKl).toLocaleString("en-IN")}{" "}
            <span style={{ fontSize: "11px" }}>/ day</span>
          </p>
          <span className="small muted" style={{ fontSize: "11px" }}>
            @ ₹{tankerCostPerKl}/KL Tanker Rate
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
            ZLD System O&M Cost
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "18px",
              fontWeight: 800,
              color: "#eab308",
            }}
          >
            ₹{(recycledKlPerDay * zldOperatingCostPerKl).toLocaleString("en-IN")}{" "}
            <span style={{ fontSize: "11px" }}>/ day</span>
          </p>
          <span className="small muted" style={{ fontSize: "11px" }}>
            @ ₹{zldOperatingCostPerKl}/KL Energy & Chem
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
            Net Daily Profit Margin
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "18px",
              fontWeight: 800,
              color: "#22c55e",
            }}
          >
            ₹{dailySavingsRupees.toLocaleString("en-IN")}{" "}
            <span style={{ fontSize: "11px" }}>/ day</span>
          </p>
          <span className="small muted" style={{ fontSize: "11px" }}>
            Direct Operational Savings
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
            Monthly Net Savings
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "18px",
              fontWeight: 800,
              color: "#22c55e",
            }}
          >
            ₹{(monthlySavingsRupees / 100000).toFixed(2)} Lakh{" "}
            <span style={{ fontSize: "11px" }}>/ mo</span>
          </p>
          <span className="small muted" style={{ fontSize: "11px" }}>
            30-Day Operating Window
          </span>
        </div>
      </div>
    </div>
  );
}
