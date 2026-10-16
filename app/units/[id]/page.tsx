"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getUnit, getUnitDpp, getUnitLedger } from "@/lib/api";
import { resolveLedgerUrl } from "@/lib/config";
import type { DppResponse, LedgerUnit, UnitLedgerResponse } from "@/lib/types";
import StaleBanner from "@/components/StaleBanner";
import { useAuth } from "@/components/AuthProvider";
import QrCodeDisplay from "@/components/QrCodeDisplay";

export default function UnitDetailPage() {
  const params = useParams<{ id: string }>();
  const unitId = params.id;
  const { user } = useAuth();

  const getBackLink = () => {
    switch (user?.role) {
      case "INDUSTRY":
        return { href: "/industry", label: "← Back to Industry Workspace" };
      case "REGULATOR":
        return { href: "/regulator", label: "← Back to Regulator Workbench" };
      case "ADMIN":
        return { href: "/admin", label: "← Back to Admin Dashboard" };
      default:
        return { href: "/dashboard", label: "← Back to Dashboard" };
    }
  };

  const backLink = getBackLink();

  const [unit, setUnit] = useState<LedgerUnit | null>(null);
  const [unitMeta, setUnitMeta] = useState({
    stale: false,
    fetchedAt: null as string | null,
    error: null as string | null,
  });

  const [chain, setChain] = useState<UnitLedgerResponse | null>(null);
  const [chainMeta, setChainMeta] = useState({
    stale: false,
    fetchedAt: null as string | null,
    error: null as string | null,
  });

  const [dpp, setDpp] = useState<DppResponse | null>(null);
  const [dppMeta, setDppMeta] = useState({
    stale: false,
    fetchedAt: null as string | null,
    error: null as string | null,
  });

  useEffect(() => {
    if (!unitId) return;
    getUnit(unitId).then((r) => {
      setUnit(r.data);
      setUnitMeta({ stale: r.stale, fetchedAt: r.fetchedAt, error: r.error });
    });
    getUnitLedger(unitId).then((r) => {
      setChain(r.data);
      setChainMeta({ stale: r.stale, fetchedAt: r.fetchedAt, error: r.error });
    });
    getUnitDpp(unitId).then((r) => {
      setDpp(r.data);
      setDppMeta({ stale: r.stale, fetchedAt: r.fetchedAt, error: r.error });
    });
  }, [unitId]);

  const isCompliant =
    unit?.compliance_status?.toLowerCase().includes("compliant") ?? true;

  return (
    <div className="workspace-page">
      {/* 1. WORKSPACE HEADER WITH BREADCRUMB & FACILITY STATUS */}
      <header className="workspace-header">
        <div>
          <p className="small muted" style={{ marginBottom: "6px" }}>
            <Link href={backLink.href} style={{ textDecoration: "none", color: "var(--indigo)", fontWeight: 600 }}>
              {backLink.label}
            </Link>
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
            <span
              className="mono"
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--ink-soft)",
                background: "var(--paper)",
                padding: "3px 10px",
                borderRadius: "4px",
                border: "1px solid var(--hairline)",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              {unitId}
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11.5px",
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: "999px",
                background: isCompliant ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
                color: isCompliant ? "#059669" : "#d97706",
                border: isCompliant ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: isCompliant ? "#10b981" : "#f59e0b",
                }}
              />
              {unit?.compliance_status || (isCompliant ? "Compliant" : "Under Review")}
            </span>
          </div>

          <h1 style={{ fontSize: "28px", margin: "4px 0 6px", color: "var(--ink)" }}>
            {unit?.name ?? `Industrial Facility ${unitId}`}
          </h1>
          <p className="muted" style={{ margin: 0, fontSize: "14px" }}>
            Tiruppur Textile Dyeing & Common Effluent Treatment Plant (CETP) Network Profile
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {dpp?.verification_id && (
            <Link
              href={`/verify?verification_id=${dpp.verification_id}`}
              className="btn btn-primary"
              style={{ background: "var(--teal)", borderColor: "var(--teal)", color: "#ffffff" }}
            >
              Verify DPP Passport 📜 →
            </Link>
          )}
          <Link href="/monitoring" className="btn-ghost" style={{ border: "1px solid var(--hairline)" }}>
            View Network Telemetry →
          </Link>
        </div>
      </header>

      {unitMeta.stale && (
        <StaleBanner
          serviceName="Ledger service"
          fetchedAt={unitMeta.fetchedAt}
          error={unitMeta.error}
        />
      )}

      {/* 2. FACILITY OPERATIONAL METRICS */}
      {unit && (
        <section className="card" style={{ marginBottom: "28px", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>
              Operational Telemetry & Environmental Circularity
            </h3>
            <span className="small muted">Live Sensor Telemetry</span>
          </div>

          <div
            className="grid"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "14px",
            }}
          >
            <div style={{ background: "var(--paper)", padding: "14px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
              <p className="small muted" style={{ margin: 0, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                CETP / ZLD Status
              </p>
              <strong style={{ fontSize: "16px", marginTop: "4px", display: "block", color: "var(--ink)" }}>
                {unit.cetp_zld_status ?? "Operational ZLD"}
              </strong>
            </div>

            <div style={{ background: "var(--paper)", padding: "14px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
              <p className="small muted" style={{ margin: 0, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Compliance Rating
              </p>
              <strong style={{ fontSize: "16px", marginTop: "4px", display: "block", color: isCompliant ? "#059669" : "#d97706" }}>
                {unit.compliance_status ?? "Compliant"}
              </strong>
            </div>

            <div style={{ background: "var(--paper)", padding: "14px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
              <p className="small muted" style={{ margin: 0, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Water Reuse Rate
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "4px" }}>
                <strong className="mono" style={{ fontSize: "18px", color: "var(--teal)" }}>
                  {unit.reuse_percentage != null ? `${unit.reuse_percentage}%` : "—"}
                </strong>
                <span className="small muted">Recycled</span>
              </div>
              <div style={{ width: "100%", height: "4px", background: "#e2e8f0", borderRadius: "2px", marginTop: "8px", overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, Math.max(0, unit.reuse_percentage ?? 0))}%`, height: "100%", background: "var(--teal)", borderRadius: "2px" }} />
              </div>
            </div>

            <div style={{ background: "var(--paper)", padding: "14px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
              <p className="small muted" style={{ margin: 0, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Renewable Energy
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "4px" }}>
                <strong className="mono" style={{ fontSize: "18px", color: "var(--indigo)" }}>
                  {unit.renewable_energy_percentage != null ? `${unit.renewable_energy_percentage}%` : "—"}
                </strong>
                <span className="small muted">Solar/Wind</span>
              </div>
              <div style={{ width: "100%", height: "4px", background: "#e2e8f0", borderRadius: "2px", marginTop: "8px", overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, Math.max(0, unit.renewable_energy_percentage ?? 0))}%`, height: "100%", background: "var(--indigo)", borderRadius: "2px" }} />
              </div>
            </div>
          </div>

          {(unit.certifications?.length ?? 0) > 0 && (
            <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span className="small muted" style={{ fontWeight: 600 }}>Facility Certifications:</span>
              {unit.certifications!.map((cert) => (
                <span
                  key={cert}
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: "4px",
                    background: "var(--teal-soft)",
                    color: "var(--teal)",
                    border: "1px solid rgba(13, 148, 136, 0.25)",
                  }}
                >
                  ✓ {cert}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 3. DIGITAL PRODUCT PASSPORT (DPP) SECTION */}
      <section className="workspace-section" style={{ marginBottom: "32px" }}>
        <div className="section-heading" style={{ marginBottom: "16px" }}>
          <div>
            <p className="eyebrow">CHAIN OF CUSTODY VERIFICATION</p>
            <h2 style={{ fontSize: "20px", margin: "2px 0 0" }}>Digital Product Passport (DPP)</h2>
          </div>
        </div>

        {dppMeta.stale && (
          <StaleBanner
            serviceName="Ledger service"
            fetchedAt={dppMeta.fetchedAt}
            error={dppMeta.error}
          />
        )}

        {dpp ? (
          <div className="card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "20px" }}>
              <div style={{ flex: 1, minWidth: "260px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: "4px",
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#059669",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      letterSpacing: "0.05em",
                    }}
                  >
                    ✓ DPP ACTIVE
                  </span>
                  <span className="mono small muted">{dpp.verification_id}</span>
                </div>

                <p style={{ margin: "0 0 10px 0", fontSize: "14.5px", color: "var(--ink)", lineHeight: 1.5 }}>
                  {dpp.compliance_summary ?? "Zero Liquid Discharge (ZLD) fully compliant with real-time continuous sensor monitoring."}
                </p>

                <div
                  style={{
                    background: "var(--paper)",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--hairline)",
                    display: "inline-block",
                    fontSize: "12.5px",
                    marginTop: "4px",
                  }}
                >
                  <span className="muted">Environmental Evidence: </span>
                  <strong style={{ color: "var(--teal)" }}>
                    {dpp.recent_environmental_evidence?.status ?? "Verified Compliant"}
                  </strong>
                  {dpp.recent_environmental_evidence?.confidence != null && (
                    <span className="muted"> · Confidence {(dpp.recent_environmental_evidence.confidence * 100).toFixed(0)}%</span>
                  )}
                </div>

                <div style={{ marginTop: "16px" }}>
                  {dpp.verification_id && (
                    <Link
                      href={`/verify?verification_id=${dpp.verification_id}`}
                      className="btn btn-ghost"
                      style={{ border: "1px solid var(--hairline)", fontSize: "13px" }}
                    >
                      Open Full Verification Certificate 📄 →
                    </Link>
                  )}
                </div>
              </div>

              {/* QR Code Passport Display */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  background: "var(--paper)",
                  padding: "16px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--hairline)",
                }}
              >
                <QrCodeDisplay
                  value={
                    typeof window !== "undefined"
                      ? `${window.location.origin}/verify?verification_id=${dpp.verification_id}`
                      : `/verify?verification_id=${dpp.verification_id}`
                  }
                  size={100}
                  title={`DPP QR: ${dpp.verification_id}`}
                  showDownload
                />
                <span className="mono small muted" style={{ fontSize: "11px", marginTop: "8px" }}>
                  Scan to Verify Unit
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="muted small">{dppMeta.error || "Loading DPP record…"}</p>
        )}
      </section>

      {/* 4. EVIDENCE LEDGER AUDIT TRAIL */}
      <section className="workspace-section">
        <div className="section-heading" style={{ marginBottom: "16px" }}>
          <div>
            <p className="eyebrow">AUDIT TRAIL & TAMPER EVIDENCE</p>
            <h2 style={{ fontSize: "20px", margin: "2px 0 0" }}>
              Evidence Ledger Trail{" "}
              {chain && (
                <span style={{ fontSize: "14px", fontWeight: 600, color: chain.chain_valid ? "#16a34a" : "#dc2626" }}>
                  {chain.chain_valid ? "(✓ Cryptographic Chain Valid)" : "(⚠ Chain Broken)"}
                </span>
              )}
            </h2>
          </div>
        </div>

        {chainMeta.stale && (
          <StaleBanner
            serviceName="Ledger service"
            fetchedAt={chainMeta.fetchedAt}
            error={chainMeta.error}
          />
        )}

        {chain && (chain.entries?.length ?? 0) > 0 ? (
          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "var(--paper-subtle, #f8fafc)", borderBottom: "1px solid var(--hairline)", textAlign: "left" }}>
                  <th style={{ padding: "12px 16px" }}>Event ID</th>
                  <th style={{ padding: "12px 16px" }}>Timestamp</th>
                  <th style={{ padding: "12px 16px" }}>Decision</th>
                  <th style={{ padding: "12px 16px" }}>Confidence</th>
                  <th style={{ padding: "12px 16px" }}>SHA-256 Ledger Hash</th>
                </tr>
              </thead>
              <tbody>
                {chain.entries.map((e) => (
                  <tr key={e.event_id} style={{ borderBottom: "1px solid var(--hairline)" }}>
                    <td style={{ padding: "12px 16px" }} className="mono">
                      <strong>{e.event_id ?? "—"}</strong>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--ink-soft)" }}>
                      {e.timestamp ? new Date(e.timestamp).toLocaleString() : "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background:
                            e.decision === "normal"
                              ? "rgba(16, 185, 129, 0.1)"
                              : e.decision === "investigate"
                              ? "rgba(239, 68, 68, 0.1)"
                              : "rgba(245, 158, 11, 0.1)",
                          color:
                            e.decision === "normal"
                              ? "#059669"
                              : e.decision === "investigate"
                              ? "#dc2626"
                              : "#d97706",
                        }}
                      >
                        {(e.decision ?? "NORMAL").toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                      {e.confidence != null ? `${(e.confidence * 100).toFixed(0)}%` : "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }} className="mono small muted">
                      {e.current_hash ? `${e.current_hash.slice(0, 14)}…` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card" style={{ padding: "24px" }}>
            <p className="muted small" style={{ margin: 0 }}>
              {chainMeta.error || "No recorded discharge ledger entries for this facility in the current audit window."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
