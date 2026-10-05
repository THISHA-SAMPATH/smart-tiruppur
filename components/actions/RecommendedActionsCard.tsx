"use client";

import React, { useState } from "react";
import { ActionRecommendation, ActionStatus } from "@/lib/actions/types";

interface RecommendedActionsCardProps {
  recommendation: ActionRecommendation;
  onUpdateStatus?: (id: string, newStatus: ActionStatus) => void;
}

export function getStatusBadgeStyle(status: ActionStatus) {
  switch (status) {
    case "OPEN":
      return { bg: "rgba(220, 38, 38, 0.12)", color: "#dc2626", border: "rgba(220, 38, 38, 0.3)" };
    case "ASSIGNED":
      return { bg: "rgba(217, 119, 6, 0.12)", color: "#d97706", border: "rgba(217, 119, 6, 0.3)" };
    case "IN_PROGRESS":
      return { bg: "rgba(2, 132, 199, 0.12)", color: "#0284c7", border: "rgba(2, 132, 199, 0.3)" };
    case "VERIFIED":
    case "RESOLVED":
      return { bg: "rgba(22, 163, 74, 0.12)", color: "#16a34a", border: "rgba(22, 163, 74, 0.3)" };
    case "REJECTED":
      return { bg: "rgba(100, 116, 139, 0.12)", color: "#64748b", border: "rgba(100, 116, 139, 0.3)" };
    default:
      return { bg: "rgba(100, 116, 139, 0.12)", color: "#64748b", border: "rgba(100, 116, 139, 0.3)" };
  }
}

export default function RecommendedActionsCard({
  recommendation,
  onUpdateStatus,
}: RecommendedActionsCardProps) {
  const [currentStatus, setCurrentStatus] = useState<ActionStatus>(recommendation.status);
  const statusBadge = getStatusBadgeStyle(currentStatus);

  const handleStatusChange = (newStatus: ActionStatus) => {
    setCurrentStatus(newStatus);
    if (onUpdateStatus) onUpdateStatus(recommendation.id, newStatus);
  };

  const priorityColor =
    recommendation.priorityScore >= 85
      ? "#dc2626"
      : recommendation.priorityScore >= 70
      ? "#d97706"
      : "#16a34a";

  return (
    <div
      className="card"
      style={{
        background: "var(--paper-raised)",
        border: "1px solid var(--hairline)",
        padding: "18px",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span className="eyebrow" style={{ fontSize: "10px" }}>
              ACTION ID: <span className="mono">{recommendation.id}</span>
            </span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "var(--radius-sm)",
                background: statusBadge.bg,
                color: statusBadge.color,
                border: `1px solid ${statusBadge.border}`,
              }}
            >
              ● STATUS: {currentStatus}
            </span>
          </div>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>{recommendation.title}</h3>
        </div>

        {/* Priority Score Meter */}
        <div style={{ textAlign: "right" }}>
          <span className="small muted">Priority Score</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
            <span className="mono" style={{ fontSize: "26px", fontWeight: 800, color: priorityColor }}>
              {recommendation.priorityScore}
            </span>
            <span className="small muted">/ 100</span>
          </div>
        </div>
      </div>

      {/* Action Description */}
      <div
        style={{
          margin: "14px 0",
          padding: "12px",
          background: "var(--paper-subtle)",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--hairline)",
          fontSize: "13px",
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: "var(--color-indigo)", display: "block", marginBottom: "2px" }}>
          ⚡ Recommended Municipal Intervention:
        </strong>
        {recommendation.recommendedAction}
      </div>

      {/* Grid Specs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", fontSize: "12px" }}>
        <div>
          <span className="small muted">Responsible Agency</span>
          <strong style={{ display: "block", fontSize: "13px", marginTop: "2px" }}>
            🏢 {recommendation.responsibleDepartment}
          </strong>
        </div>

        <div>
          <span className="small muted">Urgency Window</span>
          <strong style={{ display: "block", fontSize: "13px", marginTop: "2px", color: "#d97706" }}>
            ⏱️ {recommendation.urgency}
          </strong>
        </div>

        <div>
          <span className="small muted">Detected Risk Severity</span>
          <strong className="mono" style={{ display: "block", fontSize: "13px", marginTop: "2px" }}>
            {(recommendation.riskScore * 100).toFixed(0)}% Detected Severity
          </strong>
        </div>
      </div>

      {/* Cause / Reason Justification */}
      <div style={{ marginTop: "12px", fontSize: "12px" }}>
        <span className="small muted" style={{ fontWeight: 700 }}>Structured Cause / Factor Reason:</span>
        <p className="small muted" style={{ margin: "2px 0 0 0", color: "var(--color-slate-text)" }}>
          {recommendation.reason}
        </p>
      </div>

      {/* Status Transition Control & Provenance Footer */}
      <div
        style={{
          marginTop: "14px",
          paddingTop: "12px",
          borderTop: "1px solid var(--hairline)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span className="small muted" style={{ fontSize: "11px" }}>Update Status:</span>
          <select
            value={currentStatus}
            onChange={(e) => handleStatusChange(e.target.value as ActionStatus)}
            style={{
              fontSize: "11px",
              padding: "4px 8px",
              borderRadius: "4px",
              border: "1px solid var(--hairline)",
              background: "var(--paper-raised)",
              color: "var(--color-slate-text)",
              cursor: "pointer",
            }}
          >
            <option value="OPEN">OPEN</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="badge badge-normal" style={{ fontSize: "10px" }}>
            🛡️ {recommendation.verificationStatus}
          </span>
        </div>
      </div>
    </div>
  );
}
