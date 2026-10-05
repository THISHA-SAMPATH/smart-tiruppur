import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { getUnits } from "@/lib/api";
import type { LedgerUnit } from "@/lib/types";
import { LayerBuilderContext, HydrologyGISDataset } from "@/lib/digital-twin/types";
import { buildTerrainLayer } from "@/lib/digital-twin/terrain";
import { buildHydrologyLayers, parseGeoJSONToHydrologyDataset } from "@/lib/digital-twin/hydrology";
import { buildRoadsLayer } from "@/lib/digital-twin/roads";
import { buildUrbanLayer } from "@/lib/digital-twin/urban";
import { buildIndustrialLayer } from "@/lib/digital-twin/industrial";
import { buildInfrastructureLayer } from "@/lib/digital-twin/infrastructure";
import { buildVegetationLayer } from "@/lib/digital-twin/vegetation";

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
  type: "sensor" | "unit" | "groundwater" | "terrain" | "steri_risk";
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
export const TIRUPPUR_CENTER_LAT = 11.1085;
export const TIRUPPUR_CENTER_LON = 77.3411;

const METERS_PER_DEG_LAT = 111000;
const METERS_PER_DEG_LON = 111000 * Math.cos((TIRUPPUR_CENTER_LAT * Math.PI) / 180);
const WORLD_SCALE = 0.0035;

export function sampleTiruppurElevation(lat: number, lon: number): number {
  const dLat = (lat - TIRUPPUR_CENTER_LAT) * 100;
  const dLon = (lon - TIRUPPUR_CENTER_LON) * 100;

  const nwHigh = Math.max(0, (-dLon + dLat + 8) * 0.7);
  const eastSlope = -dLon * 0.35;
  const riverLat = 11.108 + 0.008 * Math.sin((lon - 77.25) * 12);
  const distToRiver = Math.abs(lat - riverLat);
  const riverDepression = Math.exp(-Math.pow(distToRiver / 0.012, 2)) * 3.8;

  const elevMeters = 300 + nwHigh * 7.5 + eastSlope * 5 - riverDepression * 4;
  return Math.max(0.1, (elevMeters - 288) * 0.16);
}

export function sampleRealElevationMeters(lat: number, lon: number): number {
  const elev3D = sampleTiruppurElevation(lat, lon);
  return Math.round(288 + elev3D / 0.16);
}

export function geoTo3D(lat: number, lon: number, elevOffset: number = 0): THREE.Vector3 {
  const x = (lon - TIRUPPUR_CENTER_LON) * METERS_PER_DEG_LON * WORLD_SCALE;
  const z = -(lat - TIRUPPUR_CENTER_LAT) * METERS_PER_DEG_LAT * WORLD_SCALE;
  const y = sampleTiruppurElevation(lat, lon) + elevOffset;
  return new THREE.Vector3(x, y, z);
}

export function vector3DToGeo(x: number, z: number): { lat: number; lon: number } {
  const lon = TIRUPPUR_CENTER_LON + x / (METERS_PER_DEG_LON * WORLD_SCALE);
  const lat = TIRUPPUR_CENTER_LAT - z / (METERS_PER_DEG_LAT * WORLD_SCALE);
  return { lat, lon };
}

