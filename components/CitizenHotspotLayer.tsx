"use client";

import React, { useEffect, useState } from "react";
import { Circle, Popup, Tooltip, LayerGroup } from "react-leaflet";
import { detectComplaintHotspots } from "@/lib/citizen/engine";
import { ComplaintHotspot } from "@/lib/citizen/types";

interface CitizenHotspotLayerProps {
  onSelectHotspot?: (hotspot: ComplaintHotspot) => void;
}

export default function CitizenHotspotLayer({ onSelectHotspot }: CitizenHotspotLayerProps) {
  const [hotspots, setHotspots] = useState<ComplaintHotspot[]>([]);

  useEffect(() => {
    const list = detectComplaintHotspots();
    setHotspots(list);
  }, []);

  const getHotspotColor = (category: string) => {
    switch (category) {
      case "CRITICAL":
        return { fill: "#dc2626", stroke: "#b91c1c", symbol: "!" };
      case "VERY HIGH":
        return { fill: "#ea580c", stroke: "#c2410c", symbol: "▲" };
      case "HIGH":
        return { fill: "#f97316", stroke: "#d97706", symbol: "▲" };
      default:
        return { fill: "#eab308", stroke: "#ca8a04", symbol: "●" };
    }
  };

  return (
    <LayerGroup>
      {hotspots.map((spot) => {
        const style = getHotspotColor(spot.riskCategory);

        return (
          <Circle
            key={spot.id}
            center={[spot.centerLat, spot.centerLon]}
            radius={spot.radiusMeters}
            pathOptions={{
              fillColor: style.fill,
              fillOpacity: 0.35,
              color: style.stroke,
              weight: 2,
              dashArray: "4, 4",
            }}
            eventHandlers={{
              click: () => {
                if (onSelectHotspot) onSelectHotspot(spot);
              },
            }}
          >
            <Tooltip sticky direction="top">
              <div style={{ fontFamily: "sans-serif", fontSize: "12px", fontWeight: 700 }}>
                <span style={{ color: style.stroke, marginRight: "4px" }}>{style.symbol}</span>
                {spot.title} ({spot.complaintCount} Reports)
              </div>
            </Tooltip>

            <Popup>
              <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", padding: "4px", minWidth: "260px", maxWidth: "320px" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
                    {spot.title}
                  </h4>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: `${style.fill}22`,
                      color: style.stroke,
                      border: `1px solid ${style.stroke}44`,
                    }}
                  >
                    {style.symbol} {spot.riskCategory}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "3px", background: "#f1f5f9", color: "#475569", fontWeight: 600 }}>
                    DEMONSTRATION DATA
                  </span>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    {spot.complaintCount} Correlated Complaints
                  </span>
                </div>

                {/* Environmental Correlation Box */}
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    marginBottom: "8px",
                    fontSize: "11px",
                    lineHeight: "1.5",
                  }}
                >
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
                    Environmental Risk Correlation
                  </div>
                  <div><strong>Rainfall:</strong> {spot.environmentalCorrelation.elevatedRainfallMmDay} mm/day (Elevated)</div>
                  <div><strong>Nearby Infrastructure:</strong> {spot.environmentalCorrelation.nearbyDrainageSegment}</div>
                  <div><strong>Elevation:</strong> ~{spot.environmentalCorrelation.elevationMetersASL} m ASL (Low Trough)</div>
                  <div><strong>River Proximity:</strong> {spot.environmentalCorrelation.riverProximityMeters} m from Noyyal Channel</div>
                </div>

                {/* Recommended Action */}
                <div style={{ background: "#fffbeb", padding: "6px 8px", borderRadius: "4px", border: "1px solid #fef3c7", marginBottom: "6px", fontSize: "11px" }}>
                  <strong style={{ color: "#b45309", display: "block", marginBottom: "2px" }}>💡 Action Recommendation:</strong>
                  <span style={{ color: "#451a03" }}>{spot.recommendedAction}</span>
                </div>
              </div>
            </Popup>
          </Circle>
        );
      })}
    </LayerGroup>
  );
}
