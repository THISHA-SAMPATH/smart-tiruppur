"use client";

import { useEffect, useState } from "react";
import { GeoJSON } from "react-leaflet";
import type { FeatureCollection } from "geojson";

export default function IndustrialAreasLayer() {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    fetch("/geo/tiruppur-industrial-areas.geojson")
      .then((res) => res.json())
      .then((data: FeatureCollection) => setGeoData(data))
      .catch((err) =>
        console.error("Could not load Industrial Areas GeoJSON:", err)
      );
  }, []);

  if (!geoData) return null;

  const defaultStyle = {
    fillColor: "#d97706", // Amber industrial tint
    fillOpacity: 0.22,
    color: "#b45309", // Border stroke color
    weight: 1.5,
    dashArray: "3",
  };

  const onEachFeature = (feature: any, layer: any) => {
    const name = feature.properties?.name || "Tiruppur Industrial Area";
    const location = feature.properties?.location || "Tiruppur, Tamil Nadu";
    const landuse = feature.properties?.landuse || "industrial";
    const industrialType = feature.properties?.industrial_type || "textile_processing";

    layer.on({
      mouseover: (e: any) => {
        const l = e.target;
        l.setStyle({
          fillOpacity: 0.4,
          weight: 2.5,
          color: "#92400e",
        });
      },
      mouseout: (e: any) => {
        const l = e.target;
        l.setStyle(defaultStyle);
      },
    });

    layer.bindTooltip(`${name} · ${location}`, {
      sticky: true,
      className: "industrial-area-tooltip",
    });

    layer.bindPopup(`
      <div style="font-family: 'IBM Plex Sans', sans-serif; padding: 4px; min-width: 180px;">
        <h4 style="margin: 0 0 6px; font-family: 'Fraunces', serif; color: #78350f; font-size: 15px;">${name}</h4>
        <div style="font-size: 12px; line-height: 1.5; color: #4b5850;">
          <div><strong>Location:</strong> ${location}</div>
          <div><strong>OSM Feature:</strong> landuse=${landuse}</div>
          <div><strong>Type:</strong> ${industrialType}</div>
        </div>
        <div style="font-size: 11px; color: #6b7280; margin-top: 8px; border-top: 1px solid #e5e7eb; padding-top: 4px;">
          Source: OpenStreetMap
        </div>
      </div>
    `);
  };

  return <GeoJSON data={geoData} style={defaultStyle} onEachFeature={onEachFeature} />;
}
