"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  INDUSTRIAL_UNITS_GEO,
  INDUSTRIAL_OUTFALLS,
  type IndustrialOutfall,
  type IndustrialUnitGeo,
} from "@/lib/digital-twin/industrial";
import {
  ENVIRONMENTAL_SENSOR_REGISTRY,
  type EnvironmentalSensor,
} from "@/lib/digital-twin/sensors";
import {
  DEFAULT_FLOW_VELOCITY_MPS,
  FLOW_VELOCITY_UNCERTAINTY,
} from "@/lib/attribution/engine";
import {
  FLOOD_SCENARIOS,
  runFloodAnalysisPipeline,
} from "@/lib/flood/engine";
import type {
  FloodScenarioPreset,
  FloodAnalysisResult,
  AffectedZoneRisk,
} from "@/lib/flood/types";
import {
  STERI_SECTORS,
  type SteriSectorDefinition,
} from "@/lib/steri/dynamic";

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

interface LinkedStation {
  sensor_id: string;
  name: string;
  designation: string;
  lat: number;
  lon: number;
  distanceMeters: number;
  travelHours: number;
}

interface ModelledPathway {
  unitId: string;
  unitName: string;
  outfallId: string;
  outfallCoords: [number, number]; // [lon, lat]
  riverSnapCoords: [number, number]; // [lon, lat]
  waterwayName: string;
  distanceToWaterwayMeters: number;
  syntheticFlowRate: number; // L/s
  syntheticPollutant: string;
  syntheticConcentration: number; // mg/L index
  pathwayStatus: "available" | "unavailable" | "unsupported";
  hasValidPath: boolean;
  invalidationReason?: string;
  linkedStations: LinkedStation[];
  unlinkedStations: Array<{ sensor_id: string; name: string; reason: string }>;
  provenance: string;
  caveat: string;
}

// Distance helper using equirectangular projection centered on Tiruppur reach
function computeDistanceMeters(a: [number, number], b: [number, number]): number {
  const r = 6371000;
  const p = Math.PI / 180;
  const dLat = (b[1] - a[1]) * p;
  const dLon = (b[0] - a[0]) * p;
  const x = dLon * Math.cos(((a[1] + b[1]) * p) / 2);
  return r * Math.hypot(dLat, x);
}

// Orthogonal projection of point P onto line segment [A, B]
function projectPointOnSegment(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): [number, number] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return a;
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return [a[0] + t * dx, a[1] + t * dy];
}

// Snaps coordinate to nearest waterway segment from local river GeoJSON network
function findNearestWaterwaySnap(
  point: [number, number],
  riverData: any
): { snap: [number, number]; distanceMeters: number; waterwayName: string } {
  let bestDist = Infinity;
  let bestSnap: [number, number] = point;
  let bestWaterwayName = "Noyyal River Network";

  if (!riverData || !Array.isArray(riverData.features)) {
    return { snap: point, distanceMeters: Infinity, waterwayName: "Unknown" };
  }

  for (const feature of riverData.features) {
    if (feature.geometry?.type !== "LineString") continue;
    const coords = feature.geometry.coordinates;
    if (!Array.isArray(coords)) continue;
    const name = feature.properties?.name || "Waterway Channel";

    for (let i = 1; i < coords.length; i++) {
      const p0 = coords[i - 1];
      const p1 = coords[i];
      if (!Array.isArray(p0) || !Array.isArray(p1)) continue;

      const proj = projectPointOnSegment(point, [p0[0], p0[1]], [p1[0], p1[1]]);
      const d = computeDistanceMeters(point, proj);
      if (d < bestDist) {
        bestDist = d;
        bestSnap = proj;
        bestWaterwayName = name;
      }
    }
  }

  return { snap: bestSnap, distanceMeters: bestDist, waterwayName: bestWaterwayName };
}

// Extracts downstream river coordinates along main channel toward linked sensor
function getDownstreamRiverReach(
  fromCoord: [number, number],
  toStationCoord: [number, number],
  riverData: any
): Array<[number, number]> | null {
  if (!riverData || !Array.isArray(riverData.features) || riverData.features.length === 0) {
    return null;
  }

  const mainFeature = riverData.features[0];
  if (mainFeature?.geometry?.type !== "LineString" || !Array.isArray(mainFeature.geometry.coordinates)) {
    return null;
  }

  const noyyalCoords: Array<[number, number]> = mainFeature.geometry.coordinates;
  let bestFrom = -1;
  let dFrom = Infinity;
  let bestTo = -1;
  let dTo = Infinity;

  noyyalCoords.forEach((pt, idx) => {
    const df = Math.hypot(pt[0] - fromCoord[0], pt[1] - fromCoord[1]);
    if (df < dFrom) {
      dFrom = df;
      bestFrom = idx;
    }
    const dt = Math.hypot(pt[0] - toStationCoord[0], pt[1] - toStationCoord[1]);
    if (dt < dTo) {
      dTo = dt;
      bestTo = idx;
    }
  });

  if (bestFrom >= 0 && bestTo >= 0 && bestFrom <= bestTo) {
    const slice = noyyalCoords.slice(bestFrom, bestTo + 1);
    return [fromCoord, ...slice, toStationCoord];
  }

  return [fromCoord, toStationCoord];
}

// Catchment proximity limit: facilities further than 2,500 m lack direct surface discharge channel in model
const MAX_OVERLAND_THRESHOLD_METERS = 2500;

