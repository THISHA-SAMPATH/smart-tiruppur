"use client";

import { useState, useEffect, useCallback } from "react";

export interface StatusAuditLog {
  status: string;
  updatedAt: string;
  updatedBy: string;
  notes?: string;
}

export interface CitizenReportItem {
  id: string;
  title: string;
  description: string;
  pollutionType: string;
  locationDescription: string;
  latitude: number | null;
  longitude: number | null;
  status: "SUBMITTED" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED";
  reporterId: string;
  reporterName?: string;
  reporterEmail?: string;
  createdAt: string;
  updatedAt: string;
  statusHistory?: StatusAuditLog[];
}

export default function RegulatorCitizenReportsSection() {
  const [reports, setReports] = useState<CitizenReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [regulatorNotes, setRegulatorNotes] = useState<Record<string, string>>({});

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/citizen-reports");
      if (!res.ok) {
        throw new Error(`Failed to fetch reports (${res.status})`);
      }
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const handleStatusChange = async (reportId: string, newStatus: string) => {
    try {
      setUpdatingId(reportId);
      setError(null);

      const notes = regulatorNotes[reportId] || "";

      const res = await fetch(`/api/citizen-reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, notes }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Status update failed");
      }

      // Clear note field for this report
      setRegulatorNotes((prev) => ({ ...prev, [reportId]: "" }));
      await loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update report status");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (filterStatus === "ALL") return true;
    return r.status === filterStatus;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return "badge-normal";
      case "UNDER_REVIEW":
        return "badge-investigate";
      case "RESOLVED":
        return "badge-ok";
      case "REJECTED":
        return "badge-abstain";
      default:
        return "badge-normal";
    }
  };

  const pendingCount = reports.filter((r) => r.status === "SUBMITTED" || r.status === "UNDER_REVIEW").length;

  return (
    <section className="workspace-section" style={{ marginTop: "36px" }}>
      <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <p className="eyebrow">REGULATORY OVERSIGHT / CITIZEN INCIDENTS</p>
          <h2>Citizen Environmental Reports</h2>
          <p className="muted small" style={{ margin: "2px 0 0" }}>
            Review, investigate, and disposition civic pollution complaints filed by Tiruppur residents.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="small muted">Filter:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: "4px 8px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--hairline)",
              background: "#fff",
              fontSize: "12px",
            }}
          >
            <option value="ALL">All Statuses ({reports.length})</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Summary Counter Card */}
      <div
        className="card"
        style={{
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--paper-raised)",
          borderLeft: "4px solid var(--turmeric)",
          padding: "14px 18px",
        }}
      >
        <div>
          <strong style={{ fontSize: "15px" }}>Active Civic Intake Queue</strong>
          <p className="small muted" style={{ margin: "2px 0 0" }}>
            {pendingCount} complaint(s) currently pending regulatory inspection or disposition.
          </p>
        </div>
        <span
          style={{
            fontSize: "24px",
            fontFamily: "Fraunces, serif",
            fontWeight: 600,
            color: pendingCount > 0 ? "var(--turmeric)" : "var(--teal)",
          }}
        >
          {pendingCount} Pending
        </span>
      </div>

      {error && (
        <div
          className="card"
          style={{
            marginBottom: "16px",
            borderLeft: "4px solid var(--madder)",
            background: "#fef2f2",
            padding: "12px 16px",
          }}
        >
          <strong style={{ color: "#991b1b" }}>Error Updating Report</strong>
          <p className="small" style={{ margin: "4px 0 0", color: "#7f1d1d" }}>
            {error}
          </p>
        </div>
      )}

      {loading ? (
        <p className="muted small">Loading citizen reports queue…</p>
      ) : filteredReports.length === 0 ? (
        <div className="card" style={{ padding: "24px" }}>
          <p className="muted small" style={{ margin: 0 }}>
            No citizen reports match the selected filter.
          </p>
        </div>
      ) : (
        <div className="grid" style={{ gap: "16px" }}>
          {filteredReports.map((report) => (
            <div key={report.id} className="card" style={{ position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                <div>
                  <span className="mono small" style={{ marginRight: "8px", fontWeight: 600 }}>
                    {report.id}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      background: "var(--indigo-soft)",
                      color: "var(--indigo)",
                      padding: "2px 6px",
                      borderRadius: "3px",
                      marginRight: "8px",
                    }}
                  >
                    {report.pollutionType}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--ink-soft)" }}>
                    by <strong>{report.reporterName || report.reporterId}</strong>
                  </span>
                </div>

                <span className={`badge ${getStatusBadgeClass(report.status)}`}>
                  <span className="badge-dot" /> {report.status.replace("_", " ")}
                </span>
              </div>

              <h3 style={{ fontSize: "18px", margin: "4px 0 6px" }}>{report.title}</h3>
              <p style={{ fontSize: "14.5px", margin: "0 0 12px", color: "var(--ink)" }}>{report.description}</p>

              <div
                style={{
                  background: "rgba(255, 255, 255, 0.6)",
                  border: "1px solid var(--hairline)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 12px",
                  marginBottom: "12px",
                  fontSize: "12.5px",
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px" }}>
                  <div>
                    <span className="muted">Location:</span> <strong>{report.locationDescription}</strong>
                  </div>
                  <div>
                    <span className="muted">Coordinates:</span>{" "}
                    {report.latitude !== null && report.longitude !== null ? (
                      <strong className="mono">{report.latitude.toFixed(5)}° N, {report.longitude.toFixed(5)}° E</strong>
                    ) : (
                      <em className="muted">None provided (Null)</em>
                    )}
                  </div>
                  <div>
                    <span className="muted">Filed At:</span> {new Date(report.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Status Update Control */}
              <div
                style={{
                  borderTop: "1px solid var(--hairline)",
                  paddingTop: "12px",
                  marginTop: "8px",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>
                    Update Regulatory Disposition:
                  </span>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      disabled={updatingId === report.id || report.status === "SUBMITTED"}
                      className={`btn ${report.status === "SUBMITTED" ? "btn-primary" : "btn-ghost"}`}
                      style={{ padding: "3px 8px", fontSize: "11px" }}
                      onClick={() => handleStatusChange(report.id, "SUBMITTED")}
                    >
                      SUBMITTED
                    </button>
                    <button
                      type="button"
                      disabled={updatingId === report.id || report.status === "UNDER_REVIEW"}
                      className={`btn ${report.status === "UNDER_REVIEW" ? "btn-primary" : "btn-ghost"}`}
                      style={{ padding: "3px 8px", fontSize: "11px" }}
                      onClick={() => handleStatusChange(report.id, "UNDER_REVIEW")}
                    >
                      UNDER_REVIEW
                    </button>
                    <button
                      type="button"
                      disabled={updatingId === report.id || report.status === "RESOLVED"}
                      className={`btn ${report.status === "RESOLVED" ? "btn-primary" : "btn-ghost"}`}
                      style={{ padding: "3px 8px", fontSize: "11px", borderColor: "#166534", color: report.status === "RESOLVED" ? "#fff" : "#166534" }}
                      onClick={() => handleStatusChange(report.id, "RESOLVED")}
                    >
                      RESOLVED
                    </button>
                    <button
                      type="button"
                      disabled={updatingId === report.id || report.status === "REJECTED"}
                      className={`btn ${report.status === "REJECTED" ? "btn-primary" : "btn-ghost"}`}
                      style={{ padding: "3px 8px", fontSize: "11px", borderColor: "#991b1b", color: report.status === "REJECTED" ? "#fff" : "#991b1b" }}
                      onClick={() => handleStatusChange(report.id, "REJECTED")}
                    >
                      REJECTED
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  <input
                    type="text"
                    placeholder="Optional regulator notes / field inspection remarks..."
                    value={regulatorNotes[report.id] || ""}
                    onChange={(e) => setRegulatorNotes({ ...regulatorNotes, [report.id]: e.target.value })}
                    style={{
                      flex: 1,
                      padding: "4px 8px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--hairline)",
                      fontSize: "12px",
                      background: "#fff",
                    }}
                  />
                </div>

                {/* Audit Trail Log */}
                {report.statusHistory && report.statusHistory.length > 0 && (
                  <div style={{ marginTop: "10px", background: "#f8fafc", padding: "8px 10px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                      Regulatory Audit Trail ({report.statusHistory.length} entry/entries)
                    </span>
                    <ul style={{ margin: "4px 0 0", paddingLeft: "16px", fontSize: "11px", color: "#334155" }}>
                      {report.statusHistory.map((log, idx) => (
                        <li key={idx} style={{ marginBottom: "2px" }}>
                          <strong>{log.status}</strong> — {new Date(log.updatedAt).toLocaleString()} by {log.updatedBy}
                          {log.notes && <em> ({log.notes})</em>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="small muted" style={{ marginTop: "14px", fontStyle: "italic", fontSize: "11.5px" }}>
        ℹ Regulatory Protocol: Citizen reports provide community observations for field inspection priorities. They do not automatically assign industrial attribution or constitute verified legal evidence without formal TNPCB sampling.
      </p>
    </section>
  );
}
