"use client";

import { useEffect, useState } from "react";
import { GeoJSON } from "react-leaflet";
import type { FeatureCollection } from "geojson";
import { getGroundwaterAssessment } from "@/lib/api";
import type { GroundwaterAssessment } from "@/lib/types";

interface FirkaGroundwaterLayerProps {
  multiplier?: number;
}

export default function FirkaGroundwaterLayer({
  multiplier = 1.0,
}: FirkaGroundwaterLayerProps) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [assessments, setAssessments] = useState<Record<string, GroundwaterAssessment>>({});
  const [loading, setLoading] = useState(true);

  // 1. Fetch GeoJSON FIRKA boundaries
  useEffect(() => {
    fetch("/geo/tiruppur-firka-boundaries.geojson")
      .then((res) => res.json())
      .then((data: FeatureCollection) => setGeoData(data))
      .catch((err) =>
        console.error("Could not load FIRKA Boundaries GeoJSON:", err)
      );
  }, []);

  // 2. Fetch CGWB Assessment data for all FIRKAs when multiplier changes
  useEffect(() => {
    if (!geoData) return;

    let isMounted = true;
    setLoading(true);

    void (async () => {
      const results: Record<string, GroundwaterAssessment> = {};

      await Promise.all(
        geoData.features.map(async (feature: any) => {
          const zoneId = feature.properties?.zone_id;
          if (!zoneId) return;

          const res = await getGroundwaterAssessment(zoneId, multiplier);
          if (res.data) {
            results[zoneId] = res.data;
          }
        })
      );

      if (isMounted) {
        setAssessments(results);
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [geoData, multiplier]);

  if (!geoData) return null;

  const getRiskColor = (category?: string) => {
    switch (category) {
      case "Safe":
        return { fill: "#16a34a", stroke: "#15803d" };
      case "Semi Critical":
        return { fill: "#ca8a04", stroke: "#a16207" };
      case "Critical":
        return { fill: "#ea580c", stroke: "#c2410c" };
      case "Over Exploited":
        return { fill: "#dc2626", stroke: "#b91c1c" };
      default:
        return { fill: "#9ca3af", stroke: "#6b7280" };
    }
  };

  const getStyle = (feature: any) => {
    const zoneId = feature.properties?.zone_id;
    const ass = assessments[zoneId];
    // Use simulated risk if scenario active, otherwise CGWB baseline
    const category = ass
      ? multiplier !== 1.0
        ? ass.simulation?.risk || ass.cgwb_baseline.category
        : ass.cgwb_baseline.category
      : undefined;

    const colors = getRiskColor(category);

    return {
      fillColor: colors.fill,
      fillOpacity: 0.35,
      color: colors.stroke,
      weight: 1.5,
      dashArray: "2, 4",
    };
  };

  const onEachFeature = (feature: any, layer: any) => {
    const zoneId = feature.properties?.zone_id;
    const firkaName = feature.properties?.name || "Tiruppur FIRKA";
    const ass = assessments[zoneId];

    const baseline = ass?.cgwb_baseline;
    const simulation = ass?.simulation;

    const category = multiplier !== 1.0 && simulation
      ? simulation.risk
      : baseline?.category || "Loading...";

    const colors = getRiskColor(category);

    layer.on({
      mouseover: (e: any) => {
        const l = e.target;
        l.setStyle({
          fillOpacity: 0.6,
          weight: 2.5,
        });
      },
      mouseout: (e: any) => {
        const l = e.target;
        l.setStyle(getStyle(feature));
      },
    });

    layer.bindTooltip(
      `FIRKA: ${firkaName} · ${category} (${baseline?.stage_percent ? `${baseline.stage_percent.toFixed(1)}%` : "CGWB 2024"})`,
      { sticky: true }
    );

    const isScenario = multiplier !== 1.0;

    layer.bindPopup(`
      <div style="font-family: 'IBM Plex Sans', sans-serif; padding: 4px; min-width: 220px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
          <h4 style="margin: 0; font-family: 'Fraunces', serif; font-size: 16px; color: #1e293b;">${firkaName}</h4>
          <span style="font-size: 10px; text-transform: uppercase; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: ${colors.fill}22; color: ${colors.stroke};">
            ${category}
          </span>
        </div>
        <p style="margin: 0 0 8px; font-size: 11px; color: #64748b;">Assessment Year: 2024</p>

        <!-- CGWB 2024 Baseline -->
        <div style="background: #f8fafc; padding: 6px 8px; border-radius: 4px; border: 1px solid #e2e8f0; margin-bottom: 6px; font-size: 12px; line-height: 1.5;">
          <div style="font-size: 10px; font-weight: bold; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
            CGWB 2024 Baseline
          </div>
          <div><strong>Stage:</strong> ${baseline ? `${baseline.stage_percent.toFixed(2)}%` : "—"}</div>
          <div><strong>Category:</strong> ${baseline?.category || "—"}</div>
          <div><strong>Extractable Resource:</strong> ${baseline ? `${baseline.annual_extractable_resource_ham.toFixed(2)} HaM` : "—"}</div>
          <div><strong>Total Extraction:</strong> ${baseline ? `${baseline.total_extraction_ham.toFixed(2)} HaM` : "—"}</div>
        </div>

        ${
          isScenario && simulation
            ? `
          <!-- Active Scenario Simulation -->
          <div style="background: #fffbeb; padding: 6px 8px; border-radius: 4px; border: 1px solid #fef3c7; margin-bottom: 6px; font-size: 12px; line-height: 1.5;">
            <div style="font-size: 10px; font-weight: bold; color: #b45309; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
              ⚡ Scenario (${multiplier}x Extraction)
            </div>
            <div><strong>Simulated Stage:</strong> ${simulation.estimated_stage_percent.toFixed(2)}%</div>
            <div><strong>Simulated Category:</strong> <span style="font-weight: 600; color: ${colors.stroke}">${simulation.risk}</span></div>
          </div>
        `
            : ""
        }

        <div style="font-size: 10.5px; color: #94a3b8; margin-top: 6px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
          Source: CGWB — Dynamic Ground Water Resources of Tamil Nadu 2024
        </div>
      </div>
    `);
  };

  return (
    <GeoJSON
      key={`firka_layer_${multiplier}_${loading ? "loading" : "loaded"}`}
      data={geoData}
      style={getStyle}
      onEachFeature={onEachFeature}
    />
  );
}
