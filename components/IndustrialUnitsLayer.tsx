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
            <div style={{ fontFamily: "IBM Plex Sans, sans-serif", padding: "4px", minWidth: "200px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                <h4 style={{ margin: 0, fontFamily: "Fraunces, serif", fontSize: "16px", color: "#1f2a24" }}>
                  {unit.name || unit.unit_id}
                </h4>
                <span className="mono small muted" style={{ fontSize: "11px" }}>{unit.unit_id}</span>
              </div>

              <div style={{ fontSize: "12.5px", lineHeight: "1.6", marginBottom: "10px" }}>
                <div><strong>CETP/ZLD Status:</strong> {unit.cetp_zld_status || "—"}</div>
                <div><strong>Compliance:</strong> <span style={{ color: "#3e6b63", fontWeight: 600 }}>{unit.compliance_status || "—"}</span></div>
                {unit.reuse_percentage != null && (
                  <div><strong>Water Reuse:</strong> {unit.reuse_percentage}%</div>
                )}
              </div>

              <Link
                href={`/units/${unit.unit_id}`}
                className="btn btn-ghost"
                style={{
                  display: "inline-block",
                  width: "100%",
                  textAlign: "center",
                  padding: "5px 10px",
                  fontSize: "12px",
                  textDecoration: "none",
                }}
              >
                View Unit Details →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
