"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { INDUSTRIAL_UNITS_GEO } from "@/lib/digital-twin/industrial";
import { ENVIRONMENTAL_SENSOR_REGISTRY } from "@/lib/digital-twin/sensors";

interface SelectedEntity {
  category: "industrial" | "station";
  id: string;
  name: string;
  lat: number;
  lon: number;
  type?: string;
  status?: string;
  reuse?: number;
  flow?: number;
  streamId?: string;
  designation?: string;
  ph?: number;
  ec?: number;
  turbidity?: number;
  sourceType: string;
  source: string;
}

export default function TerrainMapPrototypePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  const [status, setStatus] = useState("Preparing map...");
  const [is3D, setIs3D] = useState(true);
  const is3DRef = useRef(is3D);
  const [showRiver, setShowRiver] = useState(true);
  const [showIndustry, setShowIndustry] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);

  useEffect(() => {
    let active = true;
    let map: MapLibreMap | null = null;

    async function initialiseMap() {
      try {
        const ml = await import("maplibre-gl");

        if (!active || !containerRef.current) return;

        // Use the worker matching the installed MapLibre version.
        ml.setWorkerUrl(
          `https://unpkg.com/maplibre-gl@${ml.getVersion()}/dist/maplibre-gl-worker.mjs`
        );

        map = new ml.Map({
          container: containerRef.current,
          style: "https://tiles.openfreemap.org/styles/liberty",
          center: [77.3411, 11.1085],
          zoom: 13.5,
          pitch: 52,
          bearing: -18,
          maxPitch: 65,
        });

        mapRef.current = map;

        map.addControl(
          new ml.NavigationControl({ visualizePitch: true }),
          "top-right"
        );

        map.addControl(
          new ml.ScaleControl({
            maxWidth: 110,
            unit: "metric",
          }),
          "bottom-left"
        );

        map.on("load", async () => {
          if (!active || !map) return;
          const activeMap = map;

          setStatus("Basemap loaded. Adding environmental monitoring layers...");

          try {
            // Find first text label layer so environmental overlays and extrusions sit below place/street labels
            // (road_one_way_arrow at index 61 in Liberty is a transportation line arrow; real text labels start at waterway_line_label at index 88)
            const styleLayers = activeMap.getStyle().layers || [];
            const firstLabel =
              styleLayers.find(
                (layer) =>
                  layer.type === "symbol" &&
                  (Boolean((layer.layout as any)?.["text-field"]) || layer.id.includes("label"))
              )?.id ||
              styleLayers.find((layer) => layer.type === "symbol")?.id;

            // 1. 3D Building Extrusions from Vector Basemap (openmaptiles tile source)
            // Reuses tile schema: source="openmaptiles", source-layer="building", render_height, render_min_height
            // Robust expressions safely handle missing, null, string, non-numeric, or zero values
            const safeHeightExpr: any = [
              "case",
              [">", ["to-number", ["get", "render_height"], 0], 0],
              ["to-number", ["get", "render_height"], 0],
              6, // Documented conservative estimated display height fallback (~2 storeys) for footprints lacking height tags
            ];

            const safeBaseExpr: any = [
              "case",
              [
                "all",
                [">", ["to-number", ["get", "render_min_height"], 0], 0],
                ["<", ["to-number", ["get", "render_min_height"], 0], safeHeightExpr],
              ],
              ["to-number", ["get", "render_min_height"], 0],
              0,
            ];

            const safeColorExpr: any = [
              "interpolate",
              ["linear"],
              safeHeightExpr,
              0,
              "#e2e8f0",
              12,
              "#cbd5e1",
              25,
              "#94a3b8",
            ];

            if (activeMap.getSource("openmaptiles")) {
              if (activeMap.getLayer("building-3d")) {
                // Avoid adding a duplicate building layer: configure the existing Liberty building-3d layer in place
                try {
                  activeMap.setLayerZoomRange("building-3d", 13, 24);
                  activeMap.setLayoutProperty(
                    "building-3d",
                    "visibility",
                    is3DRef.current ? "visible" : "none"
                  );
                  activeMap.setPaintProperty("building-3d", "fill-extrusion-base", safeBaseExpr);
                  activeMap.setPaintProperty("building-3d", "fill-extrusion-height", safeHeightExpr);
                  activeMap.setPaintProperty("building-3d", "fill-extrusion-color", safeColorExpr);
                  activeMap.setPaintProperty("building-3d", "fill-extrusion-opacity", 0.82);
                  activeMap.setPaintProperty("building-3d", "fill-extrusion-vertical-gradient", true);
                } catch (err) {
                  console.warn("Failed to configure existing building-3d layer:", err);
                }
              } else {
                activeMap.addLayer(
                  {
                    id: "building-3d",
                    type: "fill-extrusion",
                    source: "openmaptiles",
                    "source-layer": "building",
                    minzoom: 13,
                    layout: {
                      visibility: is3DRef.current ? "visible" : "none",
                    },
                    paint: {
                      "fill-extrusion-base": safeBaseExpr,
                      "fill-extrusion-height": safeHeightExpr,
                      "fill-extrusion-color": safeColorExpr,
                      "fill-extrusion-opacity": 0.82,
                      "fill-extrusion-vertical-gradient": true,
                    },
                  } as any,
                  firstLabel
                );
              }

              // Manage 2D building footprints: extend zoom range so flat footprints display in 2D mode,
              // but hide them when 3D extrusion is active so they don't obscure or z-fight with 3D buildings.
              if (activeMap.getLayer("building")) {
                try {
                  activeMap.setLayerZoomRange("building", 13, 24);
                  activeMap.setLayoutProperty(
                    "building",
                    "visibility",
                    is3DRef.current ? "none" : "visible"
                  );
                } catch {
                  // Fallback if unsupported
                }
              }
            }

            // 2. Noyyal River Layer
            const riverResponse = await fetch("/geo/noyyal-river.geojson");
            if (riverResponse.ok) {
              const riverData = await riverResponse.json();
              if (active) {
                activeMap.addSource("prototype-noyyal-river", {
                  type: "geojson",
                  data: riverData,
                });

                activeMap.addLayer(
                  {
                    id: "prototype-noyyal-river-glow",
                    type: "line",
                    source: "prototype-noyyal-river",
                    layout: {
                      "line-join": "round",
                      "line-cap": "round",
                    },
                    paint: {
                      "line-color": "#38bdf8",
                      "line-width": 10,
                      "line-opacity": 0.18,
                      "line-blur": 2,
                    },
                  },
                  firstLabel
                );

                activeMap.addLayer(
                  {
                    id: "prototype-noyyal-river-core",
                    type: "line",
                    source: "prototype-noyyal-river",
                    layout: {
                      "line-join": "round",
                      "line-cap": "round",
                    },
                    paint: {
                      "line-color": "#0284c7",
                      "line-width": [
                        "interpolate",
                        ["linear"],
                        ["zoom"],
                        10,
                        1.5,
                        14,
                        3.5,
                        17,
                        6,
                      ],
                    },
                  },
                  firstLabel
                );
              }
            }

            // 2. Simulated Industrial Facilities Layer (12 facilities)
            const industrialFeatures = INDUSTRIAL_UNITS_GEO.map((unit) => ({
              type: "Feature" as const,
              geometry: {
                type: "Point" as const,
                coordinates: [unit.lon, unit.lat],
              },
              properties: {
                id: unit.unit_id,
                name: unit.name,
                type: unit.type,
                status: unit.status,
                reuse: unit.reuse,
                flow: unit.flow,
                confidence: unit.confidence,
                sourceType: unit.sourceType,
                source: unit.source,
                category: "industrial",
              },
            }));

            activeMap.addSource("prototype-industrial-units", {
              type: "geojson",
              data: {
                type: "FeatureCollection",
                features: industrialFeatures,
              },
            });

            activeMap.addLayer(
              {
                id: "prototype-industrial-glow",
                type: "circle",
                source: "prototype-industrial-units",
                paint: {
                  "circle-color": "#ea580c",
                  "circle-radius": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    6,
                    14,
                    11,
                    17,
                    15,
                  ],
                  "circle-opacity": 0.22,
                },
              },
              firstLabel
            );

            activeMap.addLayer(
              {
                id: "prototype-industrial-core",
                type: "circle",
                source: "prototype-industrial-units",
                paint: {
                  "circle-color": "#f97316",
                  "circle-radius": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    3.5,
                    14,
                    6,
                    17,
                    9,
                  ],
                  "circle-stroke-color": "#ffffff",
                  "circle-stroke-width": 1.75,
                },
              },
              firstLabel
            );

            // 3. Simulated Telemetry Monitoring Stations Layer (3 stations)
            const stationFeatures = ENVIRONMENTAL_SENSOR_REGISTRY.map((station) => ({
              type: "Feature" as const,
              geometry: {
                type: "Point" as const,
                coordinates: [station.lon, station.lat],
              },
              properties: {
                id: station.sensor_id,
                streamId: station.stream_id,
                name: station.name,
                designation: station.designation,
                ph: station.ph,
                ec: station.ec,
                turbidity: station.turbidity,
                flow: station.flow,
                confidence: station.confidence,
                sourceType: station.sourceType,
                source: station.source,
                category: "station",
              },
            }));

            activeMap.addSource("prototype-monitoring-stations", {
              type: "geojson",
              data: {
                type: "FeatureCollection",
                features: stationFeatures,
              },
            });

            activeMap.addLayer(
              {
                id: "prototype-stations-glow",
                type: "circle",
                source: "prototype-monitoring-stations",
                paint: {
                  "circle-color": "#06b6d4",
                  "circle-radius": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    8,
                    14,
                    14,
                    17,
                    18,
                  ],
                  "circle-opacity": 0.3,
                },
              },
              firstLabel
            );

            activeMap.addLayer(
              {
                id: "prototype-stations-core",
                type: "circle",
                source: "prototype-monitoring-stations",
                paint: {
                  "circle-color": "#0891b2",
                  "circle-radius": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    4.5,
                    14,
                    7.5,
                    17,
                    11,
                  ],
                  "circle-stroke-color": "#ffffff",
                  "circle-stroke-width": 2,
                },
              },
              firstLabel
            );

            // Click handling for industrial facilities
            activeMap.on("click", "prototype-industrial-core", (e) => {
              if (!e.features || !e.features[0]) return;
              const p = e.features[0].properties as any;
              const coords = (e.features[0].geometry as any).coordinates;
              setSelectedEntity({
                category: "industrial",
                id: p.id,
                name: p.name,
                type: p.type,
                status: p.status,
                lat: coords[1],
                lon: coords[0],
                reuse: Number(p.reuse),
                flow: Number(p.flow),
                sourceType: p.sourceType,
                source: p.source,
              });
            });

            // Click handling for monitoring stations
            activeMap.on("click", "prototype-stations-core", (e) => {
              if (!e.features || !e.features[0]) return;
              const p = e.features[0].properties as any;
              const coords = (e.features[0].geometry as any).coordinates;
              setSelectedEntity({
                category: "station",
                id: p.id,
                streamId: p.streamId,
                name: p.name,
                designation: p.designation,
                lat: coords[1],
                lon: coords[0],
                ph: Number(p.ph),
                ec: Number(p.ec),
                turbidity: Number(p.turbidity),
                flow: Number(p.flow),
                sourceType: p.sourceType,
                source: p.source,
              });
            });

            // Pointer cursor on hover over interactive markers
            ["prototype-industrial-core", "prototype-stations-core"].forEach((layerId) => {
              activeMap.on("mouseenter", layerId, () => {
                activeMap.getCanvas().style.cursor = "pointer";
              });
              activeMap.on("mouseleave", layerId, () => {
                activeMap.getCanvas().style.cursor = "";
              });
            });

            // Clicking outside on map clears selected entity
            activeMap.on("click", (e) => {
              const features = activeMap.queryRenderedFeatures(e.point, {
                layers: ["prototype-industrial-core", "prototype-stations-core"],
              });
              if (features.length === 0) {
                setSelectedEntity(null);
              }
            });

            setStatus("Map ready · Basemap, 3D Buildings, Noyyal River, 12 Facilities & 3 Stations loaded");
          } catch (error) {
            console.error("Layer loading error:", error);
            if (active) {
              setStatus("Map loaded with partial layer availability");
            }
          }
        });

        map.on("error", (event) => {
          console.error("MapLibre:", event.error);
        });
      } catch (error) {
        console.error("Map initialisation:", error);
        if (active) setStatus("Map could not initialise. Check browser console.");
      }
    }

    void initialiseMap();

    return () => {
      active = false;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  function toggleView() {
    const nextIs3D = !is3D;
    setIs3D(nextIs3D);
    is3DRef.current = nextIs3D;

    const map = mapRef.current;
    if (map) {
      if (map.getLayer("building-3d")) {
        map.setLayoutProperty(
          "building-3d",
          "visibility",
          nextIs3D ? "visible" : "none"
        );
      }
      if (map.getLayer("building")) {
        map.setLayoutProperty(
          "building",
          "visibility",
          nextIs3D ? "none" : "visible"
        );
      }

      map.easeTo({
        pitch: nextIs3D ? 52 : 0,
        bearing: nextIs3D ? -18 : 0,
        duration: 700,
      });
    }
  }

  function toggleRiver() {
    const nextVisible = !showRiver;
    setShowRiver(nextVisible);

    const map = mapRef.current;
    if (!map) return;

    for (const id of ["prototype-noyyal-river-glow", "prototype-noyyal-river-core"]) {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, "visibility", nextVisible ? "visible" : "none");
      }
    }
  }

  function toggleIndustry() {
    const nextVisible = !showIndustry;
    setShowIndustry(nextVisible);

    const map = mapRef.current;
    if (!map) return;

    for (const id of ["prototype-industrial-glow", "prototype-industrial-core"]) {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, "visibility", nextVisible ? "visible" : "none");
      }
    }

    if (!nextVisible && selectedEntity?.category === "industrial") {
      setSelectedEntity(null);
    }
  }

  function toggleStations() {
    const nextVisible = !showStations;
    setShowStations(nextVisible);

    const map = mapRef.current;
    if (!map) return;

    for (const id of ["prototype-stations-glow", "prototype-stations-core"]) {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, "visibility", nextVisible ? "visible" : "none");
      }
    }

    if (!nextVisible && selectedEntity?.category === "station") {
      setSelectedEntity(null);
    }
  }

  function resetView() {
    mapRef.current?.easeTo({
      center: [77.3411, 11.1085],
      zoom: 13.5,
      pitch: is3D ? 52 : 0,
      bearing: is3D ? -18 : 0,
      duration: 700,
    });
  }

  return (
    <div
      style={{
        padding: "18px",
        background: "#edf2f7",
        color: "#172b3a",
        minHeight: "calc(100vh - 70px)",
      }}
    >
      {/* Top Header & Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "14px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "2px",
              color: "#0f766e",
            }}
          >
            NOYYALSENSE · ENVIRONMENTAL MAP PROTOTYPE
          </div>

          <h1
            style={{
              margin: "5px 0",
              fontSize: "24px",
              fontWeight: 800,
            }}
          >
            Tiruppur City Map Prototype
          </h1>

          <p style={{ margin: 0, fontSize: "13px", color: "#526477" }}>
            OpenFreeMap basemap · 3D Buildings (openmaptiles) · Noyyal River GeoJSON · 12 Simulated Facilities · 3 Monitoring Stations
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={toggleView} style={buttonStyle} title="Toggle between 3D oblique perspective with building extrusions and 2D flat top-down view">
            {is3D ? "● 3D View (Extruded)" : "○ 2D View (Flat)"}
          </button>

          <button
            onClick={toggleRiver}
            style={{
              ...buttonStyle,
              background: showRiver ? "#f0f9ff" : "#ffffff",
              borderColor: showRiver ? "#0284c7" : "#cbd5e1",
              color: showRiver ? "#0369a1" : "#64748b",
            }}
            title="Toggle Noyyal River overlay visibility"
          >
            {showRiver ? "● River: Visible" : "○ River: Hidden"}
          </button>

          <button
            onClick={toggleIndustry}
            style={{
              ...buttonStyle,
              background: showIndustry ? "#fff7ed" : "#ffffff",
              borderColor: showIndustry ? "#ea580c" : "#cbd5e1",
              color: showIndustry ? "#c2410c" : "#64748b",
            }}
            title="Toggle 12 simulated industrial facilities"
          >
            {showIndustry ? "● Facilities (12): On" : "○ Facilities: Off"}
          </button>

          <button
            onClick={toggleStations}
            style={{
              ...buttonStyle,
              background: showStations ? "#ecfeff" : "#ffffff",
              borderColor: showStations ? "#0891b2" : "#cbd5e1",
              color: showStations ? "#0e7490" : "#64748b",
            }}
            title="Toggle 3 simulated telemetry monitoring stations"
          >
            {showStations ? "● Stations (3): On" : "○ Stations: Off"}
          </button>

          <button onClick={resetView} style={buttonStyle} title="Reset camera to central Tiruppur">
            📍 Fit Tiruppur
          </button>
        </div>
      </div>

      {/* Map Container Viewport */}
      <div
        style={{
          overflow: "hidden",
          position: "relative",
          height: "calc(100vh - 215px)",
          minHeight: "520px",
          borderRadius: "16px",
          border: "1px solid #cad5df",
          boxShadow: "0 12px 35px rgba(24, 48, 65, 0.12)",
          background: "#dce5eb",
        }}
      >
        <div
          ref={containerRef}
          style={{
            position: "absolute",
            inset: 0,
          }}
        />

        {/* Top-Left Location / Status Badge */}
        <div
          style={{
            position: "absolute",
            top: "16px",
            left: "16px",
            padding: "12px 15px",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.95)",
            boxShadow: "0 4px 18px rgba(20,40,55,0.12)",
            backdropFilter: "blur(6px)",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: 800 }}>
            TIRUPPUR, TAMIL NADU
          </div>
          <div
            style={{
              fontSize: "11px",
              marginTop: "4px",
              color: "#526477",
            }}
          >
            {status}
          </div>
        </div>

        {/* Selected Entity Information Card */}
        {selectedEntity && (
          <div
            role="region"
            aria-label="Selected Feature Details"
            style={{
              position: "absolute",
              top: "16px",
              right: "60px",
              width: "330px",
              maxWidth: "calc(100% - 80px)",
              background: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 10px 30px rgba(15,23,42,0.2)",
              border: `1.5px solid ${selectedEntity.category === "industrial" ? "#f97316" : "#06b6d4"}`,
              padding: "16px",
              zIndex: 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "3px 8px",
                  borderRadius: "5px",
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: "0.5px",
                  background: selectedEntity.category === "industrial" ? "#ffedd5" : "#cffafe",
                  color: selectedEntity.category === "industrial" ? "#9a3412" : "#155e75",
                }}
              >
                {selectedEntity.category === "industrial"
                  ? "SIMULATED INDUSTRIAL FACILITY"
                  : "SIMULATED RIVER TELEMETRY"}
              </span>

              <button
                type="button"
                onClick={() => setSelectedEntity(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "0 4px",
                }}
                aria-label="Close details"
              >
                ✕
              </button>
            </div>

            <div style={{ marginTop: "10px", fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
              {selectedEntity.name}
            </div>

            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>
              {selectedEntity.category === "industrial"
                ? selectedEntity.type
                : `${selectedEntity.designation} (${selectedEntity.streamId})`}
            </div>

            <div style={{ fontSize: "11.5px", color: "#334155", marginTop: "8px", fontFamily: "monospace" }}>
              📍 {selectedEntity.lat.toFixed(5)}°N, {selectedEntity.lon.toFixed(5)}°E
            </div>

            {/* Simulated demonstration metrics */}
            <div
              style={{
                marginTop: "12px",
                padding: "10px 12px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                Simulation Parameters (Demo)
              </div>

              {selectedEntity.category === "industrial" ? (
                <div style={{ marginTop: "6px", fontSize: "12px", lineHeight: "1.5", color: "#1e293b" }}>
                  <div>
                    Status: <strong style={{ color: selectedEntity.status === "COMPLIANT" ? "#16a34a" : selectedEntity.status === "WARNING" ? "#d97706" : "#dc2626" }}>{selectedEntity.status}</strong>
                  </div>
                  <div>Water Reuse Rate: <strong>{selectedEntity.reuse}%</strong></div>
                  <div>Modelled Flow: <strong>{selectedEntity.flow} L/s</strong></div>
                </div>
              ) : (
                <div style={{ marginTop: "6px", fontSize: "12px", lineHeight: "1.5", color: "#1e293b" }}>
                  <div>Simulated pH: <strong>{selectedEntity.ph}</strong></div>
                  <div>Simulated EC: <strong>{selectedEntity.ec} µS/cm</strong></div>
                  <div>Turbidity: <strong>{selectedEntity.turbidity} NTU</strong></div>
                  <div>Modelled River Flow: <strong>{selectedEntity.flow} L/s</strong></div>
                </div>
              )}
            </div>

            {/* Explicit provenance notice */}
            <div
              style={{
                marginTop: "10px",
                padding: "8px 10px",
                borderRadius: "6px",
                background: "#fffbeb",
                border: "1px solid #fef3c7",
                fontSize: "10.5px",
                color: "#92400e",
                lineHeight: "1.4",
              }}
            >
              <strong>Data Provenance:</strong> {selectedEntity.source}. Simulation data generated for workflow demonstration. Not field-measured observations.
            </div>
          </div>
        )}

        {/* Bottom-Right Interactive Legend Box */}
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            right: "16px",
            padding: "12px 15px",
            borderRadius: "12px",
            background: "rgba(255,255,255,0.96)",
            boxShadow: "0 6px 20px rgba(20,40,55,0.14)",
            backdropFilter: "blur(8px)",
            fontSize: "12px",
            maxWidth: "310px",
            zIndex: 10,
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "1px", color: "#475569", marginBottom: "8px", textTransform: "uppercase" }}>
            Map Layers & Provenance
          </div>

          {/* River Item */}
          <div
            onClick={toggleRiver}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "7px",
              cursor: "pointer",
              opacity: showRiver ? 1 : 0.45,
            }}
            title="Click to toggle Noyyal River"
          >
            <span
              style={{
                display: "inline-block",
                width: "22px",
                height: "4px",
                borderRadius: "4px",
                background: "#0284c7",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, fontSize: "11.5px" }}>
              <strong style={{ color: "#0369a1" }}>Noyyal River</strong>
              <span style={{ color: "#64748b", marginLeft: "4px" }}>· local GeoJSON</span>
            </div>
            <span style={{ fontSize: "10px", color: showRiver ? "#0284c7" : "#94a3b8" }}>{showRiver ? "ON" : "OFF"}</span>
          </div>

          {/* Industrial Facilities Item */}
          <div
            onClick={toggleIndustry}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "7px",
              cursor: "pointer",
              opacity: showIndustry ? 1 : 0.45,
            }}
            title="Click to toggle Industrial Facilities"
          >
            <span
              style={{
                display: "inline-block",
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "#f97316",
                border: "2px solid #ffffff",
                boxShadow: "0 0 0 1px #ea580c",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, fontSize: "11.5px" }}>
              <strong style={{ color: "#c2410c" }}>Industrial Facilities</strong>
              <span style={{ color: "#64748b", marginLeft: "4px" }}>· 12 synthetic units</span>
            </div>
            <span style={{ fontSize: "10px", color: showIndustry ? "#ea580c" : "#94a3b8" }}>{showIndustry ? "ON" : "OFF"}</span>
          </div>

          {/* Monitoring Stations Item */}
          <div
            onClick={toggleStations}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "7px",
              cursor: "pointer",
              opacity: showStations ? 1 : 0.45,
            }}
            title="Click to toggle Monitoring Stations"
          >
            <span
              style={{
                display: "inline-block",
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "#0891b2",
                border: "2px solid #ffffff",
                boxShadow: "0 0 0 1px #06b6d4",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, fontSize: "11.5px" }}>
              <strong style={{ color: "#0e7490" }}>Telemetry Stations</strong>
              <span style={{ color: "#64748b", marginLeft: "4px" }}>· 3 synthetic points</span>
            </div>
            <span style={{ fontSize: "10px", color: showStations ? "#0891b2" : "#94a3b8" }}>{showStations ? "ON" : "OFF"}</span>
          </div>

          {/* 3D Buildings Item */}
          <div
            onClick={toggleView}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "7px",
              cursor: "pointer",
              opacity: is3D ? 1 : 0.45,
            }}
            title="Click to toggle 3D Buildings (openmaptiles tile render_height / estimated display height fallback)"
          >
            <span
              style={{
                display: "inline-block",
                width: "12px",
                height: "12px",
                borderRadius: "2px",
                background: "#cbd5e1",
                border: "1px solid #94a3b8",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, fontSize: "11.5px" }}>
              <strong style={{ color: "#334155" }}>3D Buildings</strong>
              <span style={{ color: "#64748b", marginLeft: "4px" }}>· openmaptiles</span>
            </div>
            <span style={{ fontSize: "10px", color: is3D ? "#0f766e" : "#94a3b8" }}>
              {is3D ? "EXTRUDED" : "FLAT"}
            </span>
          </div>

          {/* Basemap Item */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#526477",
              fontSize: "11px",
              borderTop: "1px solid #e2e8f0",
              paddingTop: "6px",
              marginTop: "4px",
            }}
          >
            <span style={{ display: "inline-block", width: "10px", height: "10px", background: "#cbd5e1", borderRadius: "2px" }} />
            OpenFreeMap Liberty · Vector basemap
          </div>
        </div>
      </div>

      <p style={{ fontSize: "12px", color: "#526477", marginTop: "10px" }}>
        Prototype for comparison only. Vector basemap and 3D buildings supplied by OpenFreeMap (openmaptiles schema).
        Building extrusion uses tile <code>render_height</code> / <code>render_min_height</code> when available, with a conservative 6m (~2 storeys) fallback clearly designated as estimated display height—not measured building height.
        River geometry uses local project dataset. Facility and telemetry markers reuse project demo coordinates with explicit simulation labeling.
      </p>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: "9px",
  padding: "9px 13px",
  background: "#ffffff",
  color: "#173548",
  fontSize: "12.5px",
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.15s ease",
};