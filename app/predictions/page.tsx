"use client";

import React, { useState, useEffect } from "react";
import PredictionChart from "@/components/prediction/PredictionChart";
import ExplainableRiskCard from "@/components/xai/ExplainableRiskCard";
import { TimeSeriesPrediction, PredictionHorizon, TargetMetricType } from "@/lib/prediction/types";
import { predictionService } from "@/lib/prediction/service";
import { generateWaterQualityExplanation } from "@/lib/xai/engine";

export default function PredictionsPage() {
  const [horizon, setHorizon] = useState<PredictionHorizon>("+3h");
  const [targetType, setTargetType] = useState<TargetMetricType>("water_quality");
  const [prediction, setPrediction] = useState<TimeSeriesPrediction | null>(null);
  const [allPredictions, setAllPredictions] = useState<TimeSeriesPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    void (async () => {
      const mainPred = await predictionService.getPrediction("tnpcb_noyyal_002", targetType, {}, horizon);
      const allPreds = await predictionService.getAllTargetPredictions(horizon);

      if (isMounted) {
        setPrediction(mainPred);
        setAllPredictions(allPreds);
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [horizon, targetType]);

  const xaiExplanation = prediction
    ? generateWaterQualityExplanation(
        prediction.targetName,
        prediction.inputs.ec || 2850,
        prediction.inputs.ph || 6.8,
        prediction.inputs.turbidity || 45
      )
    : null;

  return (
    <div className="workspace-page">
      {/* Header */}
      <header className="workspace-header">
        <div>
          <p className="eyebrow">ENVIRONMENTAL INTELLIGENCE · RESEARCH MODULE</p>
          <h1>Environmental Early Warning & Time-Series Predictions</h1>
          <p>
            Generic time-series predictive architecture generating +1h, +3h, +6h, and +24h risk forecasts for Noyyal water quality, industrial discharge anomalies, monsoon flood levels, and aquifer draft.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
          {[
            { id: "water_quality", label: "Noyyal Water Quality 🌊" },
            { id: "pollution", label: "Industrial Pollution Anomaly 🏭" },
            { id: "flood", label: "Monsoon Flood Stage 🌧️" },
            { id: "groundwater", label: "Aquifer Draft Stress 💧" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`btn ${targetType === item.id ? "btn-primary" : "btn-outline"}`}
              style={{ fontSize: "12px" }}
              onClick={() => setTargetType(item.id as TargetMetricType)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      {loading || !prediction ? (
        <div style={{ padding: "40px", textAlign: "center" }} className="card">
          <span className="pulse" />
          <p className="muted small">Generating Early Warning Time-Series Forecasts…</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "16px" }}>
          {/* Main Forecast Chart */}
          <PredictionChart
            prediction={prediction}
            selectedHorizon={horizon}
            onChangeHorizon={setHorizon}
          />

          {/* XAI Explanation Card */}
          {xaiExplanation && (
            <ExplainableRiskCard
              explanation={xaiExplanation}
              titleOverride={`WHY IS ${prediction.targetName.toUpperCase()} FORECAST AT ${prediction.predictedValue} ${prediction.unitOfMeasure}?`}
            />
          )}

          {/* All Station Forecast Grid */}
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 12px 0" }}>
              District-Wide Early Warning Overview ({horizon} Forecast Horizon)
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
              {allPredictions.map((pred) => (
                <div
                  key={pred.id}
                  className="card"
                  style={{
                    padding: "16px",
                    background: "var(--paper-raised)",
                    border: "1px solid var(--hairline)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <span className="eyebrow" style={{ fontSize: "9px" }}>{pred.targetType.toUpperCase()}</span>
                      <h4 style={{ margin: "2px 0 0 0", fontSize: "14px", fontWeight: 700 }}>{pred.targetName}</h4>
                    </div>
                    <span className="badge badge-normal" style={{ fontSize: "10px" }}>
                      {pred.riskCategory}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "12px" }}>
                    <div>
                      <span className="small muted">Current</span>
                      <div className="mono" style={{ fontSize: "16px", fontWeight: 700 }}>
                        {pred.currentValue} <span style={{ fontSize: "10px" }}>{pred.unitOfMeasure}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span className="small muted">Predicted ({horizon})</span>
                      <div className="mono" style={{ fontSize: "18px", fontWeight: 800, color: "#d97706" }}>
                        {pred.predictedValue} <span style={{ fontSize: "10px" }}>{pred.unitOfMeasure}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid var(--hairline)", display: "flex", justifyContent: "space-between", fontSize: "10px" }} className="muted">
                    <span>⚡ {pred.mode}</span>
                    <span>{(pred.confidence * 100).toFixed(0)}% Conf.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
