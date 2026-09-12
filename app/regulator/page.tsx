import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getGlobalEvents, getUnits, getGroundwaterZones } from "@/lib/api";
import RegulatorCitizenReportsSection from "@/components/RegulatorCitizenReportsSection";
import CetpCapacitySimulator from "@/components/CetpCapacitySimulator";
import TnpcbReportButton from "@/components/TnpcbReportButton";

export const dynamic = "force-dynamic";

export default async function RegulatorDashboardPage() {
  const currentUser = await getCurrentUser();

  const [eventsRes, unitsRes, zonesRes] = await Promise.all([
    getGlobalEvents(),
    getUnits(),
    getGroundwaterZones(),
  ]);

  const events = eventsRes.data || [];
  const flaggedEvents = events.filter((e) => e.status === "flagged" || e.decision === "investigate");
  const pendingActions = events.filter((e) => !e.regulator_action);
  const unitsCount = unitsRes.data?.length ?? 12;
  const zonesCount = zonesRes.data?.length ?? 5;

  return (
    <div className="workspace-page">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">REGULATORY OPERATIONS / OVERVIEW</p>
          <h1>Regulator Operations Centre</h1>
          <p>
            Welcome, {currentUser?.name}. Real-time industrial discharge telemetry, attribution inference, evidence chain of custody, and groundwater risk oversight.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <TnpcbReportButton />
          <Link href="/monitoring" className="btn-ghost" style={{ border: "1px solid var(--hairline)" }}>
            Open Live Discharge Operations →
          </Link>
        </div>
      </header>

      {/* Metric Cards */}
      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <div className="card">
          <p className="small muted" style={{ margin: 0 }}>Flagged Discharge Incidents</p>
          <strong style={{ fontSize: "28px", fontFamily: "Fraunces, serif", color: flaggedEvents.length > 0 ? "var(--madder)" : "var(--ink)" }}>
            {flaggedEvents.length}
          </strong>
          <p className="small muted" style={{ margin: "4px 0 0" }}>Requiring investigation review</p>
        </div>

        <div className="card">
          <p className="small muted" style={{ margin: 0 }}>Pending Regulator Actions</p>
          <strong style={{ fontSize: "28px", fontFamily: "Fraunces, serif", color: "var(--turmeric)" }}>
            {pendingActions.length}
          </strong>
          <p className="small muted" style={{ margin: "4px 0 0" }}>Unassigned ledger events</p>
        </div>

        <div className="card">
          <p className="small muted" style={{ margin: 0 }}>Active Industrial Units</p>
          <strong style={{ fontSize: "28px", fontFamily: "Fraunces, serif" }}>{unitsCount}</strong>
          <p className="small muted" style={{ margin: "4px 0 0" }}>Tiruppur CETP/ZLD facilities</p>
        </div>

        <div className="card">
          <p className="small muted" style={{ margin: 0 }}>Monitored FIRKA Zones</p>
          <strong style={{ fontSize: "28px", fontFamily: "Fraunces, serif" }}>{zonesCount}</strong>
          <p className="small muted" style={{ margin: "4px 0 0" }}>Groundwater assessment areas</p>
        </div>
      </section>

      {/* CETP Hydraulic Capacity & Peak Strain Simulator */}
      <CetpCapacitySimulator />

      {/* Flagged Incidents Overview */}
      <section className="workspace-section" style={{ marginBottom: "32px" }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">RECENT INCIDENT ALERTS</p>
            <h2>Attribution & Evidence Trail</h2>
          </div>
          <Link href="/evidence" className="text-link">View Full Evidence Ledger →</Link>
        </div>

        {flaggedEvents.length === 0 ? (
          <div className="card" style={{ padding: "24px" }}>
            <p className="muted small" style={{ margin: 0 }}>No active flagged discharge incidents detected in the current ledger window.</p>
          </div>
        ) : (
          <div className="grid" style={{ gap: "12px" }}>
            {flaggedEvents.slice(0, 3).map((event) => (
              <div key={event.event_id} className="card" style={{ borderLeft: "4px solid var(--madder)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                  <span className="mono small">Event: {event.event_id}</span>
                  <span className="badge badge-investigate">
                    <span className="badge-dot" /> {event.decision.toUpperCase()}
                  </span>
                </div>
                <p style={{ margin: "4px 0 8px", fontSize: "14.5px" }}>{event.explanation}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }} className="small muted">
                  <span>Source Candidate: <strong>{event.most_likely_source || "Uncertain"}</strong> ({((event.source_probability || 0) * 100).toFixed(0)}% prob)</span>
                  <span>Action: {event.regulator_action || "Pending Regulatory Action"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Module Workspaces */}
      <section className="workspace-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">REGULATORY WORKSPACES</p>
            <h2>Core Operations</h2>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          <Link href="/monitoring" className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="card-index">[ WORKSPACE 01 ]</span>
            <h3 style={{ fontSize: "20px", margin: "6px 0" }}>Discharge Intelligence</h3>
            <p className="small muted">Trace abnormal water-quality signals, view sensor health, and trigger simulated discharge events.</p>
            <span className="module-link" style={{ marginTop: "12px", display: "inline-block" }}>Launch monitoring →</span>
          </Link>

          <Link href="/evidence" className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="card-index">[ WORKSPACE 02 ]</span>
            <h3 style={{ fontSize: "20px", margin: "6px 0" }}>Evidence Ledger & Actions</h3>
            <p className="small muted">Record legally binding regulator decisions and view cryptographic hashes of historical events.</p>
            <span className="module-link" style={{ marginTop: "12px", display: "inline-block" }}>Review evidence →</span>
          </Link>

          <Link href="/groundwater" className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="card-index">[ WORKSPACE 03 ]</span>
            <h3 style={{ fontSize: "20px", margin: "6px 0" }}>Groundwater Outlook</h3>
            <p className="small muted">Review CGWB baseline figures and evaluate extraction scenario simulations for each Tiruppur FIRKA.</p>
            <span className="module-link" style={{ marginTop: "12px", display: "inline-block" }}>Evaluate FIRKAs →</span>
          </Link>
        </div>
      </section>

      {/* Citizen Environmental Incident Review Queue */}
      <RegulatorCitizenReportsSection />
    </div>
  );
}
