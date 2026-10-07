import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { getUnits } from "@/lib/api";
import type { LedgerUnit } from "@/lib/types";
import { BuildingGISDataset, LayerBuilderContext, HydrologyGISDataset, RoadGISDataset } from "@/lib/digital-twin/types";
import { buildTerrainLayer } from "@/lib/digital-twin/terrain";
import { buildHydrologyLayers, buildSimulatedSourceTransport, parseGeoJSONToHydrologyDataset, SimulatedTransportParticle } from "@/lib/digital-twin/hydrology";
import { buildRoadsLayer, parseGeoJSONToRoadDataset } from "@/lib/digital-twin/roads";
import { buildUrbanLayer, parseGeoJSONToBuildingDataset } from "@/lib/digital-twin/urban";
import { buildIndustrialLayer } from "@/lib/digital-twin/industrial";
import { buildSensorLayer } from "@/lib/digital-twin/sensors";
import { buildInfrastructureLayer } from "@/lib/digital-twin/infrastructure";
import { buildVegetationLayer } from "@/lib/digital-twin/vegetation";
import {
  geoTo3D,
  sampleRealElevationMeters,
  sampleTiruppurElevation,
  vector3DToGeo,
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
  raw?: any;
}

interface Terrain3DViewerProps {
  lighting: LightingPreset;
  autoRotate: boolean;
  floodIntensity?: number; // 0 to 1
  role?: UserRoleOverlay;
  layers: LayerToggles;
  focusPosition?: { x: number; y: number; z: number } | null;
  onSelectNode: (node: SelectedNodeInfo | null) => void;
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

const STERI_SPATIAL_SECTORS_3D = [
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
];

export default function Terrain3DViewer({
  lighting,
  autoRotate,
  floodIntensity = 0,
  layers,
  focusPosition,
  onSelectNode,
}: Terrain3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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

  const interactiveObjectsRef = useRef<THREE.Object3D[]>([]);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const riverCurveRef = useRef<THREE.CatmullRomCurve3 | null>(null);

  // Lerp Camera Animation Target
  const targetCamPosRef = useRef<THREE.Vector3 | null>(null);
  const targetLookAtRef = useRef<THREE.Vector3 | null>(null);

  const [hydroGisDataset, setHydroGisDataset] = useState<HydrologyGISDataset | null>(null);
  const [roadsGisDataset, setRoadsGisDataset] = useState<RoadGISDataset | null>(null);
  const [buildingsGisDataset, setBuildingsGisDataset] = useState<BuildingGISDataset | null>(null);

  // Fetch verified Noyyal River GeoJSON if present in public/geo/
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

  // Load the OSM/Overpass footprints exactly as supplied; no gap-filling geometry.
  useEffect(() => {
    let isMounted = true;
    fetch("/geo/tiruppur-buildings.geojson")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data) setBuildingsGisDataset(parseGeoJSONToBuildingDataset(data));
      })
      .catch(() => {
        // Keep the existing urban layer empty when the optional open-data source is unavailable.
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch verified Tiruppur Road Network GeoJSON if present in public/geo/
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
        // Handled gracefully: empty roads group returned (zero fake data invented)
      });
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