function computeModelledPathway(unitId: string, riverData: any): ModelledPathway {
  const unit = INDUSTRIAL_UNITS_GEO.find((u) => u.unit_id === unitId);
  if (!unit) {
    return {
      unitId,
      unitName: "Unknown Unit",
      outfallId: "N/A",
      outfallCoords: [0, 0],
      riverSnapCoords: [0, 0],
      waterwayName: "Unknown",
      distanceToWaterwayMeters: 0,
      syntheticFlowRate: 0,
      syntheticPollutant: "None",
      syntheticConcentration: 0,
      pathwayStatus: "unsupported",
      hasValidPath: false,
      invalidationReason: "Facility record not found in industrial registry.",
      linkedStations: [],
      unlinkedStations: [],
      provenance: "Synthetic demonstration dataset",
      caveat: "No modelled discharge path exists.",
    };
  }

  const outfall = INDUSTRIAL_OUTFALLS.find((o) => o.unit_id === unitId);
  if (!outfall) {
    return {
      unitId: unit.unit_id,
      unitName: unit.name,
      outfallId: "N/A",
      outfallCoords: [unit.lon, unit.lat],
      riverSnapCoords: [unit.lon, unit.lat],
      waterwayName: "Unknown",
      distanceToWaterwayMeters: 0,
      syntheticFlowRate: 0,
      syntheticPollutant: "None",
      syntheticConcentration: 0,
      pathwayStatus: "unsupported",
      hasValidPath: false,
      invalidationReason: "No modelled outfall entry configured for this facility in the industrial layer.",
      linkedStations: [],
      unlinkedStations: [],
      provenance: "Synthetic demonstration dataset",
      caveat: "No modelled discharge path exists.",
    };
  }

  const outfallCoords: [number, number] = [outfall.lon, outfall.lat];
  const { snap, distanceMeters, waterwayName } = findNearestWaterwaySnap(outfallCoords, riverData);

  if (!Number.isFinite(distanceMeters)) {
    return {
      unitId: unit.unit_id,
      unitName: unit.name,
      outfallId: outfall.outfall_id,
      outfallCoords,
      riverSnapCoords: outfallCoords,
      waterwayName,
      distanceToWaterwayMeters: 0,
      syntheticFlowRate: outfall.flow_rate,
      syntheticPollutant: outfall.pollutant,
      syntheticConcentration: outfall.concentration,
      pathwayStatus: "unavailable",
      hasValidPath: false,
      invalidationReason: "Hydrology river network dataset is not loaded. Cannot compute modelled discharge pathway.",
      linkedStations: [],
      unlinkedStations: [],
      provenance: `${outfall.source} · OpenStreetMap Noyyal GIS network`,
      caveat: "SIMULATED / MODELLED: Missing hydrological network geometry.",
    };
  }

  // Enforce validity boundary: if outfall is beyond catchment snapping buffer, do not fabricate a route
  if (distanceMeters > MAX_OVERLAND_THRESHOLD_METERS) {
    return {
      unitId: unit.unit_id,
      unitName: unit.name,
      outfallId: outfall.outfall_id,
      outfallCoords,
      riverSnapCoords: snap,
      waterwayName,
      distanceToWaterwayMeters: Math.round(distanceMeters),
      syntheticFlowRate: outfall.flow_rate,
      syntheticPollutant: outfall.pollutant,
      syntheticConcentration: outfall.concentration,
      pathwayStatus: "unavailable",
      hasValidPath: false,
      invalidationReason: `Nearest mapped waterway is ${Math.round(distanceMeters).toLocaleString()} m away, which exceeds the model's overland discharge channel threshold (${MAX_OVERLAND_THRESHOLD_METERS.toLocaleString()} m). In accordance with scientific integrity guidelines, no fabricated overland route is drawn.`,
      linkedStations: [],
      unlinkedStations: ENVIRONMENTAL_SENSOR_REGISTRY.map((s) => ({
        sensor_id: s.sensor_id,
        name: s.name,
        reason: "Facility outfall exceeds hydrologic connection threshold; unlinked.",
      })),
      provenance: `${outfall.source} · OpenStreetMap Noyyal GIS network`,
      caveat: "SIMULATED / MODELLED LIMITATION: No direct surface outfall channel modelled beyond 2.5 km catchment buffer.",
    };
  }

  // Linked downstream monitoring stations (Noyyal flows west to east: lon increases downstream)
  const linkedStations: LinkedStation[] = [];
  const unlinkedStations: Array<{ sensor_id: string; name: string; reason: string }> = [];

  for (const station of ENVIRONMENTAL_SENSOR_REGISTRY) {
    if (station.lon > snap[0]) {
      const dStation = computeDistanceMeters(snap, [station.lon, station.lat]);
      const travelHours = Number((dStation / DEFAULT_FLOW_VELOCITY_MPS / 3600).toFixed(1));
      linkedStations.push({
        sensor_id: station.sensor_id,
        name: station.name,
        designation: station.designation,
        lat: station.lat,
        lon: station.lon,
        distanceMeters: Math.round(dStation),
        travelHours,
      });
    } else {
      unlinkedStations.push({
        sensor_id: station.sensor_id,
        name: station.name,
        reason: "Station is located upstream of the discharge confluence entry point.",
      });
    }
  }

  linkedStations.sort((a, b) => a.distanceMeters - b.distanceMeters);

  return {
    unitId: unit.unit_id,
    unitName: unit.name,
    outfallId: outfall.outfall_id,
    outfallCoords,
    riverSnapCoords: snap,
    waterwayName,
    distanceToWaterwayMeters: Math.round(distanceMeters),
    syntheticFlowRate: outfall.flow_rate,
    syntheticPollutant: outfall.pollutant,
    syntheticConcentration: outfall.concentration,
    pathwayStatus: "available",
    hasValidPath: true,
    linkedStations,
    unlinkedStations,
    provenance: `${outfall.source} · OpenStreetMap Noyyal GIS network`,
    caveat: `SIMULATED / MODELLED DISCHARGE PATHWAY: Visualisation based on vector snapping to local Noyyal GIS network and synthetic flow rates. Not a measured or calibrated pollutant transport plume. Travel velocity is an uncalibrated model parameter (${FLOW_VELOCITY_UNCERTAINTY}).`,
  };
}

// Synchronizes MapLibre GeoJSON source with current modelled pathway
function updateMapPathwaySource(
  map: MapLibreMap,
  pathway: ModelledPathway | null,
  riverData: any
) {
  const source = map.getSource("prototype-trace-pathway") as any;
  if (!source) return;

  if (!pathway || !pathway.hasValidPath) {
    source.setData({
      type: "FeatureCollection",
      features: [],
    });
    return;
  }

  const features: any[] = [];
  const unit = INDUSTRIAL_UNITS_GEO.find((u) => u.unit_id === pathway.unitId);

  // 1. Discharge Path LineString (Facility -> Outfall -> River snap point)
  if (unit) {
    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [unit.lon, unit.lat],
          pathway.outfallCoords,
          pathway.riverSnapCoords,
        ],
      },
      properties: {
        kind: "line",
        lineType: "discharge_path",
        label: "Modelled Discharge Path to River",
      },
    });
  }

  // 2. Downstream River Reach (from river snap point to nearest downstream station)
  if (pathway.linkedStations.length > 0 && riverData) {
    const primaryStation = pathway.linkedStations[0];
    const reachCoords = getDownstreamRiverReach(
      pathway.riverSnapCoords,
      [primaryStation.lon, primaryStation.lat],
      riverData
    );
    if (reachCoords && reachCoords.length >= 2) {
      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: reachCoords,
        },
        properties: {
          kind: "line",
          lineType: "downstream_reach",
          label: `Downstream reach toward ${primaryStation.name}`,
        },
      });
    }
  }

  // 3. Outfall Point
  features.push({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: pathway.outfallCoords,
    },
    properties: {
      kind: "point",
      pointType: "outfall",
      label: `Outfall ${pathway.outfallId}`,
    },
  });

  // 4. Confluence Point
  features.push({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: pathway.riverSnapCoords,
    },
    properties: {
      kind: "point",
      pointType: "confluence",
      label: `River Inflow (${pathway.waterwayName})`,
    },
  });

  // 5. Linked Downstream Station Markers (prominent target highlight rings on map)
  pathway.linkedStations.forEach((station) => {
    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [station.lon, station.lat],
      },
      properties: {
        kind: "point",
        pointType: "linked_station",
        stationId: station.sensor_id,
        label: `Linked Station: ${station.name}`,
      },
    });
  });

  source.setData({
    type: "FeatureCollection",
    features,
  });
}

// ---------------------------------------------------------------------------
// TERRAIN FLOOD EXPOSURE OVERLAY HELPERS
// ---------------------------------------------------------------------------

// Contextual OpenStreetMap building footprint counts within sector reference footprint
// Derived from public/geo/tiruppur-buildings.geojson as documented in lib/steri/dynamic.ts.
// NOTE: Footprint centroid counts provide spatial context only; not building damage, population, or flood exposure.
const OSM_BUILDING_COUNTS: Record<string, number> = {
  angeripalayam: 7,
  kasipalayam: 6,
  firka_south: 160,
  firka_north: 42,
  arulpuram: 3,
  mangalam: 0,
};

function getFloodRiskColor(riskCategory: string): string {
  switch (riskCategory) {
    case "CRITICAL":
      return "#dc2626";
    case "VERY HIGH":
      return "#ea580c";
    case "HIGH":
      return "#f97316";
    case "MODERATE":
      return "#eab308";
    case "LOW":
    default:
      return "#10b981";
  }
}

/**
 * Builds GeoJSON features for modelled sector flood-risk indicators.
 *
 * SCIENTIFIC INTEGRITY FALLBACK:
 * The underlying model provides aggregate multi-criteria risk indicators for discrete sectors.
 * It does NOT output valid geographically referenced flood polygons, raster cells, or inundation grids.
 * In accordance with scientific integrity guidelines, no synthetic flood boundary polygons are generated.
 * Sectors are represented strictly as geographic point markers at their documented coordinates.
 */
function buildFloodGeoJson(
  analysis: FloodAnalysisResult,
  selectedZoneId?: string | null
): any {
  const features: any[] = [];

  for (const zone of analysis.affectedZones) {
    const sector = STERI_SECTORS.find((s) => s.id === zone.zoneId);
    if (!sector) continue;

    const isSelected = selectedZoneId === zone.zoneId;
    const color = getFloodRiskColor(zone.riskCategory);

    // Sector-level point indicator at documented geographic coordinates
    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [sector.lon, sector.lat],
      },
      properties: {
        kind: "sector_indicator",
        id: zone.zoneId,
        name: zone.zoneName,
        elevation: zone.elevationMetersASL,
        slope: zone.slopeDegrees,
        riverDist: zone.riverProximityMeters,
        accumulationDepth: zone.accumulationDepthMeters,
        floodRiskScore: zone.floodRiskScore,
        riskCategory: zone.riskCategory,
        color,
        isSelected: isSelected ? "true" : "false",
      },
    });
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

function updateMapFloodSource(
  map: MapLibreMap,
  analysis: FloodAnalysisResult | null,
  selectedZoneId?: string | null
) {
  const source = map.getSource("prototype-flood-zones") as any;
  if (!source) return;

  if (!analysis) {
    source.setData({
      type: "FeatureCollection",
      features: [],
    });
    return;
  }

  source.setData(buildFloodGeoJson(analysis, selectedZoneId));
}

