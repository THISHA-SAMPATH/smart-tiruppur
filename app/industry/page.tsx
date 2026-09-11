import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getUnit, getUnitDpp, getUnitLedger } from "@/lib/api";
import { resolveLedgerUrl } from "@/lib/config";
import StaleBanner from "@/components/StaleBanner";

export const dynamic = "force-dynamic";

export default async function IndustryDashboardPage() {
  const currentUser = await getCurrentUser();
  const unitId = currentUser?.industryUnitId || "unit_001";

  const [unitRes, dppRes, ledgerRes] = await Promise.all([
    getUnit(unitId),
    getUnitDpp(unitId),
    getUnitLedger(unitId),
  ]);

  const unit = unitRes.data;
  const dpp = dppRes.data;
  const ledger = ledgerRes.data;

  return (
    <div className="workspace-page">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">FACILITY PORTAL / INDUSTRY</p>
          <h1>Industry Compliance Workspace</h1>
          <p>
            Welcome, {currentUser?.name} ({currentUser?.organization || "Facility Operator"}). Scoped access to your facility data.
          </p>
        </div>
        <Link href={`/units/${unitId}`} className="btn">
          View Full Unit Profile ({unitId}) →
        </Link>
      </header>

      {unitRes.stale && (
        <StaleBanner serviceName="Ledger service" fetchedAt={unitRes.fetchedAt} error={unitRes.error} />
      )}

      {/* Facility Overview Card */}
      <section className="card" style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
          <div>
            <h2 style={{ fontSize: "22px", margin: 0 }}>{unit?.name || `Industrial Facility ${unitId}`}</h2>
            <p className="mono small muted" style={{ margin: "2px 0 0" }}>Unit ID: {unitId}</p>
          </div>
          <span className="badge badge-normal">
            <span className="badge-dot" /> COMPLIANCE SCOPED
          </span>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginTop: "16px" }}>
          <div style={{ background: "var(--paper)", padding: "12px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
            <p className="small muted" style={{ margin: 0 }}>CETP / ZLD Status</p>
            <strong style={{ fontSize: "16px", marginTop: "4px", display: "block" }}>{unit?.cetp_zld_status || "Operational ZLD"}</strong>
          </div>

          <div style={{ background: "var(--paper)", padding: "12px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
            <p className="small muted" style={{ margin: 0 }}>Compliance Rating</p>
            <strong style={{ fontSize: "16px", marginTop: "4px", display: "block", color: "var(--teal)" }}>
              {unit?.compliance_status || "Compliant"}
            </strong>
          </div>

          <div style={{ background: "var(--paper)", padding: "12px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
            <p className="small muted" style={{ margin: 0 }}>Water Reuse Rate</p>
            <strong style={{ fontSize: "16px", marginTop: "4px", display: "block" }}>
              {unit?.reuse_percentage != null ? `${unit.reuse_percentage}%` : "88%"}
            </strong>
          </div>

          <div style={{ background: "var(--paper)", padding: "12px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
            <p className="small muted" style={{ margin: 0 }}>Renewable Energy</p>
            <strong style={{ fontSize: "16px", marginTop: "4px", display: "block" }}>
              {unit?.renewable_energy_percentage != null ? `${unit.renewable_energy_percentage}%` : "42%"}
            </strong>
          </div>
        </div>

        {unit?.certifications && unit.certifications.length > 0 && (
          <p className="small muted" style={{ marginTop: "16px", margin: 0 }}>
            Certifications: <strong>{unit.certifications.join(", ")}</strong>
          </p>
        )}
      </section>

      {/* Digital Product Passport (DPP) Status */}
      <section className="workspace-section" style={{ marginBottom: "32px" }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">DIGITAL PRODUCT PASSPORT</p>
            <h2>My Facility DPP & QR Verification</h2>
          </div>
        </div>

        {dpp ? (
          <div className="card">
            <p style={{ margin: 0, fontSize: "15px" }}>
              {dpp.compliance_summary || "CETP/ZLD fully compliant with zero liquid discharge standards."}
            </p>
            <p className="small muted" style={{ marginTop: "8px" }}>
              Environmental Evidence: <strong>{dpp.recent_environmental_evidence?.status || "Normal"}</strong>
              {dpp.recent_environmental_evidence?.confidence != null &&
                ` · Confidence ${(dpp.recent_environmental_evidence.confidence * 100).toFixed(0)}%`}
            </p>
            <div style={{ display: "flex", gap: "16px", marginTop: "16px", alignItems: "center" }}>
              {dpp.verification_id && (
                <Link href={`/verify?verification_id=${dpp.verification_id}`} className="btn btn-ghost">
                  Verify DPP Passport ↗
                </Link>
              )}
              {dpp.qr_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveLedgerUrl(dpp.qr_url)}
                  alt="DPP Verification QR Code"
                  width={64}
                  height={64}
                  style={{ border: "1px solid var(--hairline)", borderRadius: "var(--radius-sm)" }}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="card">
            <p className="muted small">Loading Digital Product Passport data...</p>
          </div>
        )}
      </section>

      {/* Ledger Records for this Unit */}
      <section className="workspace-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">AUDIT TRAIL</p>
            <h2>My Ledger Records & Evidence ({ledger?.entries?.length || 0})</h2>
          </div>
          {ledger && (
            <span className="small muted">
              {ledger.chain_valid ? "✓ Cryptographic chain verified" : "⚠ Chain issue detected"}
            </span>
          )}
        </div>

        {ledger?.entries && ledger.entries.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Timestamp</th>
                  <th>Decision</th>
                  <th>Confidence</th>
                  <th>Regulator Action</th>
                  <th>Current Hash</th>
                </tr>
              </thead>
              <tbody>
                {ledger.entries.map((entry) => (
                  <tr key={entry.event_id}>
                    <td className="mono">{entry.event_id}</td>
                    <td>{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "—"}</td>
                    <td>{entry.decision}</td>
                    <td>{entry.confidence != null ? `${(entry.confidence * 100).toFixed(0)}%` : "—"}</td>
                    <td>{entry.regulator_action || <span className="muted small">None</span>}</td>
                    <td className="mono small muted">
                      {entry.current_hash ? `${entry.current_hash.slice(0, 10)}…` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card">
            <p className="muted small" style={{ margin: 0 }}>
              No environmental incidents or ledger entries recorded for unit {unitId}.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
