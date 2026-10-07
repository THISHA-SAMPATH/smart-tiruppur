"use client";
import React from "react";
import { getObjectProvenance } from "@/lib/provenance/service";
import { DataStatus } from "@/lib/provenance/types";
interface DataProvenanceCardProps { objectId: string; objectType?: string; compact?: boolean; }
const getStatusBadgeStyle = (status: DataStatus) => {
  switch (status) {
    case "OPEN_DATA": return { bg: "rgba(56, 189, 248, 0.15)", text: "#38bdf8", border: "#38bdf8" };
    case "SIMULATED": return { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b", border: "#f59e0b" };
    case "DERIVED": return { bg: "rgba(99, 102, 241, 0.15)", text: "#818cf8", border: "#6366f1" };
    case "MODELLED": return { bg: "rgba(236, 72, 153, 0.15)", text: "#f472b6", border: "#ec4899" };
  }
};
export default function DataProvenanceCard({ objectId, objectType = "node" }: DataProvenanceCardProps) {
  const prov = getObjectProvenance(objectId, objectType); const badgeStyle = getStatusBadgeStyle(prov.dataStatus);
  return <details className="dt-card-surface" style={{ cursor: "pointer", border: "1px solid var(--hairline)" }}><summary style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", fontWeight: 700, color: "var(--color-indigo)" }}><span>DATA PROVENANCE</span><span style={{ fontSize: "10px", fontWeight: 800, padding: "2px 6px", borderRadius: "4px", background: badgeStyle.bg, color: badgeStyle.text, border: `1px solid ${badgeStyle.border}` }}>{prov.dataStatus}</span></summary><div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "11px", color: "var(--color-slate-text)" }}><div style={{ background: "rgba(0,0,0,0.2)", padding: "6px 8px", borderRadius: "4px" }}><div style={{ color: "var(--color-slate-muted)", fontSize: "10px", fontWeight: 700 }}>PRIMARY DATA SOURCE</div><div style={{ fontWeight: 600, marginTop: "2px" }}>{prov.source}</div><div style={{ fontSize: "10px", color: "var(--color-teal)", marginTop: "1px" }}>{prov.sourceType}</div></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}><div style={{ background: "rgba(0,0,0,0.2)", padding: "6px 8px", borderRadius: "4px" }}><div style={{ color: "var(--color-slate-muted)", fontSize: "10px" }}>PROCESSING STATUS</div><div style={{ fontWeight: 600, fontSize: "10.5px" }}>{prov.processingStatus}</div></div><div style={{ background: "rgba(0,0,0,0.2)", padding: "6px 8px", borderRadius: "4px" }}><div style={{ color: "var(--color-slate-muted)", fontSize: "10px" }}>MODEL VERSION</div><div style={{ fontWeight: 600, fontSize: "10.5px", fontFamily: "monospace" }}>{prov.modelVersion || prov.calculationVersion || "v1.4"}</div></div></div><div style={{ fontSize: "10px", color: "var(--color-slate-muted)", lineHeight: 1.45 }}>Status describes the current model or data source; it is not a claim of physical telemetry or external verification.</div></div></details>;
}
