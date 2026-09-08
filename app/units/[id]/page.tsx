"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getUnit, getUnitDpp, getUnitLedger } from "@/lib/api";
import type { DppResponse, LedgerUnit, UnitLedgerResponse } from "@/lib/types";
import StaleBanner from "@/components/StaleBanner";

export default function UnitDetailPage() {
  const params = useParams<{ id: string }>();
  const unitId = params.id;

  const [unit, setUnit] = useState<LedgerUnit | null>(null);
  const [unitMeta, setUnitMeta] = useState({ stale: false, fetchedAt: null as string | null, error: null as string | null });

  const [chain, setChain] = useState<UnitLedgerResponse | null>(null);
  const [chainMeta, setChainMeta] = useState({ stale: false, fetchedAt: null as string | null, error: null as string | null });

  const [dpp, setDpp] = useState<DppResponse | null>(null);
  const [dppMeta, setDppMeta] = useState({ stale: false, fetchedAt: null as string | null, error: null as string | null });

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

  // Ledger responses always include a genesis block. Only blocks with an
  // event id represent evidence, and the array guard keeps a bad response
  // from taking down the page.
  const ledgerEntries = Array.isArray(chain?.chain)
    ? chain.chain.filter((block) => block.event_id)
    : [];

  return (
    <div>
      <p className="small muted" style={{ marginBottom: 4 }}>
        <Link href="/">← Regulator dashboard</Link>
      </p>
      <h2 style={{ fontSize: 24, marginBottom: 4 }}>{unit?.name ?? unitId}</h2>
      <p className="mono small muted" style={{ marginBottom: 20 }}>{unitId}</p>

      {unitMeta.stale && (
        <StaleBanner serviceName="Ledger service" fetchedAt={unitMeta.fetchedAt} error={unitMeta.error} />
      )}

      {unit && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <div>
              <p className="small muted" style={{ margin: 0 }}>CETP / ZLD status</p>
              <p style={{ margin: "2px 0 0" }}>{unit.cetp_zld_status}</p>
            </div>
            <div>
              <p className="small muted" style={{ margin: 0 }}>Compliance status</p>
              <p style={{ margin: "2px 0 0" }}>{unit.compliance_status}</p>
            </div>
            <div>
              <p className="small muted" style={{ margin: 0 }}>Reuse</p>
              <p style={{ margin: "2px 0 0" }}>{unit.reuse_percentage}%</p>
            </div>
            <div>
              <p className="small muted" style={{ margin: 0 }}>Renewable energy</p>
              <p style={{ margin: "2px 0 0" }}>{unit.renewable_energy_percentage}%</p>
            </div>
          </div>
          {unit.certifications?.length > 0 && (
            <p className="small muted" style={{ marginTop: 12 }}>
              Certifications: {unit.certifications.join(", ")}
            </p>
          )}
        </div>
      )}

      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 16, marginBottom: 10 }}>Digital Product Passport</h3>
        {dppMeta.stale && (
          <StaleBanner serviceName="Ledger service" fetchedAt={dppMeta.fetchedAt} error={dppMeta.error} />
        )}
        {dpp ? (
          <div className="card">
            <p style={{ margin: 0 }}>{dpp.compliance_summary}</p>
            <p className="small muted" style={{ margin: "8px 0 0" }}>
              Environmental evidence: {dpp.recent_environmental_evidence.status}
              {dpp.recent_environmental_evidence.confidence != null &&
                ` · confidence ${(dpp.recent_environmental_evidence.confidence * 100).toFixed(0)}%`}
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 14, alignItems: "center" }}>
              <Link href={`/verify?verification_id=${dpp.verification_id}`} className="btn btn-ghost">
                Open verification page
              </Link>
              {dpp.qr_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dpp.qr_url} alt="DPP QR code" width={72} height={72} />
              )}
            </div>
          </div>
        ) : (
          <p className="muted small">{dppMeta.error || "Loading DPP…"}</p>
        )}
      </section>

      <section>
        <h3 style={{ fontSize: 16, marginBottom: 10 }}>
          Evidence ledger {chain && (chain.valid ? "(chain verified)" : "(⚠ chain broken)")}
        </h3>
        {chainMeta.stale && (
          <StaleBanner serviceName="Ledger service" fetchedAt={chainMeta.fetchedAt} error={chainMeta.error} />
        )}
        {ledgerEntries.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Timestamp</th>
                <th>Decision</th>
                <th>Confidence</th>
                <th>Hash</th>
              </tr>
            </thead>
            <tbody>
              {ledgerEntries.map((e) => {
                const decision =
                  typeof e.data.decision === "string"
                    ? e.data.decision
                    : e.block_type;
                const confidence =
                  typeof e.data.confidence === "number"
                    ? e.data.confidence
                    : null;
                return (
                  <tr key={e.event_id}>
                    <td className="mono">{e.event_id}</td>
                    <td>{new Date(e.timestamp).toLocaleString()}</td>
                    <td>{decision}</td>
                    <td>
                      {confidence != null
                        ? `${(confidence * 100).toFixed(0)}%`
                        : "—"}
                    </td>
                    <td className="mono small muted">{e.hash.slice(0, 10)}…</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="muted small">{chainMeta.error || "No ledger entries for this unit yet."}</p>
        )}
      </section>
    </div>
  );
}
