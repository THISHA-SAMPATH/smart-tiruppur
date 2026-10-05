"use client";

import React, { useState, useEffect } from "react";
import SteriCityOverviewCard from "@/components/steri/SteriCityOverviewCard";
import SteriWeightAdjuster from "@/components/steri/SteriWeightAdjuster";
import SteriSpatialGrid from "@/components/steri/SteriSpatialGrid";
import SteriModelComparisonPanel from "@/components/steri/SteriModelComparisonPanel";
import SteriInspectorModal from "@/components/steri/SteriInspectorModal";
import { SteriCityOverview, SteriModelComparison, SpatialRiskUnit, SteriWeights } from "@/lib/steri/types";
import { DEFAULT_STERI_WEIGHTS, calculateSteri, evaluateSteriModels } from "@/lib/steri/calculator";

export default function SteriPage() {
  const [weights, setWeights] = useState<SteriWeights>(DEFAULT_STERI_WEIGHTS);
  const [overview, setOverview] = useState<SteriCityOverview>(() => calculateSteri(DEFAULT_STERI_WEIGHTS));
  const [comparison, setComparison] = useState<SteriModelComparison>(() => evaluateSteriModels(DEFAULT_STERI_WEIGHTS));
  const [selectedUnit, setSelectedUnit] = useState<SpatialRiskUnit | null>(null);
  const [showWeightsConfig, setShowWeightsConfig] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"overview" | "comparison" | "methodology">("overview");

  // Recalculate STERI on weight change
  useEffect(() => {
    const newOverview = calculateSteri(weights);
    const newComparison = evaluateSteriModels(weights);
    setOverview(newOverview);
    setComparison(newComparison);
  }, [weights]);

  const handleResetDefaults = () => {
    setWeights(DEFAULT_STERI_WEIGHTS);
  };

  return (
    <div className="workspace-page">
      {/* Header */}
      <header className="workspace-header">
        <div>
          <p className="eyebrow">ENVIRONMENTAL INTELLIGENCE · RESEARCH MODULE</p>
          <h1>Smart Tiruppur Environmental Risk Index (STERI)</h1>
          <p>
            Spatial multi-criteria decision-support framework synthesizing industrial pollution anomalies, Noyyal water quality, monsoon flood risk, CGWB groundwater draft, industrial cluster pressure, and geotagged citizen grievances into a unified 0.00 – 1.00 risk index.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
          <button
            type="button"
            className={`btn ${activeTab === "overview" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setActiveTab("overview")}
            style={{ fontSize: "13px" }}
          >
            📊 Spatial Risk Index
          </button>
          <button
            type="button"
            className={`btn ${activeTab === "comparison" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setActiveTab("comparison")}
            style={{ fontSize: "13px" }}
          >
            🔬 Baseline Model Sensitivity
          </button>
          <button
            type="button"
            className={`btn ${activeTab === "methodology" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setActiveTab("methodology")}
            style={{ fontSize: "13px" }}
          >
            📜 Formulation & Provenance
          </button>
        </div>
      </header>

      {/* Main Content Areas */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "16px" }}>
          {/* Citywide Aggregate Overview Card */}
          <SteriCityOverviewCard
            overview={overview}
            onOpenWeightModal={() => setShowWeightsConfig(!showWeightsConfig)}
          />

          {/* Collapsible / Toggleable Weight Adjuster */}
          {showWeightsConfig && (
            <SteriWeightAdjuster
              weights={weights}
              onChangeWeights={setWeights}
              onResetDefaults={handleResetDefaults}
            />
          )}

          {/* Spatial Sector Grid */}
          <SteriSpatialGrid
            units={overview.units}
            onSelectUnit={setSelectedUnit}
          />
        </div>
      )}

      {activeTab === "comparison" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "16px" }}>
          <SteriModelComparisonPanel comparison={comparison} />
          
          <SteriWeightAdjuster
            weights={weights}
            onChangeWeights={setWeights}
            onResetDefaults={handleResetDefaults}
          />

          <SteriSpatialGrid
            units={overview.units}
            onSelectUnit={setSelectedUnit}
          />
        </div>
      )}

      {activeTab === "methodology" && (
        <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="card" style={{ padding: "20px", background: "var(--paper-raised)" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "18px", fontWeight: 700 }}>
              Mathematical Formulation & Multi-Criteria GIS Model
            </h3>
            <p className="small muted" style={{ lineHeight: 1.6 }}>
              The Smart Tiruppur Environmental Risk Index (STERI_i) is calculated for every spatial unit i in 1..N across Tiruppur District using the normalized weighted sum model:
            </p>
            <div
              className="mono"
              style={{
                padding: "14px",
                background: "var(--paper-subtle)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--hairline)",
                fontSize: "14px",
                fontWeight: 700,
                color: "var(--color-indigo)",
                margin: "12px 0",
              }}
            >
              STERI_i = w_p · Pollution_i + w_w · WaterQuality_i + w_f · Flood_i + w_g · Groundwater_i + w_i · IndustrialPressure_i + w_c · Complaint_i
            </div>
            <p className="small muted" style={{ lineHeight: 1.6 }}>
              where all component sub-scores S_(k,i) in [0.0, 1.0] are normalized prior to spatial aggregation, and weights w_k satisfy sum(w_k) = 1.0.
            </p>
          </div>

          <div className="card" style={{ padding: "20px", background: "var(--paper-raised)" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "18px", fontWeight: 700 }}>
              Risk Classification Tiers
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
              <div style={{ padding: "12px", background: "rgba(22, 163, 74, 0.08)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(22, 163, 74, 0.2)" }}>
                <strong style={{ color: "#16a34a", display: "block" }}>● LOW [0.00 – 0.20)</strong>
                <span className="small muted">Minimal environmental stress; routine baseline surveillance.</span>
              </div>

              <div style={{ padding: "12px", background: "rgba(2, 132, 199, 0.08)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(2, 132, 199, 0.2)" }}>
                <strong style={{ color: "#0284c7", display: "block" }}>● MODERATE [0.20 – 0.40)</strong>
                <span className="small muted">Moderate pressure; regular telemetry verification.</span>
              </div>

              <div style={{ padding: "12px", background: "rgba(217, 119, 6, 0.08)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(217, 119, 6, 0.2)" }}>
                <strong style={{ color: "#d97706", display: "block" }}>▲ HIGH [0.40 – 0.60)</strong>
                <span className="small muted">Elevated risk; targeted CETP & borehole extraction audit.</span>
              </div>

              <div style={{ padding: "12px", background: "rgba(249, 115, 22, 0.08)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(249, 115, 22, 0.2)" }}>
                <strong style={{ color: "#f97316", display: "block" }}>▲ VERY HIGH [0.60 – 0.80)</strong>
                <span className="small muted">Severe vulnerability; activate automated warning alerts.</span>
              </div>

              <div style={{ padding: "12px", background: "rgba(220, 38, 38, 0.08)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(220, 38, 38, 0.2)" }}>
                <strong style={{ color: "#dc2626", display: "block" }}>! CRITICAL [0.80 – 1.00]</strong>
                <span className="small muted">Emergency alert tier; despatch immediate regulatory response team.</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: "20px", background: "var(--paper-raised)" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "18px", fontWeight: 700 }}>
              Data Provenance & Transparency Principles
            </h3>
            <p className="small muted" style={{ lineHeight: 1.6 }}>
              In accordance with academic decision-support standards, STERI explicitly segregates:
            </p>
            <ul className="small muted" style={{ lineHeight: 1.8, paddingLeft: "20px" }}>
              <li><strong>● Live Hardware Telemetry:</strong> Physical IoT sensors deployed at Noyyal entry/exit bridges and CETP discharge ports.</li>
              <li><strong>◐ Simulated Physics Models:</strong> Hydrodynamic 2D flood models and chemical plume advection-dispersion engines.</li>
              <li><strong>◆ Derived AI Analytics:</strong> Bayesian source attribution models and spatial Kriging interpolations.</li>
              <li><strong>◇ Historical Baselines:</strong> CGWB 2023 dynamic groundwater assessments and TNPCB registration databases.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Sector Inspector Modal */}
      <SteriInspectorModal
        unit={selectedUnit}
        onClose={() => setSelectedUnit(null)}
      />
    </div>
  );
}
