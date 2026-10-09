import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { getUnits } from "@/lib/api";
import type { LedgerUnit } from "@/lib/types";
import type { SteriCityOverview } from "@/lib/steri/types";
import { BuildingGISDataset, LayerBuilderContext, HydrologyGISDataset, RoadGISDataset } from "@/lib/digital-twin/types";
import { buildTerrainLayer } from "@/lib/digital-twin/terrain";
import { buildHydrologyLayers, buildSimulatedSourceTransport, parseGeoJSONToHydrologyDataset, SimulatedTransportParticle } from "@/lib/digital-twin/hydrology";
import { buildRoadsLayer, parseGeoJSONToRoadDataset } from "@/lib/digital-twin/roads";
import { buildUrbanLayer, parseGeoJSONToBuildingDataset } from "@/lib/digital-twin/urban";
import { buildIndustrialLayer } from "@/lib/digital-twin/industrial";
import { buildSensorLayer } from "@/lib/digital-twin/sensors";
import { buildInfrastructureLayer } from "@/lib/digital-twin/infrastructure";
import { buildVegetationLayer } from "@/lib/digital-twin/vegetation";
import SourceBadge, { SourceType } from "@/components/provenance/SourceBadge";
import {
  geoTo3D,
  sampleRealElevationMeters,
  sampleTiruppurElevation,
  vector3DToGeo,
  WORLD_SCALE,
} from "@/lib/geo/projection";

// Compatibility exports for terrain page consumers; implementation remains centralized.
export {
  geoTo3D,
  sampleRealElevationMeters,
  sampleTiruppurElevation,
  vector3DToGeo,
} from "@/lib/geo/projection";

export type LightingPreset = "day" | "dusk" | "night";
export type UserRoleOverlay = "REGULATOR" | "GROUNDWATER_OFFICER" | "INDUSTRY" | "CITIZEN" | "ADMIN";

export interface LayerToggles {
  terrain: boolean;
  contours: boolean;
  river: boolean;
  units: boolean;
  sensors: boolean;
  groundwater: boolean;
  floodRisk: boolean;
  pollution: boolean;
  dischargePaths?: boolean;
  sourceSensorInfluence?: boolean;
  steriRisk?: boolean;
  citizenIssues?: boolean;
  drainage?: boolean;
  roads?: boolean;
  urbanRoads?: boolean;
  buildings?: boolean;
  infrastructure?: boolean;
  vegetation?: boolean;
}

export type UnitStatusType = "COMPLIANT" | "WARNING" | "INVESTIGATE" | "OFFLINE";

export interface SelectedNodeInfo {
  id: string;
  name: string;
  type: "sensor" | "unit" | "outfall" | "groundwater" | "terrain" | "steri_risk" | "road" | "building" | "hydrology";
  designation?: string;
  status?: UnitStatusType | string;
  statusSymbol?: string;
  compliance?: string;
  reusePercent?: number;
  flowRate?: number;
  latitude?: number;
  longitude?: number;
  elevationMeters?: number;
  firkaName?: string;
  drainageBasin?: string;
  ph?: number;
  ec?: number;
  turbidity?: number;
  confidence?: number;
  topSource?: string;
  lastEventId?: string;

  // STERI Risk fields
  steriScore?: number;
  riskCategory?: string;
  dominantFactorLabel?: string;
  componentScores?: {
    pollution: number;
    waterQuality: number;
    flood: number;
    groundwater: number;
    industrialPressure: number;
    complaintIntensity: number;
  };
  provenance?: {
    realDataSources: string[];
    simulatedDataSources: string[];
    derivedDataSources: string[];
    historicalDataSources: string[];
  };
  recommendation?: string;
  timestamp?: string;
  scenario?: SteriCityOverview["scenario"];
  baselineSteriScore?: number;
  scenarioDelta?: number;
  buildingCount?: number;
  industrialUnitCount?: number;
  simulatedSensorAssociations?: number;
  isSimulated?: boolean;
  raw?: any;
}

export type InteractionAnalysisMode = "EXPLORE" | "TRACE" | "RISK";

interface Terrain3DViewerProps {
  lighting: LightingPreset;
  autoRotate: boolean;
  floodIntensity?: number; // 0 to 1
  role?: UserRoleOverlay;
  layers: LayerToggles;
  interactionMode?: InteractionAnalysisMode;
  selectedNode?: SelectedNodeInfo | null;
  viewMode?: "2.5D" | "3D" | "TABLE";
  focusPosition?: { x: number; y: number; z: number } | null;
  steriOverview?: SteriCityOverview | null;
  steriBaseline?: SteriCityOverview | null;
  onSelectNode: (node: SelectedNodeInfo | null) => void;
  onExitTrace?: () => void;
}

// ---------------------------------------------------------------------------
// GEOREFERENCE SYSTEM FOR TIRUPPUR DISTRICT
// Center: 11.1085° N, 77.3411° E
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// GEOREFERENCED DATA NODES
// ---------------------------------------------------------------------------
const GROUNDWATER_FIRKAS_GEO = [
  { id: "firka_north", name: "Tiruppur North FIRKA", lat: 11.1320, lon: 77.3450, category: "Critical", draftRatio: "88%", color: 0xf59e0b },
  { id: "firka_south", name: "Tiruppur South FIRKA", lat: 11.0820, lon: 77.3550, category: "Over-Exploited", draftRatio: "112%", color: 0xef4444 },
  { id: "firka_avinashi", name: "Avinashi FIRKA", lat: 11.1920, lon: 77.2680, category: "Over-Exploited", draftRatio: "105%", color: 0xef4444 },
  { id: "firka_palladam", name: "Palladam FIRKA", lat: 11.0020, lon: 77.2880, category: "Critical", draftRatio: "92%", color: 0xf59e0b },
  { id: "firka_samalapuram", name: "Samalapuram FIRKA", lat: 11.0620, lon: 77.2380, category: "Semi-Critical", draftRatio: "74%", color: 0xeab308 },
  { id: "firka_uthukuli", name: "Uthukuli FIRKA", lat: 11.1620, lon: 77.4380, category: "Safe", draftRatio: "48%", color: 0x10b981 },
];

