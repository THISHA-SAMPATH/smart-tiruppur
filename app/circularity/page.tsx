"use client";

import React, { useState } from "react";
import { calculateCitywideCircularity } from "@/lib/circularity/engine";
import { IndustrialWaterFacility } from "@/lib/circularity/types";

export default function CircularityPage() {
  const [summary] = useState(() => calculateCitywideCircularity());
  const [selectedFacility, setSelectedFacility] = useState<IndustrialWaterFacility | null>(
    summary.facilities[0]
  );

  return (
    <div className="workspace-page">
      {/* Header */}
      <header className="workspace-header">
        <div>
          <p className="eyebrow">INDUSTRIAL ECOLOGY · TIRUPPUR TEXTILE CLUSTER</p>
          <h1>Industrial Water Circularity Module</h1>
          <p>
            Real-time water balance tracking, Zero-Liquid Discharge (ZLD) compliance monitoring, and recycled process water reuse rate metrics across Tiruppur's CETP dyeing facilities.
          </p>
        </div>

        <div style={{ marginTop: "10px" }}>
          <span className="badge badge-normal" style={{ fontSize: "10px", background: "rgba(14, 165, 233, 0.1)", color: "#0284c7" }}>
            ℹ️ DEMONSTRATION DATA (RESEARCH MODE)
          </span>
        </div>
      </header>

      {/* Citywide Circularity KPIs */}
      <div
        className="card"
        style={{
          background: "var(--paper-raised)",
          border: "1px solid var(--hairline)",
          padding: "20px",
          borderRadius: "var(--radius-md)",
          margin: "16px 0",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
          }}
        >
          <div>
            <span className="small muted">Citywide Recycled Reuse Rate</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "4px" }}>
              <span className="mono" style={{ fontSize: "32px", fontWeight: 800, color: "#16a34a" }}>
                {summary.citywideReuseRatePct}%
              </span>
              <span className="small muted">Recycled</span>
            </div>
          </div>

          <div>
            <span className="small muted">Circularity Score Index</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "4px" }}>
              <span className="mono" style={{ fontSize: "32px", fontWeight: 800, color: "var(--color-indigo)" }}>
                {summary.citywideCircularityScore}
              </span>
              <span className="small muted">/ 100</span>
            </div>
          </div>

          <div>
            <span className="small muted">Total Reused Water</span>
            <div className="mono" style={{ fontSize: "24px", fontWeight: 800, marginTop: "4px", color: "#0284c7" }}>
              {summary.citywideReusedMld} <span style={{ fontSize: "12px" }}>MLD</span>
            </div>
          </div>

          <div>
            <span className="small muted">Freshwater Abstraction</span>
            <div className="mono" style={{ fontSize: "24px", fontWeight: 800, marginTop: "4px" }}>
              {summary.citywideFreshwaterMld} <span style={{ fontSize: "12px" }}>MLD</span>
            </div>
          </div>

          <div>
            <span className="small muted">ZLD Certified Facilities</span>
            <div style={{ fontSize: "20px", fontWeight: 700, marginTop: "4px", color: "#16a34a" }}>
              {summary.zldCompliantRatio} ZLD
            </div>
          </div>
        </div>
      </div>

      {/* Facility Water Balance Flow (Sankey-style Diagram) */}
      {selectedFacility && (
        <div
          className="card"
          style={{
            background: "var(--paper-raised)",
            border: "1px solid var(--hairline)",
            padding: "20px",
            borderRadius: "var(--radius-md)",
            margin: "16px 0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
            <div>
              <span className="eyebrow" style={{ fontSize: "10px" }}>WATER BALANCE FLOW DIAGRAM</span>
              <h3 style={{ margin: "2px 0 0 0", fontSize: "18px", fontWeight: 700 }}>
                {selectedFacility.name}
              </h3>
              <span className="small muted" style={{ fontSize: "11px" }}>{selectedFacility.facilityType}</span>
            </div>

            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: "var(--radius-sm)",
                background: selectedFacility.complianceStatus === "ZLD COMPLIANT" ? "rgba(22, 163, 74, 0.12)" : "rgba(220, 38, 38, 0.12)",
                color: selectedFacility.complianceStatus === "ZLD COMPLIANT" ? "#16a34a" : "#dc2626",
                border: selectedFacility.complianceStatus === "ZLD COMPLIANT" ? "1px solid rgba(22, 163, 74, 0.3)" : "1px solid rgba(220, 38, 38, 0.3)",
              }}
            >
              {selectedFacility.complianceStatus}
            </span>
          </div>

          {/* Water Flow Diagram Nodes */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", textAlign: "center" }}>
            <div style={{ padding: "12px", background: "var(--paper-subtle)", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
              <span className="small muted" style={{ fontSize: "11px" }}>💧 Freshwater Intake</span>
              <div className="mono" style={{ fontSize: "18px", fontWeight: 800, marginTop: "4px" }}>
                {selectedFacility.freshwaterIntakeMld} MLD
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "20px", color: "var(--color-indigo)" }}>➔</span>
            </div>

            <div style={{ padding: "12px", background: "var(--paper-subtle)", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
              <span className="small muted" style={{ fontSize: "11px" }}>🏭 Process Water Demand</span>
              <div className="mono" style={{ fontSize: "18px", fontWeight: 800, marginTop: "4px" }}>
                {selectedFacility.processWaterReqMld} MLD
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "20px", color: "var(--color-indigo)" }}>➔</span>
            </div>

            <div style={{ padding: "12px", background: "var(--paper-subtle)", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
              <span className="small muted" style={{ fontSize: "11px" }}>⚡ CETP Treatment</span>
              <div className="mono" style={{ fontSize: "18px", fontWeight: 800, marginTop: "4px" }}>
                {selectedFacility.treatedWaterMld} MLD
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "20px", color: "#16a34a" }}>➔</span>
            </div>

            <div style={{ padding: "12px", background: "rgba(22, 163, 74, 0.08)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(22, 163, 74, 0.3)" }}>
              <span className="small" style={{ fontSize: "11px", fontWeight: 700, color: "#16a34a" }}>♻️ Recycled Reuse</span>
              <div className="mono" style={{ fontSize: "18px", fontWeight: 800, color: "#16a34a", marginTop: "4px" }}>
                {selectedFacility.waterReuseMld} MLD ({selectedFacility.reusePercentage}%)
              </div>
            </div>
          </div>

          {/* Anomaly Candidate Notice if applicable */}
          {selectedFacility.isPotentialSourceCandidate && (
            <div
              style={{
                marginTop: "16px",
                padding: "12px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(217, 119, 6, 0.08)",
                border: "1px solid rgba(217, 119, 6, 0.3)",
              }}
            >
              <strong style={{ color: "#d97706", display: "block", marginBottom: "2px" }}>
                ⚠️ POTENTIAL SOURCE CANDIDATE FOR SAMPLING
              </strong>
              <p className="small muted" style={{ margin: 0, fontSize: "12px" }}>
                {selectedFacility.anomalyNotes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Facility Comparison Table */}
      <div style={{ marginTop: "20px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 12px 0" }}>
          Industrial Facility Water Balance Comparison ({summary.facilities.length} Facilities)
        </h3>

        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
            <thead>
              <tr style={{ background: "var(--paper-subtle)", borderBottom: "1px solid var(--hairline)", textAlign: "left" }}>
                <th style={{ padding: "12px 16px" }}>Facility Name</th>
                <th style={{ padding: "12px 16px" }}>Freshwater (MLD)</th>
                <th style={{ padding: "12px 16px" }}>Process Req (MLD)</th>
                <th style={{ padding: "12px 16px" }}>Reused Water (MLD)</th>
                <th style={{ padding: "12px 16px" }}>Reuse Rate (%)</th>
                <th style={{ padding: "12px 16px" }}>Circularity Score</th>
                <th style={{ padding: "12px 16px" }}>Compliance Status</th>
                <th style={{ padding: "12px 16px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {summary.facilities.map((fac) => (
                <tr
                  key={fac.unit_id}
                  style={{
                    borderBottom: "1px solid var(--hairline)",
                    background: selectedFacility?.unit_id === fac.unit_id ? "rgba(37, 99, 235, 0.05)" : "transparent",
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedFacility(fac)}
                >
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>{fac.name}</td>
                  <td style={{ padding: "12px 16px" }} className="mono">{fac.freshwaterIntakeMld}</td>
                  <td style={{ padding: "12px 16px" }} className="mono">{fac.processWaterReqMld}</td>
                  <td style={{ padding: "12px 16px", color: "#16a34a", fontWeight: 700 }} className="mono">{fac.waterReuseMld}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 700 }} className="mono">{fac.reusePercentage}%</td>
                  <td style={{ padding: "12px 16px", fontWeight: 800, color: "var(--color-indigo)" }} className="mono">{fac.circularityScore}/100</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: "3px",
                        background: fac.complianceStatus === "ZLD COMPLIANT" ? "rgba(22, 163, 74, 0.1)" : "rgba(220, 38, 38, 0.1)",
                        color: fac.complianceStatus === "ZLD COMPLIANT" ? "#16a34a" : "#dc2626",
                      }}
                    >
                      {fac.complianceStatus}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: "11px", padding: "2px 8px" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFacility(fac);
                      }}
                    >
                      Inspect Diagram 📊
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
