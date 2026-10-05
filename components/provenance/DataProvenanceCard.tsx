"use client";

import React from "react";
import Link from "next/link";
import { getObjectProvenance } from "@/lib/provenance/service";
import { DataStatus } from "@/lib/provenance/types";

interface DataProvenanceCardProps {
  objectId: string;
  objectType?: string;
  compact?: boolean;
}

export default function DataProvenanceCard({
  objectId,
  objectType = "node",
  compact = false,
}: DataProvenanceCardProps) {
  const prov = getObjectProvenance(objectId, objectType);

  const getStatusBadgeStyle = (status: DataStatus) => {
    switch (status) {
      case "LIVE":
        return { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981", border: "#10b981" };
      case "HISTORICAL":
        return { bg: "rgba(56, 189, 248, 0.15)", text: "#38bdf8", border: "#38bdf8" };
      case "SIMULATED":
        return { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b", border: "#f59e0b" };
      case "DERIVED":
        return { bg: "rgba(99, 102, 241, 0.15)", text: "#818cf8", border: "#6366f1" };
      case "SCENARIO":
        return { bg: "rgba(236, 72, 153, 0.15)", text: "#f472b6", border: "#ec4899" };
      default:
        return { bg: "rgba(148, 163, 184, 0.15)", text: "#94a3b8", border: "#94a3b8" };
    }
  };

  const badgeStyle = getStatusBadgeStyle(prov.dataStatus);

  return (
    <details className="dt-card-surface" style={{ cursor: "pointer", border: "1px solid var(--hairline)" }}>
      <summary style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", fontWeight: 700, color: "var(--color-indigo)" }}>
        <span>📜 DATA PROVENANCE & LINEAGE</span>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 800,
            padding: "2px 6px",
            borderRadius: "4px",
            background: badgeStyle.bg,
            color: badgeStyle.text,
            border: `1px solid ${badgeStyle.border}`,
            letterSpacing: "0.5px",
          }}
        >
          {prov.dataStatus}
        </span>
      </summary>

      <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "11px", color: "var(--color-slate-text)" }}>
        {/* Source & Type */}
        <div style={{ background: "rgba(0,0,0,0.2)", padding: "6px 8px", borderRadius: "4px" }}>
          <div style={{ color: "var(--color-slate-muted)", fontSize: "10px", fontWeight: 700 }}>PRIMARY DATA SOURCE</div>
          <div style={{ fontWeight: 600, marginTop: "2px" }}>{prov.source}</div>
          <div style={{ fontSize: "10px", color: "var(--color-teal)", marginTop: "1px" }}>{prov.sourceType}</div>
        </div>

        {/* Processing & Version */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
          <div style={{ background: "rgba(0,0,0,0.2)", padding: "6px 8px", borderRadius: "4px" }}>
            <div style={{ color: "var(--color-slate-muted)", fontSize: "10px" }}>PROCESSING STATUS</div>
            <div style={{ fontWeight: 600, fontSize: "10.5px" }}>{prov.processingStatus}</div>
          </div>
          <div style={{ background: "rgba(0,0,0,0.2)", padding: "6px 8px", borderRadius: "4px" }}>
            <div style={{ color: "var(--color-slate-muted)", fontSize: "10px" }}>MODEL VERSION</div>
            <div style={{ fontWeight: 600, fontSize: "10.5px", fontFamily: "monospace" }}>{prov.modelVersion || prov.calculationVersion || "v1.4"}</div>
          </div>
        </div>

        {/* Confidence & Uncertainty */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
          <div style={{ background: "rgba(0,0,0,0.2)", padding: "6px 8px", borderRadius: "4px" }}>
            <div style={{ color: "var(--color-slate-muted)", fontSize: "10px" }}>MODEL CONFIDENCE</div>
            <div style={{ fontWeight: 700, color: "var(--color-green)", fontSize: "11px" }}>{(prov.confidence * 100).toFixed(0)}%</div>
          </div>
          <div style={{ background: "rgba(0,0,0,0.2)", padding: "6px 8px", borderRadius: "4px" }}>
            <div style={{ color: "var(--color-slate-muted)", fontSize: "10px" }}>UNCERTAINTY MARGIN</div>
            <div style={{ fontWeight: 700, color: "var(--color-amber)", fontSize: "11px", fontFamily: "monospace" }}>{prov.uncertaintyMargin}</div>
          </div>
        </div>

        {/* Upstream Sources */}
        {prov.upstreamSources && prov.upstreamSources.length > 0 && (
          <div style={{ background: "rgba(0,0,0,0.2)", padding: "6px 8px", borderRadius: "4px" }}>
            <div style={{ color: "var(--color-slate-muted)", fontSize: "10px", fontWeight: 700, marginBottom: "4px" }}>
              UPSTREAM SOURCE CONTRIBUTIONS
            </div>
            {prov.upstreamSources.map((s) => (
              <div key={s.id} style={{ fontSize: "10px", display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                <span style={{ color: "var(--color-slate-text)" }}>• {s.name}</span>
                <span style={{ fontFamily: "monospace", color: "var(--color-cyan)" }}>
                  {s.contributionWeight ? `${(s.contributionWeight * 100).toFixed(0)}%` : "-"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Component Weights */}
        {prov.componentWeights && prov.componentWeights.length > 0 && (
          <div style={{ background: "rgba(0,0,0,0.2)", padding: "6px 8px", borderRadius: "4px" }}>
            <div style={{ color: "var(--color-slate-muted)", fontSize: "10px", fontWeight: 700, marginBottom: "4px" }}>
              RISK CALCULATION WEIGHTS
            </div>
            {prov.componentWeights.map((cw, idx) => (
              <div key={idx} style={{ fontSize: "10px", display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                <span>{cw.componentName}:</span>
                <span style={{ fontFamily: "monospace", color: "var(--color-cyan)" }}>
                  val {cw.componentValue.toFixed(2)} × w {cw.weightFactor.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Cryptographic Ledger Verification */}
        {prov.ledgerHash && (
          <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "6px 8px", borderRadius: "4px", marginTop: "2px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#10b981", display: "flex", justifyContent: "space-between" }}>
              <span>GREEN LEDGER AUDIT</span>
              <span>VERIFIED ✔</span>
            </div>
            <div style={{ fontFamily: "monospace", fontSize: "9.5px", color: "var(--color-cyan)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "2px" }}>
              Hash: {prov.ledgerHash}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