/* Retired static fixture. Dynamic sectors are created from /api/steri below.
  {
    id: "angeripalayam",
    name: "Angeripalayam Fabric Processing Sector",
    lat: 11.1420,
    lon: 77.3310,
    steriScore: 0.74,
    riskCategory: "VERY HIGH",
    symbol: "▲",
    color: 0xea580c,
    dominantFactorLabel: "Industrial Unit Cluster Density",
    componentScores: { pollution: 0.88, waterQuality: 0.76, flood: 0.35, groundwater: 0.72, industrialPressure: 0.92, complaintIntensity: 0.80 },
    confidence: 0.89,
    timestamp: new Date().toISOString(),
    provenance: {
      realDataSources: ["TNPCB Telemetry Station 001", "Municipal Effluent Logs"],
      simulatedDataSources: ["Chemical Plume Dispersion Engine"],
      derivedDataSources: ["Bayesian Unit 007 Anomaly Attribution (87%)"],
      historicalDataSources: ["TNPCB 2024 Industrial Registry"],
    },
    recommendation: "Deploy targeted TNPCB mobile inspection team to Angeripalayam and mandate real-time OCEMS telemetry audit.",
  },
  {
    id: "kasipalayam",
    name: "Kasipalayam Noyyal Urban Exit Sector",
    lat: 11.1190,
    lon: 77.3950,
    steriScore: 0.82,
    riskCategory: "CRITICAL",
    symbol: "!",
    color: 0xdc2626,
    dominantFactorLabel: "Noyyal Water Quality Degradation",
    componentScores: { pollution: 0.82, waterQuality: 0.90, flood: 0.78, groundwater: 0.85, industrialPressure: 0.75, complaintIntensity: 0.72 },
    confidence: 0.92,
    timestamp: new Date().toISOString(),
    provenance: {
      realDataSources: ["Kasipalayam Bridge Hardware Sensor (Live pH/EC/Turbidity)"],
      simulatedDataSources: ["Noyyal Downstream Hydrodynamic Model"],
      derivedDataSources: ["Water Quality Index (WQI) Derivation"],
      historicalDataSources: ["CGWB 2023 Groundwater Baseline"],
    },
    recommendation: "Trigger automated river aeration & emergency discharge regulation along Noyyal channel near Kasipalayam.",
  },
  {
    id: "firka_south",
    name: "Tiruppur South FIRKA",
    lat: 11.0820,
    lon: 77.3550,
    steriScore: 0.63,
    riskCategory: "VERY HIGH",
    symbol: "▲",
    color: 0xea580c,
    dominantFactorLabel: "Groundwater Depletion Stress",
    componentScores: { pollution: 0.48, waterQuality: 0.55, flood: 0.40, groundwater: 0.94, industrialPressure: 0.70, complaintIntensity: 0.65 },
    confidence: 0.94,
    timestamp: new Date().toISOString(),
    provenance: {
      realDataSources: ["CGWB State Piezometer Network (8 Piezometers)"],
      simulatedDataSources: ["GEC-2015 Recharge/Extraction Simulator"],
      derivedDataSources: ["FIRKA Groundwater Stress Derivation"],
      historicalDataSources: ["CGWB 2023 Official Dynamic Assessment"],
    },
    recommendation: "Restrict commercial deep borewell extraction and mandate rainwater harvesting injection wells across Tiruppur South.",
  },
  {
    id: "firka_north",
    name: "Tiruppur North FIRKA",
    lat: 11.1320,
    lon: 77.3450,
    steriScore: 0.58,
    riskCategory: "HIGH",
    symbol: "▲",
    color: 0xd97706,
    dominantFactorLabel: "Industrial Unit Cluster Density",
    componentScores: { pollution: 0.65, waterQuality: 0.60, flood: 0.25, groundwater: 0.81, industrialPressure: 0.84, complaintIntensity: 0.58 },
    confidence: 0.90,
    timestamp: new Date().toISOString(),
    provenance: {
      realDataSources: ["North Tiruppur Piezometer Station"],
      simulatedDataSources: ["Urban Runoff Simulation"],
      derivedDataSources: ["Spatial Kriging Interpolation"],
      historicalDataSources: ["State Groundwater Department Records"],
    },
    recommendation: "Audit CETP hydraulic capacity and enforce zero-liquid-discharge (ZLD) compliance caps for textile units in Tiruppur North.",
  },
  {
    id: "arulpuram",
    name: "Arulpuram CETP Dyeing Hub",
    lat: 11.0835,
    lon: 77.3210,
    steriScore: 0.52,
    riskCategory: "HIGH",
    symbol: "▲",
    color: 0xd97706,
    dominantFactorLabel: "Industrial Unit Cluster Density",
    componentScores: { pollution: 0.52, waterQuality: 0.45, flood: 0.30, groundwater: 0.68, industrialPressure: 0.88, complaintIntensity: 0.40 },
    confidence: 0.95,
    timestamp: new Date().toISOString(),
    provenance: {
      realDataSources: ["CETP Online Continuous Effluent Monitoring (OCEMS)", "DPP Green Ledger SHA-256"],
      simulatedDataSources: ["CETP Hydraulic Load Model"],
      derivedDataSources: ["DPP Compliance Audit Derivation"],
      historicalDataSources: ["TNPCB ZLD Certification Database"],
    },
    recommendation: "Maintain continuous environmental monitoring and routine GIS telemetry surveillance in Arulpuram.",
  },
  {
    id: "mangalam",
    name: "Mangalam Noyyal Upstream Sector",
    lat: 11.1065,
    lon: 77.2600,
    steriScore: 0.28,
    riskCategory: "MODERATE",
    symbol: "●",
    color: 0xca8a04,
    dominantFactorLabel: "Monsoon Inundation & Drainage Risk",
    componentScores: { pollution: 0.15, waterQuality: 0.22, flood: 0.50, groundwater: 0.45, industrialPressure: 0.18, complaintIntensity: 0.12 },
    confidence: 0.96,
    timestamp: new Date().toISOString(),
    provenance: {
      realDataSources: ["Mangalam Bridge Telemetry Station (Station 001)"],
      simulatedDataSources: ["Upstream River Discharge Simulator"],
      derivedDataSources: ["Baseline Water Quality Standard"],
      historicalDataSources: ["Public Works Dept (PWD) Hydrological Survey"],
    },
    recommendation: "Clear municipal stormwater drainage choke points and activate monsoon inundation warning sensors in Mangalam.",
  },
*/

