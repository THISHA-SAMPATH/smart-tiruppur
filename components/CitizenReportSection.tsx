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
  createdAt: string;
  updatedAt: string;
  statusHistory?: StatusAuditLog[];
}

export default function CitizenReportSection() {
  const [reports, setReports] = useState<CitizenReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [pollutionType, setPollutionType] = useState("Water Pollution");
  const [locationDescription, setLocationDescription] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/citizen-reports");
      if (!res.ok) {
        throw new Error(`Failed to load reports (${res.status})`);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !locationDescription.trim()) {
      setError("Please fill in all required fields (title, location, and description).");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSubmitSuccess(false);

      const payload = {
        title,
        pollutionType,
        locationDescription,
        description,
        latitude: latitude.trim() !== "" ? parseFloat(latitude) : null,
        longitude: longitude.trim() !== "" ? parseFloat(longitude) : null,
      };

      const res = await fetch("/api/citizen-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Submission failed");
      }

      // Reset form
      setTitle("");
      setLocationDescription("");
      setDescription("");
      setLatitude("");
      setLongitude("");
      setSubmitSuccess(true);
      setShowForm(false);
      await loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

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

  return (
    <section className="workspace-section" style={{ marginTop: "32px" }}>
      <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p className="eyebrow">CIVIC ENGAGEMENT / COMPLAINT LOOP</p>
          <h2>Reported Environmental Issues</h2>
          <p className="muted small" style={{ margin: "2px 0 0" }}>
            Submit non-binding citizen observations for review by regional environmental regulators.
          </p>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setShowForm(!showForm);
            setSubmitSuccess(false);
            setError(null);
          }}
          style={{ padding: "8px 16px" }}
        >
          {showForm ? "✕ Cancel Form" : "+ Report Environmental Issue"}
        </button>
      </div>

      {submitSuccess && (
        <div
          className="card"
          style={{
            marginBottom: "16px",
            borderLeft: "4px solid var(--teal)",
            background: "#f0fdf4",
            padding: "12px 16px",
          }}
        >
          <strong style={{ color: "#166534" }}>✓ Report Successfully Submitted!</strong>
          <p className="small muted" style={{ margin: "4px 0 0" }}>
            Your environmental observation has been registered and logged for regulatory review.
          </p>
        </div>
      )}

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
          <strong style={{ color: "#991b1b" }}>⚠ Action Required</strong>
          <p className="small" style={{ margin: "4px 0 0", color: "#7f1d1d" }}>
            {error}
          </p>
        </div>
      )}

      {/* Submission Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="card"
          style={{
            marginBottom: "24px",
            border: "1.5px solid var(--indigo)",
            background: "var(--paper-raised)",
            padding: "20px",
          }}
        >
          <h3 style={{ fontSize: "18px", marginBottom: "4px", color: "var(--indigo)" }}>
            New Environmental Incident Report
          </h3>
          <p className="small muted" style={{ margin: "0 0 16px" }}>
            Note: Citizen reports are observational records. They are not automatic evidence of industrial violations.
          </p>

          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px", marginBottom: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                Report Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Chemical odor near river embankment"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--hairline)",
                  background: "#fff",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                Pollution Type *
              </label>
              <select
                value={pollutionType}
                onChange={(e) => setPollutionType(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--hairline)",
                  background: "#fff",
                  fontFamily: "inherit",
                }}
              >
                <option value="Water Pollution">Water Pollution</option>
                <option value="Air Pollution">Air Pollution</option>
                <option value="Solid Waste">Solid Waste</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
              Location Description *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Kasipalayam Bridge downstream embankment, Tiruppur North"
              value={locationDescription}
              onChange={(e) => setLocationDescription(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--hairline)",
                background: "#fff",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
              Detailed Description *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Describe the observed situation, time of day, visual appearance, foam, or odor..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--hairline)",
                background: "#fff",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Optional Coordinates */}
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "18px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                Latitude (Optional)
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 11.11975 (Leave blank if unknown)"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--hairline)",
                  background: "#fff",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                Longitude (Optional)
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 77.39716 (Leave blank if unknown)"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--hairline)",
                  background: "#fff",
                  fontFamily: "inherit",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? "Submitting Report…" : "Submit Incident Report"}
            </button>
          </div>
        </form>
      )}

      {/* Reports List */}
      {loading ? (
        <p className="muted small">Loading submitted citizen reports…</p>
      ) : reports.length === 0 ? (
        <div className="card" style={{ padding: "24px" }}>
          <p className="muted small" style={{ margin: 0 }}>
            You have not submitted any environmental reports yet. Click "+ Report Environmental Issue" to file a complaint.
          </p>
        </div>
      ) : (
        <div className="grid" style={{ gap: "14px" }}>
          {reports.map((report) => (
            <div key={report.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                <div>
                  <span className="mono small" style={{ marginRight: "10px", color: "var(--ink-soft)" }}>
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
                </div>
                <span className={`badge ${getStatusBadgeClass(report.status)}`}>
                  <span className="badge-dot" /> {report.status.replace("_", " ")}
                </span>
              </div>

              <h4 style={{ fontSize: "16.5px", margin: "4px 0 6px" }}>{report.title}</h4>
              <p style={{ fontSize: "14px", margin: "0 0 10px", color: "var(--ink)" }}>{report.description}</p>

              <div style={{ borderTop: "1px dashed var(--hairline)", paddingTop: "8px", marginTop: "8px" }} className="small muted">
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "8px" }}>
                  <span>📍 Location: <strong>{report.locationDescription}</strong></span>
                  <span>
                    🌐 Coordinates:{" "}
                    {report.latitude !== null && report.longitude !== null ? (
                      <strong className="mono">{report.latitude.toFixed(5)}° N, {report.longitude.toFixed(5)}° E</strong>
                    ) : (
                      <em>Not specified</em>
                    )}
                  </span>
                  <span>🕒 Submitted: {new Date(report.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="small muted" style={{ marginTop: "14px", fontStyle: "italic", fontSize: "11.5px" }}>
        ℹ Data Integrity Notice: Citizen reports are citizen-filed observational records. They are not assigned to industrial units nor treated as verified environmental evidence without regulatory inspection.
      </p>
    </section>
  );
}
