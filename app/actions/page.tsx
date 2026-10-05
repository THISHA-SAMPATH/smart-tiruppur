"use client";

import React, { useState, useEffect } from "react";
import RecommendedActionsCard from "@/components/actions/RecommendedActionsCard";
import { ActionRecommendation, ActionStatus } from "@/lib/actions/types";
import { getInitialRecommendations } from "@/lib/actions/engine";

export default function ActionsPage() {
  const [recommendations, setRecommendations] = useState<ActionRecommendation[]>(() => getInitialRecommendations());
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  useEffect(() => {
    // Fetch dynamic action list from API if available
    fetch("/api/actions")
      .then((res) => res.json())
      .then((data: ActionRecommendation[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setRecommendations(data);
        }
      })
      .catch((err) => console.error("Could not fetch actions:", err));
  }, []);

  const handleUpdateStatus = (id: string, newStatus: ActionStatus) => {
    setRecommendations((prev) =>
      prev.map((rec) => (rec.id === id ? { ...rec, status: newStatus } : rec))
    );

    // Call API patch
    fetch("/api/actions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    }).catch((err) => console.error("Failed to update status:", err));
  };

  const filtered = filterStatus === "ALL"
    ? recommendations
    : recommendations.filter((r) => r.status === filterStatus);

  const topPriorityCount = recommendations.filter((r) => r.priorityScore >= 80).length;

  return (
    <div className="workspace-page">
      {/* Header */}
      <header className="workspace-header">
        <div>
          <p className="eyebrow">MUNICIPAL INTERVENTIONS · DECISION SUPPORT</p>
          <h1>Action Recommendation Engine</h1>
          <p>
            Automated priority scoring and structured municipal intervention pipeline converting detected environmental risks into actionable, non-accusatory department work orders.
          </p>
        </div>

        {/* Action Summary KPI Cards */}
        <div style={{ display: "flex", gap: "12px", marginTop: "14px", flexWrap: "wrap" }}>
          <div className="card" style={{ padding: "10px 16px", minWidth: "140px" }}>
            <span className="small muted">Total Active Actions</span>
            <strong className="mono" style={{ fontSize: "20px", display: "block" }}>{recommendations.length}</strong>
          </div>

          <div className="card" style={{ padding: "10px 16px", minWidth: "140px" }}>
            <span className="small muted">High Priority (&ge;80)</span>
            <strong className="mono" style={{ fontSize: "20px", display: "block", color: "#dc2626" }}>
              {topPriorityCount}
            </strong>
          </div>

          <div className="card" style={{ padding: "10px 16px", minWidth: "140px" }}>
            <span className="small muted">Ledger Verified</span>
            <span className="badge badge-normal" style={{ marginTop: "4px" }}>
              100% Provenance
            </span>
          </div>
        </div>
      </header>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "6px", margin: "16px 0", flexWrap: "wrap" }}>
        {["ALL", "OPEN", "ASSIGNED", "IN_PROGRESS", "VERIFIED", "RESOLVED", "REJECTED"].map((st) => (
          <button
            key={st}
            type="button"
            className={`btn ${filterStatus === st ? "btn-primary" : "btn-outline"}`}
            style={{ fontSize: "11px", padding: "4px 10px" }}
            onClick={() => setFilterStatus(st)}
          >
            {st} ({st === "ALL" ? recommendations.length : recommendations.filter((r) => r.status === st).length})
          </button>
        ))}
      </div>

      {/* Recommended Actions List (Top Priority First) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {filtered.length === 0 ? (
          <div className="card" style={{ padding: "30px", textAlign: "center" }}>
            <p className="muted small">No action recommendations found for status filter "{filterStatus}".</p>
          </div>
        ) : (
          filtered.map((rec) => (
            <RecommendedActionsCard
              key={rec.id}
              recommendation={rec}
              onUpdateStatus={handleUpdateStatus}
            />
          ))
        )}
      </div>
    </div>
  );
}
