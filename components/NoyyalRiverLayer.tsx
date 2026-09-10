"use client";

import { useEffect, useState } from "react";
import { GeoJSON, Popup, Tooltip } from "react-leaflet";
import type { FeatureCollection } from "geojson";

export default function NoyyalRiverLayer() {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    fetch("/geo/noyyal-river.geojson")
      .then((res) => res.json())
      .then((data: FeatureCollection) => setGeoData(data))
      .catch((err) => console.error("Could not load Noyyal River GeoJSON:", err));
  }, []);

  if (!geoData) return null;

  const riverStyle = {
    color: "#2563eb", // Vivid water river blue
    weight: 4,
    opacity: 0.85,
    lineCap: "round" as const,
    lineJoin: "round" as const,
  };

  const onEachFeature = (feature: any, layer: any) => {
    layer.on({
      mouseover: (e: any) => {
        const l = e.target;
        l.setStyle({
          color: "#1d4ed8",
          weight: 6,
          opacity: 1,
        });
      },
      mouseout: (e: any) => {
        const l = e.target;
        l.setStyle(riverStyle);
      },
    });

    layer.bindTooltip("Noyyal River · Tiruppur, Tamil Nadu", {
      sticky: true,
      className: "river-tooltip",
    });

    layer.bindPopup(`
      <div style="font-family: 'IBM Plex Sans', sans-serif; padding: 4px;">
        <h4 style="margin: 0 0 4px; font-family: 'Fraunces', serif; color: #1e3a8a; font-size: 16px;">Noyyal River</h4>
        <p style="margin: 0 0 4px; font-size: 13px; color: #4b5850;">Tiruppur District, Tamil Nadu</p>
        <div style="font-size: 11px; color: #6b7280; margin-top: 6px; border-top: 1px solid #e5e7eb; padding-top: 4px;">
          Source: OpenStreetMap (OSM)
        </div>
      </div>
    `);
  };

  return <GeoJSON data={geoData} style={riverStyle} onEachFeature={onEachFeature} />;
}
