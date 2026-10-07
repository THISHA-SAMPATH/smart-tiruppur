"use client";

import React from "react";
import type { SteriCityOverview } from "@/lib/steri/types";

type ProvenanceType = "OPEN_DATA" | "DERIVED" | "SIMULATED" | "MODELLED";

interface ProvenanceRow {
  component: string;
  type: ProvenanceType;
  source: string;
  limitation: string;
}

interface DataModelProvenancePanelProps {
  steriOverview: SteriCityOverview | null;
}

const typeColor: Record<ProvenanceType, string> = {
  OPEN_DATA: "#38bdf8",
  DERIVED: "#a78bfa",
  SIMULATED: "#f59e0b",
  MODELLED: "#f472b6",
};

export default function DataModelProvenancePanel({ steriOverview }: DataModelProvenancePanelProps) {
  const complaintProvenance = steriOverview?.units[0]?.componentProvenance.complaintIntensity;
  const rows: ProvenanceRow[] = [
    { component: "Terrain", type: "MODELLED", source: "Existing procedural elevation model / loaded terrain grid where available.", limitation: "Procedural fallback is not a surveyed DEM." },
    { component: "Noyyal River", type: "OPEN_DATA", source: "Existing OpenStreetMap Noyyal River GeoJSON.", limitation: "Geometry only; not water-quality monitoring." },
    { component: "Roads", type: "OPEN_DATA", source: "Existing TNGIS road GeoJSON.", limitation: "GIS geometry only." },
    { component: "Buildings", type: "OPEN_DATA", source: "Existing OpenStreetMap building footprints.", limitation: "No occupancy or population is inferred." },
    { component: "Industrial Sources", type: "SIMULATED", source: "Existing 12-unit synthetic demonstration dataset.", limitation: "Not an industrial facility registry." },
    { component: "Industrial Outfalls", type: "SIMULATED", source: "Existing synthetic outfall model inputs.", limitation: "Flow and indicator values are not observations." },
    { component: "Sensor Network", type: "SIMULATED", source: "Existing synthetic demonstration sensor network.", limitation: "Not a live monitoring network." },
    { component: "Pollution Transport", type: "MODELLED", source: "Existing simulated source-to-river transport visualization.", limitation: "Not calibrated dispersion or measured concentration." },
    { component: "STERI", type: "MODELLED", source: "Dynamic /api/steri calculation using existing component engines and scenario inputs.", limitation: "Decision support only; not a validated forecast." },
    { component: "Flood Model", type: "MODELLED", source: "Existing terrain-based flood engine.", limitation: "Simplified terrain estimate, not a 2D hydraulic model." },
    { component: "Groundwater", type: "DERIVED", source: "Existing groundwater category mapping used by STERI.", limitation: "No new groundwater observations are fetched." },
    { component: "Citizen Reports", type: complaintProvenance?.sourceType === "DERIVED" ? "DERIVED" : "SIMULATED", source: complaintProvenance?.sourceDescription || "Existing seeded geocoded complaint hotspot fallback.", limitation: complaintProvenance?.fallback || "Seeded/demo reports are not public complaints." },
  ];

  return (
    <details className="dt-card-surface" style={{ marginTop: "10px" }}>
      <summary style={{ cursor: "pointer", fontSize: "11px", fontWeight: 800, color: "var(--color-teal)", letterSpacing: "0.04em" }}>
        DATA & MODEL PROVENANCE
      </summary>
      <p style={{ margin: "8px 0", fontSize: "10px", color: "var(--color-slate-muted)", lineHeight: 1.45 }}>
        Status applies to the current Digital Twin implementation; it does not imply real-time measurement or validated prediction.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {rows.map((row) => (
          <div key={row.component} style={{ padding: "7px", borderRadius: "5px", background: "rgba(15, 23, 42, 0.55)", borderLeft: `2px solid ${typeColor[row.type]}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "6px", alignItems: "baseline" }}>
              <strong style={{ fontSize: "10.5px", color: "var(--color-slate-text)" }}>{row.component}</strong>
              <span style={{ fontSize: "9px", color: typeColor[row.type], fontWeight: 800 }}>{row.type}</span>
            </div>
            <div style={{ marginTop: "2px", fontSize: "9.5px", color: "var(--color-slate-muted)", lineHeight: 1.35 }}>Source: {row.source}</div>
            <div style={{ marginTop: "2px", fontSize: "9.5px", color: "#fbbf24", lineHeight: 1.35 }}>Limit: {row.limitation}</div>
          </div>
        ))}
      </div>
    </details>
  );
}