export default function TerrainMapPrototypePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  const [status, setStatus] = useState("Preparing map...");
  const [is3D, setIs3D] = useState(true);
  const is3DRef = useRef(is3D);
  const [activePreset, setActivePreset] = useState<"overview" | "detail" | null>("overview");
  const [showRiver, setShowRiver] = useState(true);
  const [showIndustry, setShowIndustry] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);

  // Pollution pathway tracing state
  const [isTracingActive, setIsTracingActive] = useState(false);
  const isTracingActiveRef = useRef(isTracingActive);
  const [tracedFacilityId, setTracedFacilityId] = useState<string | null>(null);
  const [modelledPathway, setModelledPathway] = useState<ModelledPathway | null>(null);
  const riverDataRef = useRef<any>(null);

  // Flood Exposure mode state
  const [isFloodModeActive, setIsFloodModeActive] = useState(false);
  const isFloodModeActiveRef = useRef(isFloodModeActive);
  const [floodScenarioPreset, setFloodScenarioPreset] = useState<FloodScenarioPreset>("HEAVY_RAIN");
  const floodScenarioPresetRef = useRef(floodScenarioPreset);
  const [selectedFloodZoneId, setSelectedFloodZoneId] = useState<string | null>("kasipalayam");
  const selectedFloodZoneIdRef = useRef(selectedFloodZoneId);
  const [floodAnalysis, setFloodAnalysis] = useState<FloodAnalysisResult>(() =>
    runFloodAnalysisPipeline("HEAVY_RAIN")
  );
  const floodAnalysisRef = useRef(floodAnalysis);
  const [activePanelTab, setActivePanelTab] = useState<"entity" | "flood">("entity");

  useEffect(() => {
    isTracingActiveRef.current = isTracingActive;
  }, [isTracingActive]);

  useEffect(() => {
    isFloodModeActiveRef.current = isFloodModeActive;
  }, [isFloodModeActive]);

  useEffect(() => {
    floodScenarioPresetRef.current = floodScenarioPreset;
  }, [floodScenarioPreset]);

  useEffect(() => {
    selectedFloodZoneIdRef.current = selectedFloodZoneId;
  }, [selectedFloodZoneId]);

  useEffect(() => {
    floodAnalysisRef.current = floodAnalysis;
  }, [floodAnalysis]);

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

        map.on("moveend", () => {
          if (!active || !map) return;
          const z = map.getZoom();
          if (z >= 15.5) {
            setActivePreset("detail");
          } else if (z <= 14.2) {
            setActivePreset("overview");
          } else {
            setActivePreset(null);
          }
        });

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
            // Ensures buildings are visibly raised in 3D perspective with safe type coercion and clear display height fallback
            const safeHeightExpr: any = [
              "case",
              [">", ["to-number", ["get", "render_height"], 0], 0],
              ["max", 12, ["to-number", ["get", "render_height"], 0]],
              16, // Illustrative estimated display height fallback (~4-5 storeys) to ensure unmeasured footprints are visibly raised in 3D view
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
              12,
              "#cbd5e1",
              16,
              "#94a3b8",
              25,
              "#64748b",
              40,
              "#475569",
            ];

            if (activeMap.getSource("openmaptiles")) {
              // Re-create building-3d layer cleanly before labels to ensure fresh bucket generation in web worker
              if (activeMap.getLayer("building-3d")) {
                activeMap.removeLayer("building-3d");
              }

              // Set directional lighting for distinct sun-angle contrast on extruded building walls
              try {
                activeMap.setLight({
                  anchor: "viewport",
                  color: "#ffffff",
                  intensity: 0.45,
                  position: [1.15, 210, 30],
                });
              } catch {
                // Ignore if unsupported
              }

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
                    "fill-extrusion-opacity": 0.88,
                    "fill-extrusion-vertical-gradient": true,
                  },
                } as any,
                firstLabel
              );

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
                riverDataRef.current = riverData;
                if (!activeMap.getSource("prototype-noyyal-river")) {
                  activeMap.addSource("prototype-noyyal-river", {
                    type: "geojson",
                    data: riverData,
                  });
                }

                if (!activeMap.getLayer("prototype-noyyal-river-glow")) {
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
                }

                if (!activeMap.getLayer("prototype-noyyal-river-core")) {
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

            if (!activeMap.getSource("prototype-industrial-units")) {
              activeMap.addSource("prototype-industrial-units", {
                type: "geojson",
                data: {
                  type: "FeatureCollection",
                  features: industrialFeatures,
                },
              });
            }

            if (!activeMap.getLayer("prototype-industrial-glow")) {
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
            }

            if (!activeMap.getLayer("prototype-industrial-core")) {
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
            }

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

            if (!activeMap.getSource("prototype-monitoring-stations")) {
              activeMap.addSource("prototype-monitoring-stations", {
                type: "geojson",
                data: {
                  type: "FeatureCollection",
                  features: stationFeatures,
                },
              });
            }

            if (!activeMap.getLayer("prototype-stations-glow")) {
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
            }

            if (!activeMap.getLayer("prototype-stations-core")) {
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
            }

            // 4. Modelled Pollution Discharge Pathway Layers
            if (!activeMap.getSource("prototype-trace-pathway")) {
              activeMap.addSource("prototype-trace-pathway", {
                type: "geojson",
                data: {
                  type: "FeatureCollection",
                  features: [],
                },
              });
            }

            // Downstream channel reach glow (amber halo along river to station)
            if (!activeMap.getLayer("prototype-trace-reach-glow")) {
              activeMap.addLayer(
                {
                  id: "prototype-trace-reach-glow",
                  type: "line",
                  source: "prototype-trace-pathway",
                  filter: ["==", ["get", "lineType"], "downstream_reach"],
                  layout: {
                    "line-join": "round",
                    "line-cap": "round",
                  },
                  paint: {
                    "line-color": "#fbbf24",
                    "line-width": 8,
                    "line-opacity": 0.45,
                    "line-blur": 3,
                  },
                },
                firstLabel
              );
            }

            // Downstream channel reach core line
            if (!activeMap.getLayer("prototype-trace-reach-core")) {
              activeMap.addLayer(
                {
                  id: "prototype-trace-reach-core",
                  type: "line",
                  source: "prototype-trace-pathway",
                  filter: ["==", ["get", "lineType"], "downstream_reach"],
                  layout: {
                    "line-join": "round",
                    "line-cap": "round",
                  },
                  paint: {
                    "line-color": "#f59e0b",
                    "line-width": 3,
                    "line-opacity": 0.9,
                  },
                },
                firstLabel
              );
            }

            // Discharge path glow (crimson / orange halo)
            if (!activeMap.getLayer("prototype-trace-discharge-glow")) {
              activeMap.addLayer(
                {
                  id: "prototype-trace-discharge-glow",
                  type: "line",
                  source: "prototype-trace-pathway",
                  filter: ["==", ["get", "lineType"], "discharge_path"],
                  layout: {
                    "line-join": "round",
                    "line-cap": "round",
                  },
                  paint: {
                    "line-color": "#ea580c",
                    "line-width": 10,
                    "line-opacity": 0.5,
                    "line-blur": 3,
                  },
                },
                firstLabel
              );
            }

            // Discharge path core (dashed crimson conduit)
            if (!activeMap.getLayer("prototype-trace-discharge-core")) {
              activeMap.addLayer(
                {
                  id: "prototype-trace-discharge-core",
                  type: "line",
                  source: "prototype-trace-pathway",
                  filter: ["==", ["get", "lineType"], "discharge_path"],
                  layout: {
                    "line-join": "round",
                    "line-cap": "round",
                  },
                  paint: {
                    "line-color": "#dc2626",
                    "line-width": 3.5,
                    "line-dasharray": [2, 1.5],
                  },
                },
                firstLabel
              );
            }

            // Linked downstream monitoring station highlight halo
            if (!activeMap.getLayer("prototype-trace-station-highlight")) {
              activeMap.addLayer(
                {
                  id: "prototype-trace-station-highlight",
                  type: "circle",
                  source: "prototype-trace-pathway",
                  filter: ["==", ["get", "pointType"], "linked_station"],
                  paint: {
                    "circle-color": "#06b6d4",
                    "circle-radius": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      10,
                      9,
                      14,
                      16,
                      17,
                      22,
                    ],
                    "circle-opacity": 0.28,
                    "circle-stroke-color": "#22d3ee",
                    "circle-stroke-width": 2.5,
                  },
                },
                firstLabel
              );
            }

            // Outfall point marker
            if (!activeMap.getLayer("prototype-trace-outfall-marker")) {
              activeMap.addLayer(
                {
                  id: "prototype-trace-outfall-marker",
                  type: "circle",
                  source: "prototype-trace-pathway",
                  filter: ["==", ["get", "pointType"], "outfall"],
                  paint: {
                    "circle-color": "#f97316",
                    "circle-radius": 6.5,
                    "circle-stroke-color": "#ffffff",
                    "circle-stroke-width": 2,
                  },
                },
                firstLabel
              );
            }

            // Confluence point marker at river entry
            if (!activeMap.getLayer("prototype-trace-confluence-marker")) {
              activeMap.addLayer(
                {
                  id: "prototype-trace-confluence-marker",
                  type: "circle",
                  source: "prototype-trace-pathway",
                  filter: ["==", ["get", "pointType"], "confluence"],
                  paint: {
                    "circle-color": "#dc2626",
                    "circle-radius": 7.5,
                    "circle-stroke-color": "#ffffff",
                    "circle-stroke-width": 2.5,
                  },
                },
                firstLabel
              );
            }

            // 5. Modelled Flood Exposure & Risk Zones Layers
            const initialFloodAnalysis = runFloodAnalysisPipeline(floodScenarioPresetRef.current);
            if (!activeMap.getSource("prototype-flood-zones")) {
              activeMap.addSource("prototype-flood-zones", {
                type: "geojson",
                data: buildFloodGeoJson(
                  initialFloodAnalysis,
                  selectedFloodZoneIdRef.current
                ),
              });
            }

            // Sector-level point indicators (ambient glow ring and distinct core marker)
            if (!activeMap.getLayer("prototype-flood-marker-glow")) {
              activeMap.addLayer(
                {
                  id: "prototype-flood-marker-glow",
                  type: "circle",
                  source: "prototype-flood-zones",
                  layout: {
                    visibility: isFloodModeActiveRef.current ? "visible" : "none",
                  },
                  paint: {
                    "circle-color": ["get", "color"],
                    "circle-radius": [
                      "case",
                      ["==", ["get", "isSelected"], "true"],
                      18,
                      12,
                    ],
                    "circle-opacity": 0.28,
                  },
                },
                firstLabel
              );
            }

            if (!activeMap.getLayer("prototype-flood-marker-core")) {
              activeMap.addLayer(
                {
                  id: "prototype-flood-marker-core",
                  type: "circle",
                  source: "prototype-flood-zones",
                  layout: {
                    visibility: isFloodModeActiveRef.current ? "visible" : "none",
                  },
                  paint: {
                    "circle-color": ["get", "color"],
                    "circle-radius": [
                      "case",
                      ["==", ["get", "isSelected"], "true"],
                      8.5,
                      6,
                    ],
                    "circle-stroke-color": "#ffffff",
                    "circle-stroke-width": 2,
                    "circle-opacity": 0.95,
                  },
                },
                firstLabel
              );
            }

            if (!activeMap.getLayer("prototype-flood-label")) {
              activeMap.addLayer(
                {
                  id: "prototype-flood-label",
                  type: "symbol",
                  source: "prototype-flood-zones",
                  layout: {
                    "text-field": [
                      "concat",
                      ["get", "name"],
                      "\n",
                      ["get", "riskCategory"],
                      " (",
                      ["to-string", ["round", ["*", ["to-number", ["get", "floodRiskScore"], 0], 100]]],
                      "%)",
                    ],
                    "text-size": 11,
                    "text-offset": [0, 1.4],
                    "text-anchor": "top",
                    visibility: isFloodModeActiveRef.current ? "visible" : "none",
                  },
                  paint: {
                    "text-color": "#0f172a",
                    "text-halo-color": "#ffffff",
                    "text-halo-width": 2,
                  },
                },
                firstLabel
              );
            }

            // Click handling for sector-level modelled flood risk indicators
            activeMap.on("click", "prototype-flood-marker-core", (e) => {
              if (!e.features || !e.features[0]) return;
              const p = e.features[0].properties as any;
              selectFloodZone(p.id, false);
            });

            activeMap.on("click", "prototype-flood-marker-glow", (e) => {
              if (!e.features || !e.features[0]) return;
              const p = e.features[0].properties as any;
              selectFloodZone(p.id, false);
            });

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

              if (isTracingActiveRef.current) {
                traceFacility(p.id);
              }
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

            // Click handling for highlighted linked monitoring stations
            activeMap.on("click", "prototype-trace-station-highlight", (e) => {
              if (!e.features || !e.features[0]) return;
              const p = e.features[0].properties as any;
              const station = ENVIRONMENTAL_SENSOR_REGISTRY.find(
                (s) => s.sensor_id === p.stationId
              );
              if (station) {
                setSelectedEntity({
                  category: "station",
                  id: station.sensor_id,
                  streamId: station.stream_id,
                  name: station.name,
                  designation: station.designation,
                  lat: station.lat,
                  lon: station.lon,
                  ph: Number(station.ph),
                  ec: Number(station.ec),
                  turbidity: Number(station.turbidity),
                  flow: Number(station.flow),
                  sourceType: station.sourceType,
                  source: station.source,
                });
              }
            });

            // Pointer cursor on hover over interactive markers
            [
              "prototype-industrial-core",
              "prototype-stations-core",
              "prototype-trace-discharge-core",
              "prototype-trace-reach-core",
              "prototype-trace-station-highlight",
              "prototype-trace-outfall-marker",
              "prototype-trace-confluence-marker",
              "prototype-flood-marker-core",
              "prototype-flood-marker-glow",
            ].forEach((layerId) => {
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
                layers: [
                  "prototype-industrial-core",
                  "prototype-stations-core",
                  "prototype-trace-discharge-core",
                  "prototype-trace-station-highlight",
                  "prototype-trace-outfall-marker",
                  "prototype-trace-confluence-marker",
                  "prototype-flood-marker-core",
                  "prototype-flood-marker-glow",
                ].filter((id) => activeMap.getLayer(id) !== undefined),
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

      const currentZoom = map.getZoom();
      const targetPitch = nextIs3D ? (currentZoom >= 15 ? 60 : 52) : 0;
      const targetBearing = nextIs3D ? (currentZoom >= 15 ? -20 : -18) : 0;

      map.easeTo({
        pitch: targetPitch,
        bearing: targetBearing,
        duration: 700,
      });
    }
  }

  function goToCityOverview() {
    setActivePreset("overview");
    const map = mapRef.current;
    if (!map) return;

    map.flyTo({
      center: [77.3411, 11.1085],
      zoom: 13.5,
      pitch: is3D ? 48 : 0,
      bearing: is3D ? -18 : 0,
      duration: 1200,
      essential: true,
    });
  }

  function goToUrbanDetail() {
    setActivePreset("detail");
    const map = mapRef.current;
    if (!map) return;

    map.flyTo({
      center: [77.3411, 11.1085],
      zoom: 16.5,
      pitch: is3D ? 60 : 0,
      bearing: is3D ? -20 : 0,
      duration: 1200,
      essential: true,
    });
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

  function traceFacility(unitId: string) {
    const map = mapRef.current;
    const riverData = riverDataRef.current;
    setIsTracingActive(true);
    isTracingActiveRef.current = true;
    setTracedFacilityId(unitId);

    // Ensure relevant environmental layers are visible on the map
    if (!showIndustry) {
      setShowIndustry(true);
      if (map) {
        for (const id of ["prototype-industrial-glow", "prototype-industrial-core"]) {
          if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "visible");
        }
      }
    }
    if (!showRiver) {
      setShowRiver(true);
      if (map) {
        for (const id of ["prototype-noyyal-river-glow", "prototype-noyyal-river-core"]) {
          if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "visible");
        }
      }
    }

    const pathway = computeModelledPathway(unitId, riverData);
    setModelledPathway(pathway);

    if (map) {
      updateMapPathwaySource(map, pathway, riverData);
    }

    if (pathway.hasValidPath) {
      setStatus(
        `Tracing ${pathway.unitName} · Modelled discharge ${pathway.distanceToWaterwayMeters}m to ${pathway.waterwayName} · ${pathway.linkedStations.length} linked downstream station(s)`
      );
    } else {
      setStatus(
        `Tracing ${pathway.unitName} · Pathway ${pathway.pathwayStatus.toUpperCase()}: ${pathway.invalidationReason || "No valid modelled discharge path available"}`
      );
    }
  }

  function clearTracing() {
    setIsTracingActive(false);
    isTracingActiveRef.current = false;
    setTracedFacilityId(null);
    setModelledPathway(null);

    const map = mapRef.current;
    if (map) {
      updateMapPathwaySource(map, null, null);
    }
    setStatus("Pathway tracing cleared · All standard layers active");
  }

  function selectAndTrace(unitId: string) {
    const unit = INDUSTRIAL_UNITS_GEO.find((u) => u.unit_id === unitId);
    if (!unit) return;

    setSelectedEntity({
      category: "industrial",
      id: unit.unit_id,
      name: unit.name,
      type: unit.type,
      status: unit.status,
      lat: unit.lat,
      lon: unit.lon,
      reuse: unit.reuse,
      flow: unit.flow,
      sourceType: unit.sourceType,
      source: unit.source,
    });

    traceFacility(unitId);
  }

  function toggleTracePollution() {
    if (isTracingActive) {
      clearTracing();
    } else {
      if (selectedEntity && selectedEntity.category === "industrial") {
        traceFacility(selectedEntity.id);
      } else {
        // Start tracing with central representative unit_004
        selectAndTrace("unit_004");
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

    if (!nextVisible) {
      if (selectedEntity?.category === "industrial") {
        setSelectedEntity(null);
      }
      if (isTracingActive) {
        clearTracing();
      }
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
    setActivePreset("overview");
    mapRef.current?.easeTo({
      center: [77.3411, 11.1085],
      zoom: 13.5,
      pitch: is3D ? 52 : 0,
      bearing: is3D ? -18 : 0,
      duration: 700,
    });
  }

  function toggleFloodMode() {
    const nextActive = !isFloodModeActive;
    setIsFloodModeActive(nextActive);
    isFloodModeActiveRef.current = nextActive;

    const map = mapRef.current;
    if (map) {
      const visibility = nextActive ? "visible" : "none";
      for (const layerId of [
        "prototype-flood-marker-glow",
        "prototype-flood-marker-core",
        "prototype-flood-label",
      ]) {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, "visibility", visibility);
        }
      }

      if (nextActive) {
        updateMapFloodSource(
          map,
          floodAnalysisRef.current,
          selectedFloodZoneIdRef.current
        );
        setActivePanelTab("flood");
        const analysis = floodAnalysisRef.current;
        setStatus(
          `Flood Exposure mode active · Sector-level modelled risk indicators (${analysis.affectedZones.length} points) · Scenario: ${floodScenarioPresetRef.current.replace("_", " ")} (${analysis.scenario.rainfallMmDay} mm/day) · Not an inundation map`
        );
      } else {
        if (selectedEntity) {
          setActivePanelTab("entity");
        }
        setStatus("Flood Exposure mode deactivated · Returned to standard investigation map");
      }
    }
  }

  function changeFloodScenario(preset: FloodScenarioPreset) {
    setFloodScenarioPreset(preset);
    floodScenarioPresetRef.current = preset;
    const analysis = runFloodAnalysisPipeline(preset);
    setFloodAnalysis(analysis);
    floodAnalysisRef.current = analysis;

    const map = mapRef.current;
    if (map) {
      updateMapFloodSource(map, analysis, selectedFloodZoneIdRef.current);
    }
    setStatus(
      `Flood Exposure: ${preset.replace("_", " ")} scenario (${analysis.scenario.rainfallMmDay} mm/day) · Sector-level risk indicators updated · Not an inundation map`
    );
  }

  function selectFloodZone(zoneId: string, flyToCenter = true) {
    setSelectedFloodZoneId(zoneId);
    selectedFloodZoneIdRef.current = zoneId;
    setActivePanelTab("flood");

    const map = mapRef.current;
    if (map) {
      updateMapFloodSource(map, floodAnalysisRef.current, zoneId);

      if (flyToCenter) {
        const sector = STERI_SECTORS.find((s) => s.id === zoneId);
        if (sector) {
          map.easeTo({
            center: [sector.lon, sector.lat],
            duration: 600,
          });
        }
      }
    }

    const zone = floodAnalysisRef.current.affectedZones.find((z) => z.zoneId === zoneId);
    if (zone) {
      setStatus(
        `Selected Sector Indicator: ${zone.zoneName} · Modelled Risk: ${zone.riskCategory} (${Math.round(zone.floodRiskScore * 100)}%) · Modelled Accumulation Index: ${zone.accumulationDepthMeters}m (uncalibrated)`
      );
    }
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
            NOYYALSENSE · ENVIRONMENTAL DIGITAL TWIN
          </div>

          <h1
            style={{
              margin: "5px 0",
              fontSize: "24px",
              fontWeight: 800,
            }}
          >
            Tiruppur Environmental Investigation Map
          </h1>

          <p style={{ margin: 0, fontSize: "13px", color: "#526477" }}>
            OpenFreeMap basemap · 3D Buildings (openmaptiles) · Noyyal River GeoJSON · 12 Simulated Facilities · 3 Monitoring Stations
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={toggleView}
            style={buttonStyle}
            title="Toggle between 3D oblique perspective with building extrusions and 2D flat top-down view"
          >
            {is3D ? "● 3D Buildings: Extruded" : "○ 2D Buildings: Flat"}
          </button>

          <button
            onClick={goToCityOverview}
            style={{
              ...buttonStyle,
              background: activePreset === "overview" ? "#f0fdf4" : "#ffffff",
              borderColor: activePreset === "overview" ? "#16a34a" : "#cbd5e1",
              color: activePreset === "overview" ? "#15803d" : "#173548",
            }}
            title="City Overview: moderate zoom (13.5) with road network and surrounding context"
          >
            🏙️ City Overview
          </button>

          <button
            onClick={goToUrbanDetail}
            style={{
              ...buttonStyle,
              background: activePreset === "detail" ? "#f0fdf4" : "#ffffff",
              borderColor: activePreset === "detail" ? "#16a34a" : "#cbd5e1",
              color: activePreset === "detail" ? "#15803d" : "#173548",
            }}
            title="Urban Detail: close zoom (16.5) with 60° pitch to inspect 3D building extrusions"
          >
            🏢 Urban Detail
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

          <button
            onClick={toggleTracePollution}
            style={{
              ...buttonStyle,
              background: isTracingActive ? "#fef2f2" : "#ffffff",
              borderColor: isTracingActive ? "#ef4444" : "#cbd5e1",
              color: isTracingActive ? "#b91c1c" : "#173548",
            }}
            title="Toggle pollution discharge pathway tracing from facility to river"
          >
            {isTracingActive ? "⚡ Trace: Active" : "⚡ Trace Pollution"}
          </button>

          {isTracingActive && (
            <button
              onClick={clearTracing}
              style={{
                ...buttonStyle,
                background: "#ffffff",
                borderColor: "#fca5a5",
                color: "#b91c1c",
              }}
              title="Clear active pollution pathway trace"
            >
              ✕ Clear Trace
            </button>
          )}

          <button
            onClick={toggleFloodMode}
            style={{
              ...buttonStyle,
              background: isFloodModeActive ? "#eff6ff" : "#ffffff",
              borderColor: isFloodModeActive ? "#2563eb" : "#cbd5e1",
              color: isFloodModeActive ? "#1d4ed8" : "#173548",
            }}
            title="Toggle terrain-based modelled Flood Exposure & Risk overlay across Tiruppur sectors"
          >
            {isFloodModeActive ? "🌊 Flood Exposure: Active" : "🌊 Flood Exposure"}
          </button>

          {isFloodModeActive && (
            <button
              onClick={toggleFloodMode}
              style={{
                ...buttonStyle,
                background: "#ffffff",
                borderColor: "#bfdbfe",
                color: "#1d4ed8",
              }}
              title="Deactivate flood exposure mode and return to standard investigation map"
            >
              ✕ Exit Flood
            </button>
          )}

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

        {/* Right-Hand Panel: Flood Exposure Analysis or Selected Entity Details */}
        {(selectedEntity || isFloodModeActive) && (
          <div
            role="region"
            aria-label={
              activePanelTab === "flood" || (!selectedEntity && isFloodModeActive)
                ? "Flood Exposure Analysis"
                : "Selected Feature Details"
            }
            style={{
              position: "absolute",
              top: "16px",
              right: "60px",
              width: "360px",
              maxWidth: "calc(100% - 80px)",
              maxHeight: "calc(100vh - 250px)",
              overflowY: "auto",
              background: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 10px 30px rgba(15,23,42,0.2)",
              border: `1.5px solid ${
                (activePanelTab === "flood" && isFloodModeActive) || (!selectedEntity && isFloodModeActive)
                  ? "#2563eb"
                  : selectedEntity?.category === "industrial"
                  ? "#f97316"
                  : "#06b6d4"
              }`,
              padding: "16px",
              zIndex: 20,
            }}
          >
            {/* If BOTH an entity is selected AND flood mode is active, show Tab switcher */}
            {selectedEntity && isFloodModeActive && (
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  marginBottom: "12px",
                  borderBottom: "1px solid #e2e8f0",
                  paddingBottom: "8px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setActivePanelTab("flood")}
                  style={{
                    ...buttonStyle,
                    flex: 1,
                    padding: "6px 8px",
                    fontSize: "11px",
                    background: activePanelTab === "flood" ? "#eff6ff" : "#ffffff",
                    borderColor: activePanelTab === "flood" ? "#2563eb" : "#cbd5e1",
                    color: activePanelTab === "flood" ? "#1d4ed8" : "#64748b",
                    textAlign: "center",
                  }}
                >
                  🌊 Flood Exposure
                </button>
                <button
                  type="button"
                  onClick={() => setActivePanelTab("entity")}
                  style={{
                    ...buttonStyle,
                    flex: 1,
                    padding: "6px 8px",
                    fontSize: "11px",
                    background: activePanelTab === "entity" ? "#fff7ed" : "#ffffff",
                    borderColor: activePanelTab === "entity" ? "#f97316" : "#cbd5e1",
                    color: activePanelTab === "entity" ? "#c2410c" : "#64748b",
                    textAlign: "center",
                  }}
                >
                  {selectedEntity.category === "industrial" ? "🏭 Facility" : "📡 Station"}
                </button>
              </div>
            )}

            {/* TAB 1: FLOOD EXPOSURE ANALYSIS */}
            {(activePanelTab === "flood" || (!selectedEntity && isFloodModeActive)) && (
              <div>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "3px 8px",
                      borderRadius: "5px",
                      fontSize: "10px",
                      fontWeight: 800,
                      letterSpacing: "0.5px",
                      background: "#dbeafe",
                      color: "#1e40af",
                    }}
                  >
                    MODELLED FLOOD RISK INDICATOR
                  </span>

                  <button
                    type="button"
                    onClick={toggleFloodMode}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "16px",
                      fontWeight: 700,
                      color: "#94a3b8",
                      cursor: "pointer",
                      padding: "0 4px",
                    }}
                    title="Exit Flood Exposure mode"
                    aria-label="Exit Flood Mode"
                  >
                    ✕
                  </button>
                </div>

                <div style={{ marginTop: "8px", fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                  Sector-Level Flood Risk Analysis
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  Modelled Topographic Risk Indicators · 6 Sector Assessment Points
                </div>

                {/* Scenario Selector */}
                <div style={{ marginTop: "12px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "5px" }}>
                    Rainfall & Hydrologic Scenario
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" }}>
                    {(["BASELINE", "MODERATE_RAIN", "HEAVY_RAIN", "EXTREME_RAIN"] as FloodScenarioPreset[]).map((preset) => {
                      const isSel = floodScenarioPreset === preset;
                      const label =
                        preset === "BASELINE"
                          ? "Dry (0 mm)"
                          : preset === "MODERATE_RAIN"
                          ? "Moderate (50 mm)"
                          : preset === "HEAVY_RAIN"
                          ? "Heavy (150 mm)"
                          : "Extreme (250 mm)";
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => changeFloodScenario(preset)}
                          style={{
                            ...buttonStyle,
                            padding: "6px 7px",
                            fontSize: "10.5px",
                            textAlign: "center",
                            background: isSel ? "#eff6ff" : "#ffffff",
                            borderColor: isSel ? "#2563eb" : "#cbd5e1",
                            color: isSel ? "#1d4ed8" : "#334155",
                            fontWeight: isSel ? 800 : 600,
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "5px", fontStyle: "italic", lineHeight: "1.35" }}>
                    {floodAnalysis.scenario.description}
                  </div>
                </div>

                {/* Citywide Summary Tiles */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "6px",
                    marginTop: "12px",
                    padding: "8px",
                    background: "#f8fafc",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "9px", color: "#64748b", textTransform: "uppercase" }}>Peak Index</div>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>
                      {floodAnalysis.citywideMaxAccumulationMeters} m
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", color: "#64748b", textTransform: "uppercase" }}>High Risk</div>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#ea580c" }}>
                      {floodAnalysis.highRiskZonesCount} / {floodAnalysis.affectedZones.length}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", color: "#64748b", textTransform: "uppercase" }}>River Flow</div>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#0284c7" }}>
                      {floodAnalysis.scenario.riverFlowM3s} m³/s
                    </div>
                  </div>
                </div>

                {/* Catchment Sectors Selector */}
                <div style={{ marginTop: "12px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "5px" }}>
                    Select Sector Assessment Point ({floodAnalysis.affectedZones.length})
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {floodAnalysis.affectedZones.map((zone) => {
                      const isSel = zone.zoneId === selectedFloodZoneId;
                      const riskColor = getFloodRiskColor(zone.riskCategory);
                      return (
                        <button
                          key={zone.zoneId}
                          type="button"
                          onClick={() => selectFloodZone(zone.zoneId, true)}
                          style={{
                            ...buttonStyle,
                            padding: "4px 7px",
                            fontSize: "10px",
                            background: isSel ? "#f1f5f9" : "#ffffff",
                            borderColor: isSel ? riskColor : "#e2e8f0",
                            borderWidth: isSel ? "1.5px" : "1px",
                            color: "#1e293b",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              width: "7px",
                              height: "7px",
                              borderRadius: "50%",
                              background: riskColor,
                            }}
                          />
                          {zone.zoneName.replace(" Sector", "").replace(" Plain", "").replace(" Foothills", "").replace(" Trough", "")}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Sector Details */}
                {(() => {
                  const currentZone =
                    floodAnalysis.affectedZones.find((z) => z.zoneId === selectedFloodZoneId) ||
                    floodAnalysis.affectedZones[0];
                  if (!currentZone) return null;
                  const riskColor = getFloodRiskColor(currentZone.riskCategory);
                  const osmCount = OSM_BUILDING_COUNTS[currentZone.zoneId] ?? 0;

                  return (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "11px",
                        borderRadius: "8px",
                        background: "#ffffff",
                        border: `1.5px solid ${riskColor}`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "12.5px", fontWeight: 800, color: "#0f172a" }}>
                          {currentZone.zoneName}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 800,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: `${riskColor}18`,
                            color: riskColor,
                            border: `1px solid ${riskColor}40`,
                          }}
                        >
                          {currentZone.riskCategory} ({Math.round(currentZone.floodRiskScore * 100)}%)
                        </span>
                      </div>

                      {/* Topographic parameters */}
                      <div style={{ marginTop: "8px", fontSize: "11.5px", lineHeight: "1.5", color: "#334155" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Nominal Elevation:</span>
                          <strong>{currentZone.elevationMetersASL} m ASL (nominal profile)</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Terrain Slope:</span>
                          <strong>{currentZone.slopeDegrees}° (profile constant)</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Distance to River:</span>
                          <strong>{currentZone.riverProximityMeters} m</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "3px", paddingTop: "3px", borderTop: "1px dashed #e2e8f0" }}>
                          <span>Modelled Accumulation Index:</span>
                          <strong style={{ color: riskColor, fontSize: "12px" }}>
                            {currentZone.accumulationDepthMeters} m
                          </strong>
                        </div>
                      </div>

                      {/* Supporting Datasets: Buildings & Infrastructure */}
                      <div style={{ marginTop: "9px", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
                        <div style={{ fontSize: "10px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                          Supporting Spatial Datasets
                        </div>

                        {/* OSM Building count */}
                        <div style={{ marginTop: "4px", fontSize: "11px", color: "#1e293b" }}>
                          <strong>OSM Building Reference Count:</strong>{" "}
                          <span style={{ color: "#0369a1", fontWeight: 700 }}>
                            {osmCount} buildings mapped
                          </span>
                          <div style={{ fontSize: "9.5px", color: "#64748b", marginTop: "1px" }}>
                            Vector building centroid count within sector reference radius for spatial context. This is NOT a flood boundary, structural damage estimate, or population exposure calculation.
                          </div>
                        </div>

                        {/* Affected Infrastructure Tags */}
                        {currentZone.estimatedAffectedInfrastructure.length > 0 && (
                          <div style={{ marginTop: "6px" }}>
                            <div style={{ fontSize: "10px", color: "#475569", fontWeight: 600 }}>
                              Infrastructure in Proximity:
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", marginTop: "3px" }}>
                              {currentZone.estimatedAffectedInfrastructure.map((item, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    fontSize: "9.5px",
                                    padding: "2px 5px",
                                    borderRadius: "3px",
                                    background: "#f1f5f9",
                                    color: "#334155",
                                    border: "1px solid #e2e8f0",
                                  }}
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Inspection segments & citizen complaints */}
                        <div style={{ marginTop: "6px", display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: "#475569" }}>
                          <span>Municipal Inspections:</span>
                          <strong>{currentZone.inspectionSegmentsRequired.join(", ")}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: "#475569" }}>
                          <span>Citizen Drainage Complaints:</span>
                          <strong>{currentZone.nearbyCitizenComplaintsCount} registered</strong>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Scientific Integrity Disclaimer */}
                <div
                  style={{
                    marginTop: "12px",
                    padding: "9px 11px",
                    borderRadius: "6px",
                    background: "#fffbeb",
                    border: "1px solid #fef3c7",
                    fontSize: "10.5px",
                    color: "#92400e",
                    lineHeight: "1.4",
                  }}
                >
                  <strong style={{ display: "block", marginBottom: "3px" }}>
                    ⚠️ Scientific Integrity & Provenance Notice:
                  </strong>
                  This overlay displays <strong>sector-level modelled risk indicators</strong> at discrete assessment points. It is <strong>NOT an inundation map or validated flood forecast</strong>.
                  Elevations and slopes are nominal sector profile estimates from baseline parameters, not real-time or measured 30 m DEM raster grids.
                  The calculation applies steady-state multi-criteria weighting (rainfall, slope, proximity to Noyyal channel). It does not compute hydrodynamic 2D shallow water equations, flood boundaries, inundation depths, or structural damage estimates.
                </div>

                {/* Action button */}
                <div style={{ marginTop: "12px" }}>
                  <button
                    onClick={toggleFloodMode}
                    style={{
                      ...buttonStyle,
                      width: "100%",
                      background: "#f8fafc",
                      borderColor: "#cbd5e1",
                      color: "#475569",
                      fontSize: "11.5px",
                      padding: "7px 10px",
                    }}
                  >
                    ✕ Turn Off Flood Exposure
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: SELECTED ENTITY VIEW */}
            {activePanelTab === "entity" && selectedEntity && (
              <div>
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

                {/* Industrial facility: Trace pathway button */}
                {selectedEntity.category === "industrial" && (
                  <div style={{ marginTop: "10px" }}>
                    {isTracingActive && tracedFacilityId === selectedEntity.id ? (
                      <button
                        onClick={clearTracing}
                        style={{
                          ...buttonStyle,
                          width: "100%",
                          background: "#fef2f2",
                          borderColor: "#fca5a5",
                          color: "#b91c1c",
                          fontSize: "12px",
                          padding: "8px 10px",
                        }}
                      >
                        ✕ Clear Modelled Pathway Trace
                      </button>
                    ) : (
                      <button
                        onClick={() => traceFacility(selectedEntity.id)}
                        style={{
                          ...buttonStyle,
                          width: "100%",
                          background: "#fff7ed",
                          borderColor: "#fdba74",
                          color: "#c2410c",
                          fontSize: "12px",
                          padding: "8px 10px",
                        }}
                      >
                        ⚡ Trace Modelled Pathway toward River
                      </button>
                    )}
                  </div>
                )}

                {/* Active Modelled Pathway Section */}
                {isTracingActive && tracedFacilityId === selectedEntity.id && modelledPathway && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "11px 12px",
                      borderRadius: "8px",
                      background: modelledPathway.hasValidPath ? "#fef7ee" : "#fff1f2",
                      border: `1.5px solid ${modelledPathway.hasValidPath ? "#f97316" : "#f43f5e"}`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: 800,
                          letterSpacing: "0.5px",
                          color:
                            modelledPathway.pathwayStatus === "available"
                              ? "#c2410c"
                              : modelledPathway.pathwayStatus === "unavailable"
                              ? "#e11d48"
                              : "#475569",
                          textTransform: "uppercase",
                        }}
                      >
                        PATHWAY STATUS: {modelledPathway.pathwayStatus.toUpperCase()}
                      </div>

                      <span
                        style={{
                          fontSize: "9.5px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontWeight: 700,
                          background:
                            modelledPathway.pathwayStatus === "available"
                              ? "#ffedd5"
                              : modelledPathway.pathwayStatus === "unavailable"
                              ? "#ffe4e6"
                              : "#e2e8f0",
                          color:
                            modelledPathway.pathwayStatus === "available"
                              ? "#9a3412"
                              : modelledPathway.pathwayStatus === "unavailable"
                              ? "#9f1239"
                              : "#334155",
                        }}
                      >
                        {modelledPathway.pathwayStatus === "available"
                          ? "Modelled Channel Snapped"
                          : modelledPathway.pathwayStatus === "unavailable"
                          ? "Exceeds Overland Buffer"
                          : "No Registry Link"}
                      </span>
                    </div>

                    {modelledPathway.hasValidPath ? (
                      <div style={{ marginTop: "8px", fontSize: "11.5px", lineHeight: "1.55", color: "#1e293b" }}>
                        <div>
                          <strong>Modelled Outfall:</strong> <code>{modelledPathway.outfallId}</code>
                        </div>
                        <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#64748b" }}>
                          📍 {modelledPathway.outfallCoords[1].toFixed(5)}°N, {modelledPathway.outfallCoords[0].toFixed(5)}°E
                        </div>
                        <div style={{ marginTop: "4px" }}>
                          <strong>Synthetic Discharge:</strong> {modelledPathway.syntheticFlowRate} L/s ({modelledPathway.syntheticPollutant}, {modelledPathway.syntheticConcentration} mg/L index)
                        </div>
                        <div style={{ marginTop: "4px" }}>
                          <strong>Linked River Segment:</strong> {modelledPathway.waterwayName}
                        </div>
                        <div>
                          <strong>Overland Snapping Distance:</strong>{" "}
                          <span style={{ color: "#c2410c", fontWeight: 700 }}>
                            {modelledPathway.distanceToWaterwayMeters} meters
                          </span>
                        </div>

                        {/* Linked Downstream Stations */}
                        <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed #fdba74" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#9a3412", textTransform: "uppercase" }}>
                              Linked Downstream Monitoring ({modelledPathway.linkedStations.length})
                            </span>
                            <span style={{ fontSize: "10px", color: "#0e7490", fontWeight: 600 }}>Highlighted on map</span>
                          </div>
                          {modelledPathway.linkedStations.length > 0 ? (
                            <div style={{ marginTop: "4px" }}>
                              {modelledPathway.linkedStations.map((station) => (
                                <div
                                  key={station.sensor_id}
                                  style={{
                                    marginTop: "4px",
                                    padding: "6px 8px",
                                    background: "#ffffff",
                                    borderRadius: "5px",
                                    border: "1px solid #cffafe",
                                    boxShadow: "0 1px 3px rgba(6,182,212,0.1)",
                                    fontSize: "11px",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#06b6d4", border: "1.5px solid #22d3ee" }} />
                                    <strong style={{ color: "#0e7490" }}>{station.name}</strong>
                                  </div>
                                  <div style={{ color: "#64748b", fontSize: "10px", marginTop: "2px" }}>
                                    {station.designation} · ~{(station.distanceMeters / 1000).toFixed(1)} km downstream · Modelled travel: ~{station.travelHours} hrs
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                              No downstream telemetry stations in the current model scope.
                            </div>
                          )}
                        </div>

                        {/* Unlinked upstream stations note */}
                        {modelledPathway.unlinkedStations.length > 0 && (
                          <div style={{ marginTop: "6px", fontSize: "10.5px", color: "#64748b" }}>
                            <em>Upstream stations ({modelledPathway.unlinkedStations.map((s) => s.name).join(", ")}) are unlinked as flow is directed downstream.</em>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ marginTop: "8px", fontSize: "11.5px", lineHeight: "1.5", color: "#881337" }}>
                        <p style={{ margin: "0 0 6px 0" }}>
                          {modelledPathway.invalidationReason}
                        </p>
                        <div
                          style={{
                            padding: "6px 8px",
                            background: "#ffffff",
                            borderRadius: "5px",
                            border: "1px solid #fecdd3",
                            fontSize: "10.5px",
                            color: "#9f1239",
                          }}
                        >
                          <strong>Scientific Integrity Note:</strong> The prototype will not draw a fabricated route across town when the hydrology model does not support an overland channel connection.
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
                  <strong>Data Provenance:</strong> {modelledPathway && tracedFacilityId === selectedEntity.id ? modelledPathway.provenance : selectedEntity.source}. Simulation data generated for workflow demonstration. Not field-measured observations.
                  {modelledPathway && tracedFacilityId === selectedEntity.id && (
                    <div style={{ marginTop: "4px", fontSize: "10px", color: "#78350f" }}>
                      {modelledPathway.caveat}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Floating guidance card when tracing is active with no facility selected */}
        {isTracingActive && !selectedEntity && !isFloodModeActive && (
          <div
            role="region"
            aria-label="Active Tracing Guide"
            style={{
              position: "absolute",
              top: "16px",
              right: "60px",
              width: "330px",
              maxWidth: "calc(100% - 80px)",
              background: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 10px 30px rgba(15,23,42,0.2)",
              border: "1.5px solid #ea580c",
              padding: "16px",
              zIndex: 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "3px 8px",
                  borderRadius: "5px",
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: "0.5px",
                  background: "#ffedd5",
                  color: "#9a3412",
                }}
              >
                TRACING MODE ACTIVE
              </span>
              <button
                type="button"
                onClick={clearTracing}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
                aria-label="Clear trace"
              >
                ✕
              </button>
            </div>

            <div style={{ marginTop: "10px", fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
              Select a Facility to Trace Pathway
            </div>

            <p style={{ fontSize: "12px", color: "#475569", margin: "6px 0 12px 0", lineHeight: "1.4" }}>
              Click any of the 12 industrial facilities on the map to visualize its modelled discharge pathway toward the waterway network.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <button
                onClick={() => selectAndTrace("unit_004")}
                style={{
                  ...buttonStyle,
                  fontSize: "11px",
                  padding: "6px 9px",
                  background: "#f0fdf4",
                  borderColor: "#86efac",
                  color: "#166534",
                  textAlign: "left",
                }}
              >
                ➔ Test Unit 004 (Kasipalayam · 26m to river)
              </button>
              <button
                onClick={() => selectAndTrace("unit_009")}
                style={{
                  ...buttonStyle,
                  fontSize: "11px",
                  padding: "6px 9px",
                  background: "#fff1f2",
                  borderColor: "#fecdd3",
                  color: "#9f1239",
                  textAlign: "left",
                }}
              >
                ➔ Test Unit 009 (Nallur · 3.7km, beyond threshold)
              </button>
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

          {/* Modelled Discharge Pathway Item */}
          <div
            onClick={toggleTracePollution}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "7px",
              cursor: "pointer",
              opacity: isTracingActive ? 1 : 0.45,
            }}
            title="Click to toggle modelled discharge pathway tracing"
          >
            <span
              style={{
                display: "inline-block",
                width: "18px",
                height: "3px",
                borderTop: "2px dashed #dc2626",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, fontSize: "11.5px" }}>
              <strong style={{ color: "#dc2626" }}>Modelled Discharge Path</strong>
              <span style={{ color: "#64748b", marginLeft: "4px" }}>· simulated route</span>
            </div>
            <span style={{ fontSize: "10px", color: isTracingActive ? "#dc2626" : "#94a3b8" }}>
              {isTracingActive ? "ACTIVE" : "OFF"}
            </span>
          </div>

          {/* Downstream Channel Reach Item (when active) */}
          {isTracingActive && modelledPathway?.hasValidPath && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "7px",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "18px",
                  height: "3px",
                  background: "#f59e0b",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, fontSize: "11.5px" }}>
                <strong style={{ color: "#d97706" }}>Downstream Channel</strong>
                <span style={{ color: "#64748b", marginLeft: "4px" }}>· to linked station</span>
              </div>
              <span style={{ fontSize: "10px", color: "#d97706" }}>LINKED</span>
            </div>
          )}

          {/* Linked Station Highlight Item (when active) */}
          {isTracingActive && modelledPathway?.hasValidPath && modelledPathway.linkedStations.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "7px",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  background: "rgba(6,182,212,0.3)",
                  border: "2px solid #22d3ee",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, fontSize: "11.5px" }}>
                <strong style={{ color: "#0891b2" }}>Linked Station Target</strong>
                <span style={{ color: "#64748b", marginLeft: "4px" }}>· downstream highlight</span>
              </div>
              <span style={{ fontSize: "10px", color: "#0891b2" }}>TARGET</span>
            </div>
          )}

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
            title="Click to toggle 3D Buildings (openmaptiles tile render_height / illustrative estimated display height fallback)"
          >
            <span
              style={{
                display: "inline-block",
                width: "12px",
                height: "12px",
                borderRadius: "2px",
                background: "#94a3b8",
                border: "1px solid #64748b",
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

          {/* Modelled Flood Exposure Layer & Risk Scale */}
          <div
            onClick={toggleFloodMode}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: isFloodModeActive ? "4px" : "7px",
              cursor: "pointer",
              opacity: isFloodModeActive ? 1 : 0.45,
            }}
            title="Click to toggle Modelled Flood Risk Indicators overlay"
          >
            <span
              style={{
                display: "inline-block",
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "rgba(37,99,235,0.3)",
                border: "2px solid #2563eb",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, fontSize: "11.5px" }}>
              <strong style={{ color: "#1d4ed8" }}>Flood Risk Indicators</strong>
              <span style={{ color: "#64748b", marginLeft: "4px" }}>· 6 Sector Points</span>
            </div>
            <span style={{ fontSize: "10px", color: isFloodModeActive ? "#2563eb" : "#94a3b8" }}>
              {isFloodModeActive ? "ACTIVE" : "OFF"}
            </span>
          </div>

          {isFloodModeActive && (
            <div
              style={{
                marginBottom: "8px",
                padding: "6px 8px",
                background: "#f8fafc",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px" }}>
                <span style={{ fontWeight: 700, color: "#1e40af" }}>Modelled Sector Risk Scale</span>
                <span style={{ color: "#64748b" }}>Risk score</span>
              </div>
              <div style={{ display: "flex", gap: "2px", height: "7px", borderRadius: "2px", overflow: "hidden", marginTop: "3px" }}>
                <div style={{ flex: 1, background: "#10b981" }} title="Low: < 20%" />
                <div style={{ flex: 1, background: "#eab308" }} title="Moderate: 20-39%" />
                <div style={{ flex: 1, background: "#f97316" }} title="High: 40-59%" />
                <div style={{ flex: 1, background: "#ea580c" }} title="Very High: 60-79%" />
                <div style={{ flex: 1, background: "#dc2626" }} title="Critical: ≥ 80%" />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8.5px", color: "#475569", marginTop: "2px" }}>
                <span>&lt;20% Low</span>
                <span>Mod</span>
                <span>High</span>
                <span>V.High</span>
                <span style={{ color: "#dc2626", fontWeight: 700 }}>≥80%</span>
              </div>
              <div style={{ fontSize: "8.5px", color: "#64748b", marginTop: "4px", fontStyle: "italic" }}>
                Sector point markers · Not an inundation map or flood extent boundary
              </div>
            </div>
          )}

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
        Use <strong>City Overview</strong> for regional road & river context or <strong>Urban Detail</strong> to inspect 3D building extrusions (~200m scale).
        Building extrusion uses tile <code>render_height</code> / <code>render_min_height</code> when available, with an illustrative estimated display height fallback of 16m (~4-5 storeys) clearly designated as estimated display height—not measured building height.
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