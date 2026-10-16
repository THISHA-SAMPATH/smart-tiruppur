"use client";

import { useEffect, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import Link from "next/link";
import L from "leaflet";
import { getUnits } from "@/lib/api";
import type { LedgerUnit } from "@/lib/types";

export interface IndustrialUnitGeo extends LedgerUnit {
  /** Geographic coordinates: [latitude, longitude]. Null/undefined if not provided by backend. */
  coordinates?: [number, number] | null;
}

// Professional industrial marker icon (Madder/Ink civic style)
const industrialIcon = L.divIcon({
  className: "industrial-marker-icon",
  html: `<div style="
    width: 24px;
    height: 24px;
    background: #9c3b22;
    border: 2px solid #ffffff;
    border-radius: 4px;
    box-shadow: 0 3px 8px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-family: monospace;
    font-size: 10px;
    font-weight: bold;
  ">🏭</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -14],
});

export default function IndustrialUnitsLayer({
  onUnitsLoaded,
}: {
  onUnitsLoaded?: (units: IndustrialUnitGeo[]) => void;
}) {
  const [units, setUnits] = useState<IndustrialUnitGeo[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await getUnits();
      if (res.data) {
        // Cast or map units with optional coordinates if provided by API
        const loadedUnits: IndustrialUnitGeo[] = res.data.map((u: any) => ({
          ...u,
          coordinates: u.coordinates || (u.latitude && u.longitude ? [u.latitude, u.longitude] : null),
        }));
        setUnits(loadedUnits);
        if (onUnitsLoaded) onUnitsLoaded(loadedUnits);
      }
    })();
  }, [onUnitsLoaded]);

  // Render ONLY units that have real, non-null geographic coordinates
  const geocodedUnits = units.filter((u) => u.coordinates && u.coordinates.length === 2);

  if (geocodedUnits.length === 0) {
    return null;
  }

  return (
    <>
      {geocodedUnits.map((unit) => (
        <Marker
          key={unit.unit_id}
          position={unit.coordinates!}
          icon={industrialIcon}
        >
          <Popup>
            <div style={{ fontFamily: "Inter, sans-serif", padding: "6px", minWidth: "220px", color: "var(--ink, #0f172a)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
                <h4 style={{ margin: 0, fontWeight: 700, fontSize: "14.5px", color: "#0f172a", lineHeight: 1.3 }}>
                  {unit.name || unit.unit_id}
                </h4>
                <span
                  className="mono"
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 700,
                    color: "#475569",
                    background: "#f1f5f9",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    border: "1px solid #e2e8f0",
                    flexShrink: 0,
                  }}
                >
                  {unit.unit_id}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "90px 1fr",
                  gap: "4px 8px",
                  fontSize: "12px",
                  background: "#f8fafc",
                  padding: "8px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  marginBottom: "10px",
                }}
              >
                <span style={{ color: "#64748b" }}>Status:</span>
                <span style={{ fontWeight: 600 }}>{unit.cetp_zld_status || "Operational ZLD"}</span>

                <span style={{ color: "#64748b" }}>Compliance:</span>
                <span style={{ color: "#059669", fontWeight: 700 }}>{unit.compliance_status || "Compliant"}</span>

                {unit.reuse_percentage != null && (
                  <>
                    <span style={{ color: "#64748b" }}>Water Reuse:</span>
                    <span className="mono" style={{ fontWeight: 700, color: "#0d9488" }}>{unit.reuse_percentage}%</span>
                  </>
                )}
              </div>

              <Link
                href={`/units/${unit.unit_id}`}
                className="btn btn-primary"
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "center",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  textDecoration: "none",
                  borderRadius: "4px",
                  background: "#0d9488",
                  color: "#ffffff",
                  boxSizing: "border-box",
                }}
              >
                View Facility Profile →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