  // Layer Visibility
  useEffect(() => {
    terrainGroupRef.current.visible = layers.terrain;
    contourGroupRef.current.visible = layers.contours;
    riverGroupRef.current.visible = layers.river;
    drainageGroupRef.current.visible = Boolean(layers.drainage);
    roadsGroupRef.current.visible = Boolean(layers.roads);
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

  // Flood Intensity Level
  useEffect(() => {
    if (floodMeshRef.current) {
      floodMeshRef.current.position.y = 0.6 + floodIntensity * 2.2;
    }
  }, [floodIntensity]);

  // Scene Setup
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.008);
    sceneRef.current = scene;

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

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 42, 58);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    while (container.firstChild) container.removeChild(container.firstChild);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.target.set(0, 2, 0);
    controlsRef.current = controls;

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.9);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(30, 60, 40);
    dirLight.castShadow = true;
    scene.add(dirLight);

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

    // 3. Roads Layer Builder
    const roadsRes = buildRoadsLayer(builderCtx);
    roadsGroupRef.current.clear();
    roadsGroupRef.current.add(roadsRes.roadsGroup);

    // 4. Urban Buildings Layer Builder
    const urbanRes = buildUrbanLayer(builderCtx);
    buildingsGroupRef.current.clear();
    buildingsGroupRef.current.add(urbanRes.buildingsGroup);

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
      new THREE.MeshStandardMaterial({ color: 0x0284c7, transparent: true, opacity: 0.45 })
    );
    floodMesh.position.y = 0.6;
    floodMesh.visible = layers.floodRisk;
    scene.add(floodMesh);
    floodMeshRef.current = floodMesh;

    // 10. Groundwater FIRKA Zones
    groundwaterGroupRef.current.clear();
    GROUNDWATER_FIRKAS_GEO.forEach((firka) => {
      const pos = geoTo3D(firka.lat, firka.lon, 0.1);
      const firkaMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(6, 6, 0.4, 24),
        new THREE.MeshStandardMaterial({ color: firka.color, transparent: true, opacity: 0.35 })
      );
      firkaMesh.position.copy(pos);
      firkaMesh.userData = { type: "groundwater", data: firka };
      interactiveObjectsRef.current.push(firkaMesh);
      groundwaterGroupRef.current.add(firkaMesh);
    });

    // 11. STERI Environmental Risk 3D Terrain Overlays
    steriRiskGroupRef.current.clear();
    STERI_SPATIAL_SECTORS_3D.forEach((sector) => {
      const pos = geoTo3D(sector.lat, sector.lon, 0.25);
      const steriMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(8, 8, 0.5, 24),
        new THREE.MeshStandardMaterial({
          color: sector.color,
          emissive: sector.color,
          emissiveIntensity: 0.35,
          transparent: true,
          opacity: 0.45,
          roughness: 0.2,
        })
      );
      steriMesh.position.copy(pos);
      steriMesh.userData = { type: "steri_risk", data: sector };
      interactiveObjectsRef.current.push(steriMesh);
      steriRiskGroupRef.current.add(steriMesh);
    });


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

        if (uData.type === "sensor") {
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
          // Terrain Elevation Inspector (Fix #23)
          const { lat, lon } = vector3DToGeo(hit.point.x, hit.point.z);
          const elevM = sampleRealElevationMeters(lat, lon);
          onSelectNode({
            id: `terrain_${lat.toFixed(3)}_${lon.toFixed(3)}`,
            name: "Tiruppur Terrain Point",
            type: "terrain",
            designation: "Topographic Elevation DEM Surface",
            latitude: lat,
            longitude: lon,
            elevationMeters: elevM,
            firkaName: lat > 11.11 ? "Tiruppur North FIRKA" : "Tiruppur South FIRKA",
            drainageBasin: "Noyyal River Catchment Sub-Basin",
            status: "SAFE",
          });
        }
      }
    };

    renderer.domElement.addEventListener("click", handlePointerDown);

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoRotate;

        // Smooth Camera Fly-To Lerp (Fix #19)
        if (targetCamPosRef.current && targetLookAtRef.current) {
          camera.position.lerp(targetCamPosRef.current, 0.05);
          controls.target.lerp(targetLookAtRef.current, 0.05);

          if (camera.position.distanceTo(targetCamPosRef.current) < 0.5) {
            targetCamPosRef.current = null;
            targetLookAtRef.current = null;
          }
        }

        controls.update();
      }

      // Animate River Flow Particles (Fix #21)
      if (riverCurveRef.current) {
        flowParticles.forEach((arrow, idx) => {
          const t = ((elapsedTime * 0.08 + idx / (flowParticles.length || 12)) % 1);
          const pPos = riverCurveRef.current!.getPoint(t);
          const tangent = riverCurveRef.current!.getTangent(t);
          arrow.position.copy(pPos);
          arrow.position.y += 0.35;
          arrow.lookAt(pPos.clone().add(tangent));
        });

        // SIMULATED SOURCE-TO-RIVER TRANSPORT VISUALIZATION (not a dispersion model).
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

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("click", handlePointerDown);
      renderer.dispose();
    };
  }, [autoRotate, onSelectNode, hydroGisDataset, roadsGisDataset, buildingsGisDataset]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#0f172a",
      }}
    />
  );
}
