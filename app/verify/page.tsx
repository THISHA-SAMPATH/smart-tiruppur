"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getUnitDpp, getUnits, getVerify } from "@/lib/api";
import type { DppResponse, LedgerUnit, VerifyResponse } from "@/lib/types";
import StaleBanner from "@/components/StaleBanner";

function BuyerView() {
  const searchParams = useSearchParams();
  const presetVerificationId = searchParams.get("verification_id");

  const [units, setUnits] = useState<LedgerUnit[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<LedgerUnit | null>(null);
  const [dpp, setDpp] = useState<DppResponse | null>(null);
  const [dppMeta, setDppMeta] = useState({ stale: false, fetchedAt: null as string | null, error: null as string | null });

  const [verifyId, setVerifyId] = useState(presetVerificationId ?? "");
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    getUnits().then((r) => r.data && setUnits(r.data));
  }, []);

  useEffect(() => {
    if (presetVerificationId) handleVerify(presetVerificationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetVerificationId]);

  async function selectUnit(unit: LedgerUnit) {
    setSelected(unit);
    setDpp(null);
    const r = await getUnitDpp(unit.unit_id);
    setDpp(r.data);
    setDppMeta({ stale: r.stale, fetchedAt: r.fetchedAt, error: r.error });
  }

  async function handleVerify(idOverride?: string) {
    const id = idOverride ?? verifyId;
    if (!id) return;
    setVerifyError(null);
    const r = await getVerify(id);
    if (r.data) setVerifyResult(r.data);
    else setVerifyError(r.error || "Verification ID not found.");
  }

  const filtered = units.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.unit_id.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <h2 style={{ fontSize: 24, marginBottom: 4 }}>Buyer / DPP verification</h2>
      <p className="muted small" style={{ marginBottom: 24 }}>
        Look up a unit&rsquo;s Digital Product Passport, or paste a verification ID from a QR code.
      </p>

      <section className="card" style={{ marginBottom: 24 }}>
        <p className="small muted" style={{ margin: "0 0 8px" }}>Verify by ID</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={verifyId}
            onChange={(e) => setVerifyId(e.target.value)}
            placeholder="e.g. vrf_a1b2c3"
            style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--hairline)", borderRadius: 4, background: "var(--paper)" }}
          />
          <button className="btn" onClick={() => handleVerify()}>Verify</button>
        </div>
        {verifyError && <p className="small" style={{ color: "var(--madder)", marginTop: 8 }}>{verifyError}</p>}
        {verifyResult && (
          <div style={{ marginTop: 12 }}>
            <p style={{ margin: 0 }}>
              {verifyResult.valid ? "✓ Valid" : "✗ Not valid"} — {verifyResult.unit_id}, issued{" "}
              {new Date(verifyResult.issue_date).toLocaleDateString()}
            </p>
            <p className="small muted" style={{ margin: "4px 0 0" }}>{verifyResult.compliance_status}</p>
          </div>
        )}
      </section>

      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ flex: "0 0 260px" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search units…"
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--hairline)", borderRadius: 4, background: "var(--paper)", marginBottom: 10 }}
          />
          <div className="grid" style={{ gap: 6 }}>
            {filtered.map((u) => (
              <button
                key={u.unit_id}
                onClick={() => selectUnit(u)}
                className="btn-ghost"
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: 4,
                  background: selected?.unit_id === u.unit_id ? "var(--indigo-soft)" : "transparent",
                }}
              >
                <span className="small">{u.name}</span>
                <br />
                <span className="mono small muted">{u.unit_id}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {dppMeta.stale && (
            <StaleBanner serviceName="Ledger service" fetchedAt={dppMeta.fetchedAt} error={dppMeta.error} />
          )}
          {!selected && <p className="muted small">Select a unit to view its passport.</p>}
          {selected && dpp && (
            <div className="card">
              <h3 style={{ fontSize: 18 }}>{selected.name}</h3>
              <p className="small muted" style={{ margin: "4px 0 14px" }}>{dpp.compliance_summary}</p>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 14 }}>
                <div>
                  <p className="small muted" style={{ margin: 0 }}>Reuse</p>
                  <p style={{ margin: "2px 0 0" }}>{dpp.reuse_and_energy.reuse_percentage}%</p>
                </div>
                <div>
                  <p className="small muted" style={{ margin: 0 }}>Renewable energy</p>
                  <p style={{ margin: "2px 0 0" }}>{dpp.reuse_and_energy.renewable_energy_percentage}%</p>
                </div>
              </div>
              <p className="small muted" style={{ margin: 0 }}>
                Environmental evidence: {dpp.recent_environmental_evidence.status}
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "center" }}>
                {dpp.qr_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={dpp.qr_url} alt="DPP QR code" width={90} height={90} />
                )}
                <span className="mono small muted">{dpp.verification_id}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<p className="muted small">Loading…</p>}>
      <BuyerView />
    </Suspense>
  );
}