export default function Terrain3DViewer({
  lighting,
  autoRotate,
  floodIntensity = 0,
  layers,
  interactionMode = "EXPLORE",
  selectedNode,
  viewMode = "2.5D",
  focusPosition,
  steriOverview,
  steriBaseline,
  onSelectNode,
  onExitTrace,
}: Terrain3DViewerProps) {
  const threeHostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Layer Groups
  const terrainGroupRef = useRef<THREE.Group>(new THREE.Group());
  const contourGroupRef = useRef<THREE.Group>(new THREE.Group());
  const riverGroupRef = useRef<THREE.Group>(new THREE.Group());
  const drainageGroupRef = useRef<THREE.Group>(new THREE.Group());
  const roadsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const buildingsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const unitsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const dischargePathsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const infrastructureGroupRef = useRef<THREE.Group>(new THREE.Group());
  const vegetationGroupRef = useRef<THREE.Group>(new THREE.Group());
  const sensorsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const groundwaterGroupRef = useRef<THREE.Group>(new THREE.Group());
  const steriRiskGroupRef = useRef<THREE.Group>(new THREE.Group());
  const floodMeshRef = useRef<THREE.Mesh | null>(null);
  const pollutionPlumeGroupRef = useRef<THREE.Group>(new THREE.Group());
  const sourceSensorInfluenceGroupRef = useRef<THREE.Group>(new THREE.Group());
  const riverFlowArrowsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const clusterGroupRef = useRef<THREE.Group>(new THREE.Group());
  const traceHighlightGroupRef = useRef<THREE.Group>(new THREE.Group());
  const selectionRingGroupRef = useRef<THREE.Group>(new THREE.Group());

  const interactiveObjectsRef = useRef<THREE.Object3D[]>([]);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const riverCurveRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  const hoveredMeshRef = useRef<THREE.Object3D | null>(null);

  const [hoveredTooltip, setHoveredTooltip] = useState<{
    x: number;
    y: number;
    name: string;
    value: string;
    badgeType: SourceType;
  } | null>(null);

  // Lerp Camera Animation Target
  const targetCamPosRef = useRef<THREE.Vector3 | null>(null);
  const targetLookAtRef = useRef<THREE.Vector3 | null>(null);

  const [hydroGisDataset, setHydroGisDataset] = useState<HydrologyGISDataset | null>(null);
  const [roadsGisDataset, setRoadsGisDataset] = useState<RoadGISDataset | null>(null);
  const [urbanRoadsGisDataset, setUrbanRoadsGisDataset] = useState<RoadGISDataset | null>(null);
  const [buildingsGisDataset, setBuildingsGisDataset] = useState<BuildingGISDataset | null>(null);

  // Load the bundled open-data Noyyal River geometry when present.
  useEffect(() => {
    let isMounted = true;
    fetch("/geo/noyyal-river.geojson")
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (isMounted && data) {
          const dataset = parseGeoJSONToHydrologyDataset(data, "OpenStreetMap", "REAL");
          setHydroGisDataset(dataset);
        }
      })
      .catch(() => {
        // Fallback procedural geometry handled gracefully by hydrology builder
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Load the OSM/Overpass footprints (regional + urban core extracts) deduplicated by stable feature ID.
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetch("/geo/tiruppur-buildings.geojson").then((res) => (res.ok ? res.json() : null)),
      fetch("/geo/tiruppur-urban-buildings.geojson").then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([b1, b2]) => {
        if (isMounted) {
          const geojsons = [b1, b2].filter(Boolean);
          if (geojsons.length > 0) {
            setBuildingsGisDataset(parseGeoJSONToBuildingDataset(...geojsons));
          }
        }
      })
      .catch(() => {
        // Keep the existing urban layer empty when the optional open-data source is unavailable.
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch verified Tiruppur Regional Highway GeoJSON (TNGIS)
  useEffect(() => {
    let isMounted = true;
    fetch("/geo/tiruppur-roads.geojson")
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (isMounted && data) {
          const dataset = parseGeoJSONToRoadDataset(data, "TNGIS", "REAL");
          setRoadsGisDataset(dataset);
        }
      })
      .catch(() => {
        // Handled gracefully: empty roads group returned
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch detailed Tiruppur Urban Street Network GeoJSON (OSM 3,117 local road features)
  useEffect(() => {
    let isMounted = true;
    fetch("/geo/tiruppur-urban-roads.geojson")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data) {
          const dataset = parseGeoJSONToRoadDataset(data, "OpenStreetMap", "OPEN_DATA");
          setUrbanRoadsGisDataset(dataset);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Smooth Camera Fly-To when focusPosition changes
  useEffect(() => {
    if (focusPosition && cameraRef.current && controlsRef.current) {
      targetCamPosRef.current = new THREE.Vector3(focusPosition.x + 12, focusPosition.y + 14, focusPosition.z + 16);
      targetLookAtRef.current = new THREE.Vector3(focusPosition.x, focusPosition.y, focusPosition.z);
    }
  }, [focusPosition]);

  // Handle View Mode Toggling (2.5D Restrained Slabs & Mapped River Corridor vs 3D Focused Extrusions)
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current || !buildingsGroupRef.current || !riverGroupRef.current) return;

    if (viewMode === "2.5D") {
      buildingsGroupRef.current.scale.set(1.0, 0.25, 1.0);
      riverGroupRef.current.scale.set(1.0, 1.0, 1.0);
    } else {
      buildingsGroupRef.current.scale.set(1.0, 1.0, 1.0);
      riverGroupRef.current.scale.set(1.0, 1.0, 1.0);
    }

    // Direct urban core target (11.1085°N, 77.3411°E) in 3D world space
    const targetX = 0.0;
    const targetY = 0.5;
    const targetZ = 0.0;

    if (viewMode === "2.5D") {
      targetCamPosRef.current = new THREE.Vector3(targetX, targetY + 14.0, targetZ + 12.0);
      targetLookAtRef.current = new THREE.Vector3(targetX, targetY, targetZ);
    } else if (viewMode === "3D") {
      targetCamPosRef.current = new THREE.Vector3(targetX, targetY + 9.5, targetZ + 11.5);
      targetLookAtRef.current = new THREE.Vector3(targetX, targetY + 0.3, targetZ);
    }
  }, [viewMode]);

  // Layer Visibility
  useEffect(() => {
    terrainGroupRef.current.visible = layers.terrain;
    contourGroupRef.current.visible = layers.contours;
    riverGroupRef.current.visible = layers.river;
    drainageGroupRef.current.visible = Boolean(layers.drainage);
    roadsGroupRef.current.visible = Boolean(layers.roads || layers.urbanRoads);
    buildingsGroupRef.current.visible = Boolean(layers.buildings);
    unitsGroupRef.current.visible = layers.units;
    dischargePathsGroupRef.current.visible = Boolean(layers.dischargePaths);
    infrastructureGroupRef.current.visible = Boolean(layers.infrastructure);
    vegetationGroupRef.current.visible = Boolean(layers.vegetation);
    sensorsGroupRef.current.visible = layers.sensors;
    groundwaterGroupRef.current.visible = layers.groundwater;
    steriRiskGroupRef.current.visible = Boolean(layers.steriRisk);
    if (floodMeshRef.current) floodMeshRef.current.visible = layers.floodRisk;
    pollutionPlumeGroupRef.current.visible = layers.pollution;
    sourceSensorInfluenceGroupRef.current.visible = Boolean(layers.sourceSensorInfluence);
  }, [layers]);

  // API-fed STERI overlays: soft terrain-draped spatial risk fills with subtle perimeter boundaries.
  useEffect(() => {
    const group = steriRiskGroupRef.current;
    interactiveObjectsRef.current = interactiveObjectsRef.current.filter((object) => object.userData.type !== "steri_risk");
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const material = object.material;
        if (Array.isArray(material)) material.forEach((item) => item.dispose()); else material.dispose();
      }
    });
    group.clear();
    if (!steriOverview) return;

    // Sequential Risk Ramp Tier Colors (LOW -> CRITICAL)
    const tierColors: Record<string, number> = {
      LOW: 0x86efac,
      MODERATE: 0xfde68a,
      HIGH: 0xfdba74,
      "VERY HIGH": 0xf87171,
      CRITICAL: 0xb91c1c,
    };

    const isAnySectorSelected = selectedNode?.type === "steri_risk";
    const selectedSectorId = isAnySectorSelected ? selectedNode.id : null;
    const baselineById = new Map(steriBaseline?.units.map((unit) => [unit.id, unit]) || []);

    steriOverview.units.forEach((sector) => {
      const baseline = baselineById.get(sector.id);
      const scenarioDelta = baseline ? Number((sector.steriScore - baseline.steriScore).toFixed(3)) : 0;
      const position = geoTo3D(sector.lat, sector.lon, 0.12);
      const radius = Math.sqrt(sector.areaKm2 / Math.PI) * 1000 * WORLD_SCALE;
      const geometry = new THREE.RingGeometry(0, radius, 64);
      geometry.rotateX(-Math.PI / 2);
      const vertices = geometry.attributes.position;
      for (let index = 0; index < vertices.count; index++) {
        const { lat, lon } = vector3DToGeo(position.x + vertices.getX(index), position.z + vertices.getZ(index));
        vertices.setY(index, sampleTiruppurElevation(lat, lon) - position.y + 0.12);
      }
      vertices.needsUpdate = true;
      geometry.computeVertexNormals();

      const color = tierColors[sector.riskCategory] || 0x86efac;
      const isSelected = selectedSectorId === sector.id;

      // Soft risk intensity scaling (subtle spatial overlay, non-intrusive)
      let targetOpacity = sector.steriScore * 0.04 + 0.04;
      if (isAnySectorSelected) {
        targetOpacity = isSelected ? 0.22 : 0.02;
      }

      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: targetOpacity,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      mesh.position.copy(position);

      // Subtle perimeter boundary (hairline outline, no radar spokes)
      const ringPoints: THREE.Vector3[] = [];
      const segs = 64;
      for (let s = 0; s <= segs; s++) {
        const theta = (s / segs) * Math.PI * 2;
        ringPoints.push(new THREE.Vector3(radius * Math.cos(theta), 0.02, radius * Math.sin(theta)));
      }
      const outlineGeo = new THREE.BufferGeometry().setFromPoints(ringPoints);
      const hairlineOutline = new THREE.LineLoop(
        outlineGeo,
        new THREE.LineBasicMaterial({
          color: isSelected ? 0x0d9488 : 0x94a3b8,
          transparent: true,
          opacity: isSelected ? 0.9 : 0.4,
        })
      );
      mesh.add(hairlineOutline);

      // Compare with baseline subtle indicator outline if enabled
      if (baseline && scenarioDelta !== 0) {
        const baselineRadius = Math.sqrt((baseline.areaKm2 || sector.areaKm2) / Math.PI) * 1000 * WORLD_SCALE;
        const deltaRingPoints: THREE.Vector3[] = [];
        for (let s = 0; s <= segs; s++) {
          const theta = (s / segs) * Math.PI * 2;
          deltaRingPoints.push(new THREE.Vector3((baselineRadius + scenarioDelta * 2) * Math.cos(theta), 0.03, (baselineRadius + scenarioDelta * 2) * Math.sin(theta)));
        }
        const deltaOutlineMat = new THREE.LineBasicMaterial({
          color: scenarioDelta > 0 ? 0xb91c1c : 0x15803d,
          transparent: true,
          opacity: 0.5,
        });
        const deltaLoop = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(deltaRingPoints), deltaOutlineMat);
        mesh.add(deltaLoop);
      }

      mesh.userData = {
        type: "steri_risk",
        data: {
          ...sector,
          sector_id: sector.id,
          sector_name: sector.name,
          risk_tier: sector.riskCategory,
          scenario: steriOverview.scenario,
          baselineSteriScore: baseline?.steriScore,
          scenarioDelta,
          buildingCount: sector.buildingExposure.buildingCount,
          industrialUnitCount: sector.metrics.industrialUnits,
          simulatedSensorAssociations: sector.metrics.activeSensors,
          isSimulated: true,
        },
      };
      interactiveObjectsRef.current.push(mesh);
      group.add(mesh);
    });
  }, [steriOverview, steriBaseline, selectedNode]);

  // Flood Intensity Level
  useEffect(() => {
    if (floodMeshRef.current) {
      floodMeshRef.current.position.y = 0.6 + floodIntensity * 2.2;
    }
  }, [floodIntensity]);

  // TRACE Mode Highlight & Visually De-emphasize Unrelated Objects
  useEffect(() => {
    const traceGroup = traceHighlightGroupRef.current;
    traceGroup.clear();

    const isTraceMode = interactionMode === "TRACE";
    const selectedUnitId =
      selectedNode?.type === "unit"
        ? selectedNode.id
        : selectedNode?.type === "outfall"
        ? selectedNode.raw?.unit?.unit_id
        : null;

    if (isTraceMode && selectedUnitId) {
      // 1. Visually de-emphasize unrelated objects (dim buildings & roads)
      buildingsGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = Array.isArray(child.material) ? child.material[0] : child.material;
          mat.transparent = true;
          mat.opacity = 0.12;
        }
      });

      roadsGroupRef.current.traverse((child) => {
        if (child instanceof THREE.LineSegments && child.material) {
          const mat = Array.isArray(child.material) ? child.material[0] : child.material;
          mat.opacity = 0.08;
        }
      });

      let activeUnitPos: THREE.Vector3 | null = null;

      // 2. Highlight target unit
      unitsGroupRef.current.children.forEach((child) => {
        const uData = child.children.find((c) => c.userData?.type === "unit")?.userData?.data;
        if (uData?.unit?.unit_id === selectedUnitId) {
          child.scale.set(1.4, 1.4, 1.4);
          activeUnitPos = child.position.clone();
          // Smooth camera focus on source
          targetCamPosRef.current = new THREE.Vector3(child.position.x + 12, child.position.y + 14, child.position.z + 16);
          targetLookAtRef.current = new THREE.Vector3(child.position.x, child.position.y, child.position.z);
        } else {
          child.scale.set(0.65, 0.65, 0.65);
        }
      });

      // 3. Highlight Noyyal River route downstream from outfall along active curve
      if (riverCurveRef.current) {
        const curve = riverCurveRef.current;
        const pts: THREE.Vector3[] = [];
        const steps = 80;
        const startT = 0.2;
        for (let i = 0; i <= steps; i++) {
          const t = startT + (1.0 - startT) * (i / steps);
          const p = curve.getPoint(Math.min(0.999, t));
          p.y += 0.35;
          pts.push(p);
        }
        const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const lineMat = new THREE.LineBasicMaterial({
          color: 0x06b6d4,
          transparent: true,
          opacity: 0.95,
        });
        const traceLine = new THREE.Line(lineGeo, lineMat);
        traceGroup.add(traceLine);
      }
    } else {
      // Restore normal visual presentation
      buildingsGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = Array.isArray(child.material) ? child.material[0] : child.material;
          mat.transparent = false;
          mat.opacity = 1.0;
        }
      });

      roadsGroupRef.current.traverse((child) => {
        if (child instanceof THREE.LineSegments && child.material) {
          const mat = Array.isArray(child.material) ? child.material[0] : child.material;
          mat.opacity = 0.45;
        }
      });

      unitsGroupRef.current.children.forEach((child) => {
        child.scale.set(1, 1, 1);
      });
    }
  }, [interactionMode, selectedNode]);

  // Selection Ring Overlay for active selected entity
  useEffect(() => {
    const group = selectionRingGroupRef.current;
    group.clear();
    if (!selectedNode || selectedNode.latitude === undefined || selectedNode.longitude === undefined) return;

    const pos = geoTo3D(selectedNode.latitude, selectedNode.longitude, 0.25);
    const ringGeo = new THREE.RingGeometry(1.2, 1.45, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x0d9488,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.copy(pos);
    group.add(ringMesh);
  }, [selectedNode]);

  // Lighting Preset Handler (Day / Dusk / Night)
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    if (lighting === "dusk") {
      scene.background = new THREE.Color(0xf1f5f9);
      if (scene.fog) scene.fog.color = new THREE.Color(0xe2e8f0);
    } else if (lighting === "night") {
      scene.background = new THREE.Color(0x0f172a);
      if (scene.fog) scene.fog.color = new THREE.Color(0x0f172a);
    } else {
      scene.background = new THREE.Color(0xf8fafc);
      if (scene.fog) scene.fog.color = new THREE.Color(0xf8fafc);
    }
  }, [lighting]);

  // Scene Setup
  useEffect(() => {
    if (!threeHostRef.current) return;
    const host = threeHostRef.current;
    const width = host.clientWidth || window.innerWidth;
    const height = host.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    // Neutral paper fog - NO blue fog (Item #1)
    scene.fog = new THREE.FogExp2(0xf8fafc, 0.003);
    sceneRef.current = scene;

    // Faded Ground Plane extending under terrain to prevent raw edge cutoffs (Item #5)
    const groundPlaneMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshBasicMaterial({ color: 0xf8fafc })
    );
    groundPlaneMesh.rotateX(-Math.PI / 2);
    groundPlaneMesh.position.y = -0.05;
    scene.add(groundPlaneMesh);

    scene.add(terrainGroupRef.current);
    scene.add(contourGroupRef.current);
    scene.add(riverGroupRef.current);
    scene.add(drainageGroupRef.current);
    scene.add(roadsGroupRef.current);
    scene.add(buildingsGroupRef.current);
    scene.add(riverFlowArrowsGroupRef.current);
    scene.add(unitsGroupRef.current);
    scene.add(dischargePathsGroupRef.current);
    scene.add(infrastructureGroupRef.current);
    scene.add(vegetationGroupRef.current);
    scene.add(sensorsGroupRef.current);
    scene.add(groundwaterGroupRef.current);
    scene.add(steriRiskGroupRef.current);
    scene.add(pollutionPlumeGroupRef.current);
    scene.add(sourceSensorInfluenceGroupRef.current);
    scene.add(clusterGroupRef.current);
    scene.add(traceHighlightGroupRef.current);
    scene.add(selectionRingGroupRef.current);

    // Oblique Urban View Perspective framing Tiruppur City Core
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0.5, 15, 13);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    while (host.firstChild) host.removeChild(host.firstChild);
    host.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.12;
    controls.minDistance = 5;
    controls.maxDistance = 45;
    controls.target.set(0.5, 1.2, -2.5);
    controlsRef.current = controls;

    // Soft Scientific Environment Lighting with Directional Shadow Contrast
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 0.85);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.25);
    dirLight.position.set(45, 55, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 160;
    dirLight.shadow.camera.left = -60;
    dirLight.shadow.camera.right = 60;
    dirLight.shadow.camera.top = 60;
    dirLight.shadow.camera.bottom = -60;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambientLight);

    // Layer Builder Context
    interactiveObjectsRef.current = [];
    const builderCtx: LayerBuilderContext = {
      scene,
      interactiveObjects: interactiveObjectsRef.current,
      // Roads and all layer builders use the shared GIS projection implementation.
      geoTo3D,
      vector3DToGeo,
      sampleElevation: sampleTiruppurElevation,
      hydrologyDataset: hydroGisDataset,
      roadsDataset: roadsGisDataset,
      urbanRoadsDataset: urbanRoadsGisDataset,
      buildingsDataset: buildingsGisDataset,
    };

    // 1. Terrain & Contours Builder
    const terrainRes = buildTerrainLayer(builderCtx);
    terrainGroupRef.current.clear();
    contourGroupRef.current.clear();
    terrainGroupRef.current.add(terrainRes.terrainGroup);
    contourGroupRef.current.add(terrainRes.contourGroup);
    terrainMeshRef.current = terrainRes.terrainMesh;

    // 2. Hydrology & River Builder
    const hydroRes = buildHydrologyLayers(builderCtx);
    riverGroupRef.current.clear();
    drainageGroupRef.current.clear();
    riverFlowArrowsGroupRef.current.clear();
    pollutionPlumeGroupRef.current.clear();
    riverGroupRef.current.add(hydroRes.riverGroup);
    drainageGroupRef.current.add(hydroRes.drainageGroup);
    riverFlowArrowsGroupRef.current.add(hydroRes.riverFlowArrowsGroup);
    pollutionPlumeGroupRef.current.add(hydroRes.pollutionPlumeGroup);
    riverCurveRef.current = hydroRes.riverCurve;
    const flowParticles = hydroRes.flowParticles;

    // Per-Segment Risk Ramp Coloring for Noyyal River
    // Applies analytical risk ramp only when pollution or risk overlay layers are enabled.
    if (layers.pollution || layers.steriRisk || interactionMode === "RISK") {
      riverGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.BufferGeometry) {
          const geo = child.geometry;
          const posAttr = geo.attributes.position;
          const colors = new Float32Array(posAttr.count * 3);
          const c1 = new THREE.Color(0x86efac);
          const c2 = new THREE.Color(0xfde68a);
          const c3 = new THREE.Color(0xfdba74);
          const c4 = new THREE.Color(0xf87171);
          const c5 = new THREE.Color(0xb91c1c);

          for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const t = Math.min(1, Math.max(0, (x + 45) / 100));
            let riskScore = 0.15;
            if (t <= 0.5) riskScore = 0.15 + (t / 0.5) * 0.7;
            else if (t <= 0.85) riskScore = 0.85 - ((t - 0.5) / 0.35) * 0.3;
            else riskScore = 0.55 - ((t - 0.85) / 0.15) * 0.3;

            let col: THREE.Color;
            if (riskScore <= 0.25) col = c1.clone().lerp(c2, riskScore / 0.25);
            else if (riskScore <= 0.5) col = c2.clone().lerp(c3, (riskScore - 0.25) / 0.25);
            else if (riskScore <= 0.75) col = c3.clone().lerp(c4, (riskScore - 0.5) / 0.25);
            else col = c4.clone().lerp(c5, Math.min(1, (riskScore - 0.75) / 0.25));

            colors[i * 3] = col.r;
            colors[i * 3 + 1] = col.g;
            colors[i * 3 + 2] = col.b;
          }
          geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
          child.material = new THREE.MeshBasicMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
          });
        }
      });
    }

    // 2a. Real Station Points on the River (Small Ringed Dots - Item #2 & #8)
    const RIVER_STATION_POINTS = [
      { id: "station_mangalam", name: "Mangalam Telemetry Station", designation: "Upstream Entry Station", lat: 11.10651, lon: 77.26001, ph: 7.4, ec: 1420, turbidity: 18, sourceType: "SIMULATED" as const },
      { id: "station_kasipalayam", name: "Kasipalayam Bridge Telemetry", designation: "Urban/Industrial Exit Station", lat: 11.11975, lon: 77.39716, ph: 6.8, ec: 2850, turbidity: 45, sourceType: "SIMULATED" as const },
      { id: "station_orathapalayam", name: "Orathapalayam Reservoir Exit", designation: "Downstream Reservoir Station", lat: 11.11084, lon: 77.53981, ph: 7.8, ec: 3100, turbidity: 62, sourceType: "SIMULATED" as const },
    ];

    RIVER_STATION_POINTS.forEach((station) => {
      const pos = geoTo3D(station.lat, station.lon, 0.55);
      const ringGroup = new THREE.Group();
      ringGroup.position.copy(pos);

      // Outer white ring
      const ringGeo = new THREE.RingGeometry(0.5, 0.7, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMesh = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
      );

      // Inner teal dot core
      const coreGeo = new THREE.CircleGeometry(0.4, 32);
      coreGeo.rotateX(-Math.PI / 2);
      const coreMesh = new THREE.Mesh(
        coreGeo,
        new THREE.MeshBasicMaterial({ color: 0x0d9488, side: THREE.DoubleSide })
      );
      coreMesh.position.y = 0.02;

      ringGroup.add(ringMesh);
      ringGroup.add(coreMesh);
      ringGroup.userData = { type: "river_station", data: station };

      // Invisible hit sphere for easy clicking/hovering
      const hitMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 8, 8),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitMesh.userData = { type: "river_station", data: station };
      ringGroup.add(hitMesh);

      riverGroupRef.current.add(ringGroup);
      interactiveObjectsRef.current.push(hitMesh);
    });

    // 3. Roads Layer Builder
    const roadsRes = buildRoadsLayer(builderCtx);
    roadsGroupRef.current.clear();
    roadsGroupRef.current.add(roadsRes.roadsGroup);

    // 4. Urban Buildings Layer Builder
    const urbanRes = buildUrbanLayer(builderCtx);
    buildingsGroupRef.current.clear();
    buildingsGroupRef.current.add(urbanRes.buildingsGroup);

    // Frame camera on defined Tiruppur Urban Center (11.1085°N, 77.3411°E)
    if (cameraRef.current && controlsRef.current) {
      const targetX = 0.0;
      const targetY = 0.5;
      const targetZ = 0.0;

      if (viewMode === "2.5D") {
        buildingsGroupRef.current.scale.set(1.0, 0.25, 1.0);
        riverGroupRef.current.scale.set(1.0, 1.0, 1.0);
        cameraRef.current.position.set(targetX, targetY + 14.0, targetZ + 12.0);
        controlsRef.current.target.set(targetX, targetY, targetZ);
      } else {
        buildingsGroupRef.current.scale.set(1.0, 1.0, 1.0);
        riverGroupRef.current.scale.set(1.0, 1.0, 1.0);
        cameraRef.current.position.set(targetX, targetY + 9.5, targetZ + 11.5);
        controlsRef.current.target.set(targetX, targetY + 0.3, targetZ);
      }
      controlsRef.current.update();
    }

    // 5. Industrial Facilities Builder
    const industrialRes = buildIndustrialLayer({ ...builderCtx, activeWaterwayCurve: hydroRes.riverCurve });
    unitsGroupRef.current.clear();
    unitsGroupRef.current.add(industrialRes.unitsGroup);
    dischargePathsGroupRef.current.clear();
    dischargePathsGroupRef.current.add(industrialRes.dischargePathsGroup);
    const sourceTransport = buildSimulatedSourceTransport(industrialRes.outfallConnections);
    pollutionPlumeGroupRef.current.add(sourceTransport.group);
    const simulatedTransportParticles: SimulatedTransportParticle[] = sourceTransport.particles;

    // 5a. Simulated sensor network snapped to the active Noyyal curve.
    const sensorRes = buildSensorLayer(
      { ...builderCtx, activeWaterwayCurve: hydroRes.riverCurve },
      industrialRes.outfallConnections,
      hydroRes.isGisLoaded,
    );
    sensorsGroupRef.current.clear();
    sensorsGroupRef.current.add(sensorRes.sensorsGroup);
    sourceSensorInfluenceGroupRef.current.clear();
    sourceSensorInfluenceGroupRef.current.add(sensorRes.sourceSensorInfluenceGroup);
    const downstreamCountByOutfall = new Map<string, number>();
    sensorRes.sourceSensorLinks.forEach((link) => {
      if (link.downstream) downstreamCountByOutfall.set(link.outfallId, (downstreamCountByOutfall.get(link.outfallId) || 0) + 1);
    });
    dischargePathsGroupRef.current.traverse((object) => {
      if (object.userData?.type !== "outfall") return;
      object.userData.data.downstreamSensorCount = downstreamCountByOutfall.get(object.userData.data.outfall.outfall_id) || 0;
    });
    unitsGroupRef.current.traverse((object) => {
      if (object.userData?.type !== "unit") return;
      object.userData.data.downstreamSensorCount = downstreamCountByOutfall.get(object.userData.data.outfall.outfall_id) || 0;
    });

    // 6. Utility Infrastructure Builder
    const infraRes = buildInfrastructureLayer(builderCtx);
    infrastructureGroupRef.current.clear();
    infrastructureGroupRef.current.add(infraRes.infrastructureGroup);

    // 7. Vegetation Builder
    const vegRes = buildVegetationLayer(builderCtx);
    vegetationGroupRef.current.clear();
    vegetationGroupRef.current.add(vegRes.vegetationGroup);

    // 8. Flood Mesh Plane
    const floodGeo = new THREE.PlaneGeometry(140, 140);
    floodGeo.rotateX(-Math.PI / 2);
    const floodMesh = new THREE.Mesh(
      floodGeo,
      new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
    );
    floodMesh.position.y = 0.4;
    floodMesh.visible = layers.floodRisk;
    scene.add(floodMesh);
    floodMeshRef.current = floodMesh;

    // 10. Groundwater FIRKA Zones - Flat Planar Fill with Perimeter-only Outline (Item #3 & #6)
    groundwaterGroupRef.current.clear();
    GROUNDWATER_FIRKAS_GEO.forEach((firka) => {
      const pos = geoTo3D(firka.lat, firka.lon, 0.18);
      const firkaRadius = 5.5;
      const fillGeo = new THREE.RingGeometry(0, firkaRadius, 64);
      fillGeo.rotateX(-Math.PI / 2);

      const firkaMesh = new THREE.Mesh(
        fillGeo,
        new THREE.MeshBasicMaterial({ color: firka.color, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false })
      );
      firkaMesh.position.copy(pos);

      // Perimeter-only outline ring
      const ringPts: THREE.Vector3[] = [];
      const numSegs = 64;
      for (let s = 0; s <= numSegs; s++) {
        const theta = (s / numSegs) * Math.PI * 2;
        ringPts.push(new THREE.Vector3(firkaRadius * Math.cos(theta), 0.02, firkaRadius * Math.sin(theta)));
      }
      const outlineGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
      const hairlineOutline = new THREE.LineLoop(
        outlineGeo,
        new THREE.LineBasicMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.85 })
      );
      firkaMesh.add(hairlineOutline);

      firkaMesh.userData = { type: "groundwater", data: firka };
      interactiveObjectsRef.current.push(firkaMesh);
      groundwaterGroupRef.current.add(firkaMesh);
    });

    // 11. Low-Zoom Marker Cluster Bubbles (Item #3)
    // Renders high-level count bubbles that expand when zoomed in (camera.position.y <= 65)
    clusterGroupRef.current.clear();
    const indClusterPos = geoTo3D(11.115, 77.342, 1.2);
    const indClusterGroup = new THREE.Group();
    indClusterGroup.position.copy(indClusterPos);

    const clusterBgMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 0.4, 32),
      new THREE.MeshStandardMaterial({ color: 0x0d9488, emissive: 0x0f766e, emissiveIntensity: 0.5, roughness: 0.2 })
    );
    const clusterRingMesh = new THREE.Mesh(
      new THREE.RingGeometry(2.4, 2.7, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    clusterRingMesh.rotateX(-Math.PI / 2);
    clusterRingMesh.position.y = 0.22;

    indClusterGroup.add(clusterBgMesh);
    indClusterGroup.add(clusterRingMesh);
    indClusterGroup.userData = {
      type: "cluster",
      data: {
        name: "Industrial Unit Cluster (12 Facilities)",
        count: 12,
        label: "12 Industrial Facilities · Click or zoom in to expand markers",
      },
    };
    clusterGroupRef.current.add(indClusterGroup);
    interactiveObjectsRef.current.push(clusterBgMesh);

    // Raycasting Click Listener (Terrain Elevation & Node Inspector - Fix #23)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveObjectsRef.current, false);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const uData = hit.object.userData;

        if (uData.type === "river_station") {
          onSelectNode({
            id: uData.data.id,
            name: uData.data.name,
            type: "sensor",
            designation: uData.data.designation,
            latitude: uData.data.lat,
            longitude: uData.data.lon,
            ph: uData.data.ph,
            ec: uData.data.ec,
            turbidity: uData.data.turbidity,
            status: "COMPLIANT",
            statusSymbol: "●",
            raw: uData.data,
          });
        } else if (uData.type === "cluster") {
          if (hit.point) {
            targetCamPosRef.current = new THREE.Vector3(hit.point.x, 35, hit.point.z + 18);
            targetLookAtRef.current = new THREE.Vector3(hit.point.x, 0, hit.point.z);
          }
        } else if (uData.type === "sensor") {
          onSelectNode({
            id: uData.data.sensor_id,
            name: uData.data.name,
            type: "sensor",
            designation: uData.data.designation,
            latitude: uData.data.lat,
            longitude: uData.data.lon,
            ph: uData.data.ph,
            ec: uData.data.ec,
            turbidity: uData.data.turbidity,
            flowRate: uData.data.flow,
            status: "COMPLIANT",
            statusSymbol: "●",
            raw: uData.data,
          });
        } else if (uData.type === "unit") {
          const { unit, outfall, sourceStrength, normalizedSourceStrength, connectionLabel, downstreamSensorCount } = uData.data;
          onSelectNode({
            id: unit.unit_id,
            name: unit.name,
            type: "unit",
            designation: unit.type,
            latitude: unit.lat,
            longitude: unit.lon,
            status: unit.status,
            statusSymbol: unit.symbol,
            reusePercent: unit.reuse,
            flowRate: unit.flow,
            confidence: unit.confidence,
            raw: { unit, outfall, sourceStrength, normalizedSourceStrength, connectionLabel, downstreamSensorCount },
          });
        } else if (uData.type === "outfall") {
          const { unit, outfall, sourceStrength, normalizedSourceStrength, connectionLabel, downstreamSensorCount } = uData.data;
          onSelectNode({
            id: outfall.outfall_id,
            name: `${outfall.outfall_id} — simulated outfall`,
            type: "outfall",
            designation: connectionLabel || "SIMULATED DISCHARGE PATH",
            status: "SIMULATED",
            latitude: outfall.lat,
            longitude: outfall.lon,
            confidence: outfall.confidence,
            raw: { unit, outfall, sourceStrength, normalizedSourceStrength, connectionLabel, downstreamSensorCount },
          });
        } else if (uData.type === "groundwater") {
          onSelectNode({
            id: uData.data.id,
            name: uData.data.name,
            type: "groundwater",
            designation: `Extraction Ratio: ${uData.data.draftRatio}`,
            status: uData.data.category.toUpperCase(),
            latitude: uData.data.lat,
            longitude: uData.data.lon,
            raw: uData.data,
          });
        } else if (uData.type === "steri_risk") {
          if (hit.point) {
            targetCamPosRef.current = new THREE.Vector3(hit.point.x + 10, hit.point.y + 12, hit.point.z + 14);
            targetLookAtRef.current = new THREE.Vector3(hit.point.x, hit.point.y, hit.point.z);
          }
          onSelectNode({
            id: uData.data.id,
            name: uData.data.name,
            type: "steri_risk",
            designation: `${uData.data.riskCategory} Environmental Risk Tier`,
            status: uData.data.riskCategory,
            statusSymbol: uData.data.symbol,
            latitude: uData.data.lat,
            longitude: uData.data.lon,
            steriScore: uData.data.steriScore,
            riskCategory: uData.data.riskCategory,
            dominantFactorLabel: uData.data.dominantFactorLabel,
            componentScores: uData.data.componentScores,
            confidence: uData.data.confidence,
            timestamp: uData.data.timestamp,
            provenance: uData.data.provenance,
            recommendation: uData.data.recommendation,
            scenario: uData.data.scenario,
            baselineSteriScore: uData.data.baselineSteriScore,
            scenarioDelta: uData.data.scenarioDelta,
            buildingCount: uData.data.buildingCount,
            industrialUnitCount: uData.data.industrialUnitCount,
            simulatedSensorAssociations: uData.data.simulatedSensorAssociations,
            isSimulated: uData.data.isSimulated,
            raw: uData.data,
          });
        } else if (uData.type === "road") {
          const { lat, lon } = hit.point ? vector3DToGeo(hit.point.x, hit.point.z) : { lat: 11.1085, lon: 77.3411 };
          onSelectNode({
            id: uData.featureId || uData.data.featureId || uData.data.id || "road_feature",
            name: uData.roadName || uData.data.name || "GIS Road Feature",
            type: "road",
            designation: uData.roadClass || uData.data.roadClass || uData.data.highway
              ? `Road class: ${uData.roadClass || uData.data.roadClass || uData.data.highway}`
              : "TNGIS road feature",
            status: "REAL_GIS",
            latitude: lat,
            longitude: lon,
            raw: uData.data,
          });
        } else if (uData.type === "building") {
          const { lat, lon } = hit.point ? vector3DToGeo(hit.point.x, hit.point.z) : { lat: 11.1085, lon: 77.3411 };
          onSelectNode({
            id: uData.featureId || "osm_building",
            name: uData.data.name || "OSM Building Footprint",
            type: "building",
            designation: uData.data.building ? `Building type: ${uData.data.building}` : "OSM building footprint",
            status: "OPEN_DATA",
            latitude: lat,
            longitude: lon,
            raw: uData.originalProperties,
          });
        } else if (hit.object === terrainMeshRef.current && hit.point) {
          // Procedural terrain inspector.
          const { lat, lon } = vector3DToGeo(hit.point.x, hit.point.z);
          const elevM = sampleRealElevationMeters(lat, lon);
          onSelectNode({
            id: `terrain_${lat.toFixed(3)}_${lon.toFixed(3)}`,
            name: "Tiruppur Modelled Terrain Point",
            type: "terrain",
            designation: "Procedural Terrain / Modelled Elevation Surface",
            latitude: lat,
            longitude: lon,
            elevationMeters: elevM,
            firkaName: lat > 11.11 ? "Tiruppur North FIRKA" : "Tiruppur South FIRKA",
            drainageBasin: "Noyyal River Catchment Sub-Basin",
          });
        }
      }
    };

    // Throttle Hover Raycast with requestAnimationFrame (Item #4)
    let hoverAnimationFrameId: number | null = null;
    let pendingMouseEvent: MouseEvent | null = null;

    const handlePointerMove = (event: MouseEvent) => {
      pendingMouseEvent = event;
      if (hoverAnimationFrameId !== null) return;

      hoverAnimationFrameId = requestAnimationFrame(() => {
        hoverAnimationFrameId = null;
        if (!pendingMouseEvent || !rendererRef.current || !cameraRef.current) return;
        const evt = pendingMouseEvent;
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, cameraRef.current);
        const intersects = raycaster.intersectObjects(interactiveObjectsRef.current, false);

        if (intersects.length > 0 && intersects[0].object !== terrainMeshRef.current) {
          const hit = intersects[0];
          const uData = hit.object.userData;
          let name = "";
          let value = "";
          let badgeType: SourceType = "SIMULATED";

          if (uData.type === "sensor") {
            name = uData.data.name;
            value = `pH ${uData.data.ph} · EC ${uData.data.ec} µS/cm`;
            badgeType = "SIMULATED";
          } else if (uData.type === "river_station") {
            name = uData.data.name;
            value = `River Station Point · pH ${uData.data.ph} · EC ${uData.data.ec} µS/cm`;
            badgeType = "SIMULATED";
          } else if (uData.type === "hydrology") {
            name = "Noyyal River Stretch (Interpolated WQI)";
            value = "Interpolated WQI stretch between station points";
            badgeType = "MODELLED";
          } else if (uData.type === "cluster") {
            name = uData.data.name;
            value = uData.data.label;
            badgeType = "SIMULATED";
          } else if (uData.type === "unit") {
            name = uData.data.unit.name;
            value = `${uData.data.unit.reuse}% Reuse · ${uData.data.unit.flow} L/s`;
            badgeType = "SIMULATED";
          } else if (uData.type === "steri_risk") {
            name = uData.data.name;
            value = `STERI Score: ${uData.data.steriScore?.toFixed(3)} (${uData.data.riskCategory})`;
            badgeType = "MODELLED";
          } else if (uData.type === "groundwater") {
            name = uData.data.name;
            value = `Draft Ratio: ${uData.data.draftRatio} (${uData.data.category})`;
            badgeType = "HISTORICAL";
          } else if (uData.type === "road" || uData.type === "building") {
            name = uData.roadName || uData.data?.name || "GIS Feature";
            value = uData.roadClass || "OpenData GIS";
            badgeType = "HISTORICAL";
          }

          if (name) {
            setHoveredTooltip({
              x: evt.clientX - rect.left,
              y: evt.clientY - rect.top,
              name,
              value,
              badgeType,
            });
            return;
          }
        }
        setHoveredTooltip(null);
      });
    };

    const handleDoubleClick = (event: MouseEvent) => {
      if (!rendererRef.current || !cameraRef.current) return;
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObjects(interactiveObjectsRef.current, false);

      if (intersects.length > 0) {
        const hit = intersects[0];
        if (hit.point) {
          targetCamPosRef.current = new THREE.Vector3(hit.point.x + 10, hit.point.y + 12, hit.point.z + 14);
          targetLookAtRef.current = new THREE.Vector3(hit.point.x, hit.point.y, hit.point.z);
        }
      }
    };

    renderer.domElement.addEventListener("click", handlePointerDown);
    renderer.domElement.addEventListener("mousemove", handlePointerMove);
    renderer.domElement.addEventListener("dblclick", handleDoubleClick);

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (controlsRef.current && cameraRef.current) {
        controlsRef.current.autoRotate = autoRotate;

        // Marker clustering at low zoom (Item #3)
        const isZoomedOut = camera.position.y > 65;
        if (clusterGroupRef.current) clusterGroupRef.current.visible = isZoomedOut;
        if (unitsGroupRef.current) unitsGroupRef.current.visible = layers.units && !isZoomedOut;
        if (sensorsGroupRef.current) sensorsGroupRef.current.visible = layers.sensors && !isZoomedOut;

        // Smooth Camera Fly-To Lerp
        if (targetCamPosRef.current && targetLookAtRef.current) {
          camera.position.lerp(targetCamPosRef.current, 0.08);
          controls.target.lerp(targetLookAtRef.current, 0.08);

          if (camera.position.distanceTo(targetCamPosRef.current) < 0.5) {
            targetCamPosRef.current = null;
            targetLookAtRef.current = null;
          }
        }

        controls.update();
      }

      // Animate River Flow Particles (Static under prefers-reduced-motion)
      const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!prefersReducedMotion && riverCurveRef.current) {
        flowParticles.forEach((arrow, idx) => {
          const t = ((elapsedTime * 0.08 + idx / (flowParticles.length || 12)) % 1);
          const pPos = riverCurveRef.current!.getPoint(t);
          const tangent = riverCurveRef.current!.getTangent(t);
          arrow.position.copy(pPos);
          arrow.position.y += 0.35;
          arrow.lookAt(pPos.clone().add(tangent));
        });

        // SIMULATED SOURCE-TO-RIVER TRANSPORT VISUALIZATION
        if (layers.pollution) {
          simulatedTransportParticles.forEach(({ mesh, connection, phase }) => {
            const cycle = (elapsedTime * 0.12 + phase) % 1;
            if (cycle < 0.2) {
              mesh.position.lerpVectors(connection.outfallPosition, connection.waterwayPosition, cycle / 0.2);
            } else {
              const t = Math.min(0.999, connection.waterwayT + ((cycle - 0.2) / 0.8) * (1 - connection.waterwayT));
              mesh.position.copy(riverCurveRef.current!.getPoint(t));
            }
            mesh.position.y += 0.3;
          });
        }
      }

      // Animate Sensor Pulse Rings
      if (sensorsGroupRef.current) {
        sensorsGroupRef.current.traverse((child) => {
          if (child.name === "Sensor_Pulse_Ring" && child instanceof THREE.Mesh) {
            const pulse = (elapsedTime * 1.5) % 1;
            child.scale.set(1 + pulse * 0.5, 1 + pulse * 0.5, 1);
            (child.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - pulse);
          }
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleExportFigure = () => {
      if (!rendererRef.current) return;
      const webglCanvas = rendererRef.current.domElement;
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = webglCanvas.width;
      exportCanvas.height = webglCanvas.height;
      const ctx = exportCanvas.getContext("2d");
      if (!ctx) return;

      // 1. Draw WebGL 3D Canvas
      ctx.drawImage(webglCanvas, 0, 0);

      // 2. Burn in Header Label (Top Left)
      ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
      ctx.fillRect(20, 20, 480, 56);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, 480, 56);

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText("TIRUPPUR ENVIRONMENTAL DIGITAL TWIN", 34, 44);
      ctx.fillStyle = "#0d9488";
      ctx.font = "bold 11px monospace";
      ctx.fillText("[SIMULATED DEMO INPUTS · SCIENTIFIC FIGURE EXPORT]", 34, 62);

      // 3. Burn in Legend Box (Bottom Left)
      ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
      ctx.fillRect(20, exportCanvas.height - 130, 380, 110);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2;
      ctx.strokeRect(20, exportCanvas.height - 130, 380, 110);

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText("NOYYAL RIVER WATER QUALITY RISK RAMP", 34, exportCanvas.height - 110);

      // Gradient Ramp Bar
      const grad = ctx.createLinearGradient(34, 0, 360, 0);
      grad.addColorStop(0, "#86efac");
      grad.addColorStop(0.25, "#fde68a");
      grad.addColorStop(0.5, "#fdba74");
      grad.addColorStop(0.75, "#f87171");
      grad.addColorStop(1, "#b91c1c");
      ctx.fillStyle = grad;
      ctx.fillRect(34, exportCanvas.height - 102, 330, 10);

      ctx.fillStyle = "#475569";
      ctx.font = "10px sans-serif";
      ctx.fillText("Low (0.0)", 34, exportCanvas.height - 78);
      ctx.fillText("Moderate", 110, exportCanvas.height - 78);
      ctx.fillText("High", 190, exportCanvas.height - 78);
      ctx.fillText("Critical (1.0)", 290, exportCanvas.height - 78);

      ctx.fillStyle = "#64748b";
      ctx.font = "10px sans-serif";
      ctx.fillText("● Station Point (Measured/Simulated)  ── Interpolated Stretch", 34, exportCanvas.height - 42);

      // 4. Trigger PNG Download
      const dataUrl = exportCanvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `Tiruppur_Digital_Twin_Figure_${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
    };

    const handleResize = () => {
      if (!threeHostRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = threeHostRef.current.clientWidth;
      const h = threeHostRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("export-dt-figure", handleExportFigure);

    return () => {
      cancelAnimationFrame(animId);
      if (hoverAnimationFrameId !== null) cancelAnimationFrame(hoverAnimationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("export-dt-figure", handleExportFigure);
      if (renderer.domElement) {
        renderer.domElement.removeEventListener("click", handlePointerDown);
        renderer.domElement.removeEventListener("mousemove", handlePointerMove);
        renderer.domElement.removeEventListener("dblclick", handleDoubleClick);
      }
      if (host.contains(renderer.domElement)) {
        host.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [autoRotate, onSelectNode, hydroGisDataset, roadsGisDataset, urbanRoadsGisDataset, buildingsGisDataset]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#f8fafc",
      }}
    >
      {/* Dedicated Three.js WebGL canvas host element (isolated from React JSX children) */}
      <div
        ref={threeHostRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
      />
      {/* Active Task Focus Caption Bar */}
      {interactionMode === "TRACE" && (
        <div
          style={{
            position: "absolute",
            top: "60px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            background: "rgba(255, 255, 255, 0.95)",
            border: "1px solid #0d9488",
            borderRadius: "8px",
            padding: "8px 16px",
            boxShadow: "0 4px 12px rgba(13, 148, 136, 0.15)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            fontSize: "11px",
            color: "#0f172a",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontWeight: 800, color: "#0d9488", letterSpacing: "0.5px" }}>TRACE POLLUTION</span>
            <SourceBadge type="SIMULATED" />
          </div>
          <div style={{ height: "14px", width: "1px", background: "#cbd5e1" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#334155" }}>
            <span><strong>1.</strong> Source</span>
            <span style={{ color: "#94a3b8" }}>➜</span>
            <span><strong>2.</strong> River path</span>
            <span style={{ color: "#94a3b8" }}>➜</span>
            <span><strong>3.</strong> Downstream sensors</span>
          </div>
          <div style={{ height: "14px", width: "1px", background: "#cbd5e1" }} />
          <button
            type="button"
            onClick={onExitTrace}
            style={{
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              padding: "4px 8px",
              fontSize: "10.5px",
              fontWeight: 700,
              color: "#0f766e",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
            aria-label="Exit Task Focus Mode (Esc)"
          >
            <span>✕ Exit Focus (Esc)</span>
          </button>
        </div>
      )}

      {/* Hover Tooltip Overlay */}
      {hoveredTooltip && (
        <div
          style={{
            position: "absolute",
            top: hoveredTooltip.y + 12,
            left: hoveredTooltip.x + 12,
            pointerEvents: "none",
            zIndex: 100,
            background: "rgba(255, 255, 255, 0.96)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-md)",
            backdropFilter: "blur(8px)",
            padding: "6px 10px",
            fontSize: "11px",
            color: "var(--ink)",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
            <span>{hoveredTooltip.name}</span>
            <SourceBadge type={hoveredTooltip.badgeType} />
          </div>
          <div style={{ color: "var(--ink-soft)", fontSize: "10px", fontFamily: "JetBrains Mono, monospace" }}>
            {hoveredTooltip.value}
          </div>
        </div>
      )}

      {/* Floating Camera Presets Bar (Item #7) */}
      <div
        style={{
          position: "absolute",
          top: "14px",
          left: "14px",
          zIndex: 90,
          background: "rgba(255, 255, 255, 0.92)",
          border: "1px solid #cbd5e1",
          borderRadius: "8px",
          padding: "4px 8px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "11px",
        }}
      >
        <span style={{ fontWeight: 700, color: "#64748b", fontSize: "10px", textTransform: "uppercase", paddingRight: "4px" }}>
          Camera Presets:
        </span>
        {[
          { label: "City Overview", pos: new THREE.Vector3(0.5, 22.0, 16.0), lookAt: new THREE.Vector3(0.5, 0.5, -2.5) },
          { label: "Urban Core", pos: new THREE.Vector3(0.5, 9.5, 8.5), lookAt: new THREE.Vector3(0.5, 0.5, -2.5) },
          { label: "Noyyal Corridor", pos: new THREE.Vector3(-12.0, 8.0, 2.0), lookAt: new THREE.Vector3(2.0, 0.5, -1.5) },
          { label: "Industrial Zone", pos: new THREE.Vector3(14.0, 9.0, -4.0), lookAt: new THREE.Vector3(4.0, 0.5, -4.0) },
          { label: "Flood Exposure", pos: new THREE.Vector3(0.0, 24.0, 0.5), lookAt: new THREE.Vector3(0.0, 0.0, 0.0) },
        ].map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              targetCamPosRef.current = preset.pos;
              targetLookAtRef.current = preset.lookAt;
            }}
            style={{
              background: "#f1f5f9",
              border: "1px solid #e2e8f0",
              borderRadius: "4px",
              padding: "3px 8px",
              fontSize: "10.5px",
              fontWeight: 600,
              color: "#0f172a",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {preset.label}
          </button>
        ))}
        <div style={{ width: "1px", height: "14px", background: "#cbd5e1", margin: "0 2px" }} />
        <button
          type="button"
          onClick={() => {
            targetCamPosRef.current = new THREE.Vector3(0.5, 15.0, 13.0);
            targetLookAtRef.current = new THREE.Vector3(0.5, 1.2, -2.5);
          }}
          style={{
            background: "#0d9488",
            border: "1px solid #0f766e",
            borderRadius: "4px",
            padding: "3px 8px",
            fontSize: "10.5px",
            fontWeight: 700,
            color: "#ffffff",
            cursor: "pointer",
          }}
        >
          Fit City
        </button>
      </div>

      {/* Compact Minimap Overlay (Item #8) */}
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          left: "16px",
          zIndex: 90,
          background: "rgba(255, 255, 255, 0.94)",
          border: "1px solid #cbd5e1",
          borderRadius: "8px",
          padding: "6px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          backdropFilter: "blur(6px)",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#475569", letterSpacing: "0.5px" }}>
          SUB-BASIN MINIMAP
        </div>
        <svg width="120" height="75" style={{ background: "#f8fafc", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
          {/* Outer City Extent Bounding Box */}
          <rect x="10" y="8" width="100" height="58" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2,2" />
          {/* Noyyal River Curve Thumbnail */}
          <path d="M 12 38 Q 45 48, 70 34 T 108 36" fill="none" stroke="#0284c7" strokeWidth="2.5" />
          {/* Urban Center Indicator */}
          <circle cx="60" cy="38" r="4" fill="#0d9488" opacity="0.8" />
          {/* Active Camera Frustum Cone */}
          <polygon points="60,38 48,20 72,20" fill="rgba(13, 148, 136, 0.2)" stroke="#0d9488" strokeWidth="1" />
          <text x="60" y="62" textAnchor="middle" fontSize="7.5" fill="#64748b" fontWeight="600">
            Tiruppur Urban Basin
          </text>
        </svg>
      </div>

      {/* Map Orientation, Area Label & Graphic Scale Bar Overlay Box */}
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          right: "16px",
          zIndex: 90,
          background: "rgba(255, 255, 255, 0.94)",
          border: "1px solid #cbd5e1",
          borderRadius: "8px",
          padding: "8px 12px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          backdropFilter: "blur(6px)",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          fontSize: "11px",
          color: "#0f172a",
          pointerEvents: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "22px",
              height: "22px",
              borderRadius: "50%",
              background: "#0f766e",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "11px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
            }}
            title="North Pointer"
          >
            N
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "11px", lineHeight: 1.2 }}>Tiruppur Urban Center</div>
            <div style={{ fontSize: "9.5px", color: "#64748b" }}>Noyyal Sub-Basin • 11.1085°N, 77.3411°E</div>
          </div>
        </div>

        {/* Graphic Scale Bar (~5 km) */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
          <span style={{ fontSize: "9.5px", color: "#64748b", fontWeight: 600 }}>SCALE</span>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: "90px", height: "4px", background: "#0f172a", borderRadius: "1px", position: "relative" }}>
              <div style={{ position: "absolute", left: 0, top: "-3px", width: "1px", height: "10px", background: "#0f172a" }} />
              <div style={{ position: "absolute", left: "50%", top: "-3px", width: "1px", height: "10px", background: "#0f172a" }} />
              <div style={{ position: "absolute", right: 0, top: "-3px", width: "1px", height: "10px", background: "#0f172a" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", width: "90px", fontSize: "8.5px", color: "#475569", marginTop: "4px" }}>
              <span>0</span>
              <span>2.5km</span>
              <span>5km</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