// ---------------------------------------------------------------------------
// GEOREFERENCED DATA NODES
// ---------------------------------------------------------------------------
const SENSOR_NODES_GEO = [
  { id: "tnpcb_noyyal_001", name: "Mangalam Telemetry Station", designation: "Upstream Entry Station", lat: 11.10651, lon: 77.26001, ph: 7.4, ec: 1420, turbidity: 18, flow: 142 },
  { id: "tnpcb_noyyal_002", name: "Kasipalayam Bridge Telemetry", designation: "Urban/Industrial Exit Station", lat: 11.11975, lon: 77.39716, ph: 6.8, ec: 2850, turbidity: 45, flow: 128 },
  { id: "tnpcb_noyyal_003", name: "Orathapalayam Reservoir Exit", designation: "Downstream Reservoir Station", lat: 11.11084, lon: 77.53981, ph: 7.8, ec: 3100, turbidity: 62, flow: 95 },
];

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
  const infrastructureGroupRef = useRef<THREE.Group>(new THREE.Group());
  const vegetationGroupRef = useRef<THREE.Group>(new THREE.Group());
  const sensorsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const groundwaterGroupRef = useRef<THREE.Group>(new THREE.Group());
  const steriRiskGroupRef = useRef<THREE.Group>(new THREE.Group());
  const floodMeshRef = useRef<THREE.Mesh | null>(null);
  const pollutionPlumeGroupRef = useRef<THREE.Group>(new THREE.Group());
  const riverFlowArrowsGroupRef = useRef<THREE.Group>(new THREE.Group());

  const interactiveObjectsRef = useRef<THREE.Object3D[]>([]);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const riverCurveRef = useRef<THREE.CatmullRomCurve3 | null>(null);

  // Lerp Camera Animation Target
  const targetCamPosRef = useRef<THREE.Vector3 | null>(null);
  const targetLookAtRef = useRef<THREE.Vector3 | null>(null);

  const [hydroGisDataset, setHydroGisDataset] = useState<HydrologyGISDataset | null>(null);

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
    infrastructureGroupRef.current.visible = Boolean(layers.infrastructure);
    vegetationGroupRef.current.visible = Boolean(layers.vegetation);
    sensorsGroupRef.current.visible = layers.sensors;
    groundwaterGroupRef.current.visible = layers.groundwater;
    steriRiskGroupRef.current.visible = Boolean(layers.steriRisk);
    if (floodMeshRef.current) floodMeshRef.current.visible = layers.floodRisk;
    pollutionPlumeGroupRef.current.visible = layers.pollution;
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
    scene.add(infrastructureGroupRef.current);
    scene.add(vegetationGroupRef.current);
    scene.add(sensorsGroupRef.current);
    scene.add(groundwaterGroupRef.current);
    scene.add(steriRiskGroupRef.current);
    scene.add(pollutionPlumeGroupRef.current);

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
      geoTo3D,
      vector3DToGeo,
      sampleElevation: sampleTiruppurElevation,
      hydrologyDataset: hydroGisDataset,
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
    const plumeParticles = hydroRes.plumeParticles;

    // 3. Roads Layer Builder
    const roadsRes = buildRoadsLayer(builderCtx);
    roadsGroupRef.current.clear();
    roadsGroupRef.current.add(roadsRes.roadsGroup);

    // 4. Urban Buildings Layer Builder
    const urbanRes = buildUrbanLayer(builderCtx);
    buildingsGroupRef.current.clear();
    buildingsGroupRef.current.add(urbanRes.buildingsGroup);

    // 5. Industrial Facilities Builder
    const industrialRes = buildIndustrialLayer(builderCtx);
    unitsGroupRef.current.clear();
    unitsGroupRef.current.add(industrialRes.unitsGroup);

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

    // 9. Sensor Station Beacons
    sensorsGroupRef.current.clear();
    SENSOR_NODES_GEO.forEach((sensor) => {
      const pos = geoTo3D(sensor.lat, sensor.lon, 0.5);
      const group = new THREE.Group();
      group.position.copy(pos);

      const beaconGeo = new THREE.CylinderGeometry(0.3, 0.6, 2.5, 8);
      const beaconMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.6 });
      const mesh = new THREE.Mesh(beaconGeo, beaconMat);
      mesh.castShadow = true;
      mesh.userData = { type: "sensor", data: sensor };
      group.add(mesh);
      interactiveObjectsRef.current.push(mesh);

      sensorsGroupRef.current.add(group);
    });

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
            id: uData.data.id,
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
          onSelectNode({
            id: uData.data.unit_id,
            name: uData.data.name,
            type: "unit",
            designation: uData.data.type,
            latitude: uData.data.lat,
            longitude: uData.data.lon,
            status: uData.data.status,
            statusSymbol: uData.data.symbol,
            reusePercent: uData.data.reuse,
            flowRate: uData.data.flow,
            ph: 6.8,
            ec: 2850,
            turbidity: 45,
            confidence: uData.data.status === "INVESTIGATE" ? 87 : 96,
            topSource: uData.data.unit_id,
            lastEventId: uData.data.status === "INVESTIGATE" ? "E-1028" : undefined,
            raw: uData.data,
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

        // Animate Pollution Plume Particles (Fix #9)
        if (layers.pollution) {
          plumeParticles.forEach((particle, idx) => {
            const t = ((elapsedTime * 0.12 + idx / (plumeParticles.length || 16)) % 1);
            const pPos = riverCurveRef.current!.getPoint(t);
            particle.position.copy(pPos);
            particle.position.y += 0.3;
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
  }, [autoRotate, onSelectNode, hydroGisDataset]);

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
