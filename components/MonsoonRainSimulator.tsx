"use client";

import { useState } from "react";

export default function MonsoonRainSimulator() {
  const [rainfallMm, setRainfallMm] = useState<number>(0);
  const [season, setSeason] = useState<"dry" | "moderate" | "heavy_monsoon">("dry");

  // Hydrological calculations based on rainfall
  const baseFlow = 2.5; // m3/s
  const runoffFlow = baseFlow + (rainfallMm * 0.45);
  const dilutionFactor = (baseFlow / runoffFlow).toFixed(2);
  const ecBaseline = 3200; // uS/cm
  const dilutedEc = Math.round(ecBaseline * parseFloat(dilutionFactor));
  const bayesianUncertaintyWindow = rainfallMm > 60 ? "Abstain / High Noise Threshold" : rainfallMm > 20 ? "Moderate Noise Correction" : "High Confidence Attribution";

  const handleSeasonSelect = (s: "dry" | "moderate" | "heavy_monsoon") => {
    setSeason(s);
    if (s === "dry") setRainfallMm(0);
    else if (s === "moderate") setRainfallMm(35);
    else setRainfallMm(110);
  };

  return (
    <div className="card" style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <span className="mono small" style={{ color: "#3b82f6", fontWeight: 700 }}>
            🌧️ HYDROLOGICAL RAINFALL & RUNOFF SIMULATOR
          </span>
          <h3 style={{ fontSize: "18px", margin: "4px 0 2px" }}>
            Monsoon Dilution & Noise Correction
          </h3>
          <p className="small muted" style={{ margin: 0 }}>
            Simulate seasonal precipitation impact on Noyyal River flow rates and observe how Bayesian attribution handles signal dilution.
          </p>
        </div>

        {/* Season presets */}
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            className="btn-ghost"
            onClick={() => handleSeasonSelect("dry")}
            style={{
              padding: "4px 10px",
              fontSize: "12px",
              fontWeight: season === "dry" ? 700 : 400,
              background: season === "dry" ? "var(--indigo-soft)" : "transparent",
              borderRadius: "4px",
            }}
          >
            ☀️ Dry Season (0mm)
          </button>
          <button
            className="btn-ghost"
            onClick={() => handleSeasonSelect("moderate")}
            style={{
              padding: "4px 10px",
              fontSize: "12px",
              fontWeight: season === "moderate" ? 700 : 400,
              background: season === "moderate" ? "var(--indigo-soft)" : "transparent",
              borderRadius: "4px",
            }}
          >
            🌧️ Light Rain (35mm)
          </button>
          <button
            className="btn-ghost"
            onClick={() => handleSeasonSelect("heavy_monsoon")}
            style={{
              padding: "4px 10px",
              fontSize: "12px",
              fontWeight: season === "heavy_monsoon" ? 700 : 400,
              background: season === "heavy_monsoon" ? "var(--indigo-soft)" : "transparent",
              borderRadius: "4px",
            }}
          >
            ⛈️ Heavy Monsoon (110mm)
          </button>
        </div>
      </div>

      {/* Interactive Rainfall Slider */}
      <div style={{ background: "var(--paper)", padding: "16px", borderRadius: "8px", border: "1px solid var(--hairline)", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600 }}>Precipitation Rate (mm/hr):</label>
          <span className="mono" style={{ fontSize: "16px", fontWeight: 700, color: "var(--indigo-bright, #818cf8)" }}>
            {rainfallMm} mm/hr
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="150"
          value={rainfallMm}
          onChange={(e) => {
            setRainfallMm(parseInt(e.target.value, 10));
            setSeason("moderate");
          }}
          style={{ width: "100%", accentColor: "#4f46e5", cursor: "pointer" }}
        />
      </div>

      {/* Real-time Hydrological Impact Grid */}
      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}
      >
        <div style={{ background: "var(--paper)", padding: "12px", borderRadius: "6px", border: "1px solid var(--hairline)" }}>
          <p className="small muted" style={{ margin: 0 }}>Noyyal River Flow Rate</p>
          <p style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: 800, color: "#2563eb" }}>
            {runoffFlow.toFixed(2)} <span style={{ fontSize: "12px" }}>m³/s</span>
          </p>
          <span className="small muted" style={{ fontSize: "11px" }}>Base: {baseFlow} m³/s</span>
        </div>

        <div style={{ background: "var(--paper)", padding: "12px", borderRadius: "6px", border: "1px solid var(--hairline)" }}>
          <p className="small muted" style={{ margin: 0 }}>Dilution Factor</p>
          <p style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: 800, color: "#0284c7" }}>
            {dilutionFactor}x
          </p>
          <span className="small muted" style={{ fontSize: "11px" }}>Effluent Concentration Ratio</span>
        </div>

        <div style={{ background: "var(--paper)", padding: "12px", borderRadius: "6px", border: "1px solid var(--hairline)" }}>
          <p className="small muted" style={{ margin: 0 }}>Diluted Sensor EC</p>
          <p style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: 800, color: "#d97706" }}>
            {dilutedEc} <span style={{ fontSize: "12px" }}>µS/cm</span>
          </p>
          <span className="small muted" style={{ fontSize: "11px" }}>Base EC: {ecBaseline} µS/cm</span>
        </div>

        <div style={{ background: "var(--paper)", padding: "12px", borderRadius: "6px", border: "1px solid var(--hairline)" }}>
          <p className="small muted" style={{ margin: 0 }}>Bayesian Decision Model</p>
          <p style={{ margin: "4px 0 0", fontSize: "13px", fontWeight: 700, color: rainfallMm > 60 ? "#eab308" : "#22c55e" }}>
            {bayesianUncertaintyWindow}
          </p>
          <span className="small muted" style={{ fontSize: "11px" }}>
            {rainfallMm > 60 ? "Abstains to prevent false accusations" : "Standard Bayesian Threshold"}
          </span>
        </div>
      </div>
    </div>
  );
}
