"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { getUnits } from "@/lib/api";
import type { LedgerUnit } from "@/lib/types";

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
}

export type UnitStatusType = "COMPLIANT" | "WARNING" | "INVESTIGATE" | "OFFLINE";

export interface SelectedNodeInfo {
  id: string;
  name: string;
  type: "sensor" | "unit" | "groundwater" | "terrain";
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

const INDUSTRIAL_UNITS_GEO = [
  { unit_id: "unit_001", name: "Arulpuram CETP Dyeing Unit 001", lat: 11.0835, lon: 77.3210, type: "Dyeing & Bleaching", status: "COMPLIANT", symbol: "●", reuse: 92, flow: 145 },
  { unit_id: "unit_002", name: "Veerapandi Dyeing Unit 002", lat: 11.0740, lon: 77.3520, type: "Textile Processing", status: "COMPLIANT", symbol: "●", reuse: 89, flow: 110 },
  { unit_id: "unit_003", name: "Mangalam Road Unit 003", lat: 11.1020, lon: 77.2840, type: "ZLD Dyeing Unit", status: "WARNING", symbol: "▲", reuse: 84, flow: 160 },
  { unit_id: "unit_004", name: "Kasipalayam Dyeing Unit 004", lat: 11.1190, lon: 77.3950, type: "Garment Washing", status: "COMPLIANT", symbol: "●", reuse: 94, flow: 98 },
  { unit_id: "unit_005", name: "Rayapuram Processing Unit 005", lat: 11.1140, lon: 77.3510, type: "Yarn Dyeing", status: "COMPLIANT", symbol: "●", reuse: 91, flow: 125 },
  { unit_id: "unit_006", name: "Tiruppur North CETP Unit 006", lat: 11.1350, lon: 77.3480, type: "CETP Member Facility", status: "COMPLIANT", symbol: "●", reuse: 95, flow: 210 },
  { unit_id: "unit_007", name: "Angeripalayam Processing 007", lat: 11.1420, lon: 77.3310, type: "Fabric Processing", status: "INVESTIGATE", symbol: "!", reuse: 76, flow: 185 },
  { unit_id: "unit_008", name: "Murugampalayam Dyeing 008", lat: 11.0890, lon: 77.3620, type: "Textile Finishing", status: "COMPLIANT", symbol: "●", reuse: 88, flow: 105 },
  { unit_id: "unit_009", name: "Nallur Industrial Cluster 009", lat: 11.0780, lon: 77.3780, type: "Dyeing Unit", status: "COMPLIANT", symbol: "●", reuse: 90, flow: 130 },
  { unit_id: "unit_010", name: "Palayakkarai Hub Unit 010", lat: 11.1110, lon: 77.4420, type: "Textile Processing", status: "WARNING", symbol: "▲", reuse: 81, flow: 140 },
  { unit_id: "unit_011", name: "Uthukuli Road Unit 011", lat: 11.1280, lon: 77.4120, type: "Bleaching & Dyeing", status: "COMPLIANT", symbol: "●", reuse: 93, flow: 115 },
  { unit_id: "unit_012", name: "Vijayapuram Processing 012", lat: 11.0960, lon: 77.3380, type: "ZLD Facility", status: "COMPLIANT", symbol: "●", reuse: 96, flow: 175 },
];

const GROUNDWATER_FIRKAS_GEO = [
  { id: "firka_north", name: "Tiruppur North FIRKA", lat: 11.1320, lon: 77.3450, category: "Critical", draftRatio: "88%", color: 0xf59e0b },
  { id: "firka_south", name: "Tiruppur South FIRKA", lat: 11.0820, lon: 77.3550, category: "Over-Exploited", draftRatio: "112%", color: 0xef4444 },
  { id: "firka_avinashi", name: "Avinashi FIRKA", lat: 11.1920, lon: 77.2680, category: "Over-Exploited", draftRatio: "105%", color: 0xef4444 },
  { id: "firka_palladam", name: "Palladam FIRKA", lat: 11.0020, lon: 77.2880, category: "Critical", draftRatio: "92%", color: 0xf59e0b },
  { id: "firka_samalapuram", name: "Samalapuram FIRKA", lat: 11.0620, lon: 77.2380, category: "Semi-Critical", draftRatio: "74%", color: 0xeab308 },
  { id: "firka_uthukuli", name: "Uthukuli FIRKA", lat: 11.1620, lon: 77.4380, category: "Safe", draftRatio: "48%", color: 0x10b981 },
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
  const unitsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const sensorsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const groundwaterGroupRef = useRef<THREE.Group>(new THREE.Group());
  const floodMeshRef = useRef<THREE.Mesh | null>(null);
  const pollutionPlumeGroupRef = useRef<THREE.Group>(new THREE.Group());
  const riverFlowArrowsGroupRef = useRef<THREE.Group>(new THREE.Group());

  const interactiveObjectsRef = useRef<THREE.Object3D[]>([]);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const riverCurveRef = useRef<THREE.CatmullRomCurve3 | null>(null);

  // Lerp Camera Animation Target
  const targetCamPosRef = useRef<THREE.Vector3 | null>(null);
  const targetLookAtRef = useRef<THREE.Vector3 | null>(null);

  // Smooth Camera Fly-To when focusPosition changes (Fix #19)
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
    unitsGroupRef.current.visible = layers.units;
    sensorsGroupRef.current.visible = layers.sensors;
    groundwaterGroupRef.current.visible = layers.groundwater;
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
    scene.add(riverFlowArrowsGroupRef.current);
    scene.add(unitsGroupRef.current);
    scene.add(sensorsGroupRef.current);
    scene.add(groundwaterGroupRef.current);
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

    // 1. DEM Terrain Geometry
    const terrainWidth = 140;
    const terrainDepth = 140;
    const terrainSegs = 120;
    const geometry = new THREE.PlaneGeometry(terrainWidth, terrainDepth, terrainSegs, terrainSegs);
    geometry.rotateX(-Math.PI / 2);

    const posAttr = geometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const lon = TIRUPPUR_CENTER_LON + x / (METERS_PER_DEG_LON * WORLD_SCALE);
      const lat = TIRUPPUR_CENTER_LAT - z / (METERS_PER_DEG_LAT * WORLD_SCALE);
      posAttr.setY(i, sampleTiruppurElevation(lat, lon));
    }
    geometry.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.15 });
    const terrainMesh = new THREE.Mesh(geometry, terrainMat);
    terrainMesh.receiveShadow = true;
    terrainGroupRef.current.add(terrainMesh);
    terrainMeshRef.current = terrainMesh;
    interactiveObjectsRef.current.push(terrainMesh);

    // 2. GIS Contour Line Rings (Fix #22)
    const contourLevels = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0];
    contourLevels.forEach((level) => {
      const contourGrid = new THREE.GridHelper(140, 35, 0x0d9488, 0x1e293b);
      contourGrid.position.y = level;
      contourGroupRef.current.add(contourGrid);
    });

    // 3. Noyyal River Geometry & Directional Flow Arrows (Fix #21)
    const riverPoints: THREE.Vector3[] = [];
    for (let l = 77.24; l <= 77.54; l += 0.015) {
      const lat = 11.108 + 0.008 * Math.sin((l - 77.25) * 12);
      riverPoints.push(geoTo3D(lat, l, 0.25));
    }
    const riverCurve = new THREE.CatmullRomCurve3(riverPoints);
    riverCurveRef.current = riverCurve;

    const tubeGeo = new THREE.TubeGeometry(riverCurve, 80, 0.5, 8, false);
    const riverMesh = new THREE.Mesh(tubeGeo, new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0284c7, emissiveIntensity: 0.4, roughness: 0.1 }));
    riverGroupRef.current.add(riverMesh);

    // Directional Flow Particle Indicators (~~~~~~~~~~~~~~→→→→→)
    const flowCount = 12;
    const flowParticles: THREE.Mesh[] = [];
    const arrowGeo = new THREE.ConeGeometry(0.3, 0.8, 6);
    arrowGeo.rotateX(Math.PI / 2);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    for (let f = 0; f < flowCount; f++) {
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      riverFlowArrowsGroupRef.current.add(arrow);
      flowParticles.push(arrow);
    }

    // 4. Pollution Plume Particles (Fix #9)
    const plumeParticleCount = 16;
    const plumeParticles: THREE.Mesh[] = [];
    const plumeGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const plumeMat = new THREE.MeshBasicMaterial({ color: 0xdc2626, transparent: true, opacity: 0.85 });

    for (let p = 0; p < plumeParticleCount; p++) {
      const particle = new THREE.Mesh(plumeGeo, plumeMat);
      pollutionPlumeGroupRef.current.add(particle);
      plumeParticles.push(particle);
    }

    // 5. Flood Mesh Plane
    const floodGeo = new THREE.PlaneGeometry(140, 140);
    floodGeo.rotateX(-Math.PI / 2);
    const floodMesh = new THREE.Mesh(floodGeo, new THREE.MeshStandardMaterial({ color: 0x0284c7, transparent: true, opacity: 0.45 }));
    floodMesh.position.y = 0.6;
    floodMesh.visible = layers.floodRisk;
    scene.add(floodMesh);
    floodMeshRef.current = floodMesh;

    // 6. Sensor Station Beacons
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

    // 7. Industrial Units with Accessible Status Badges
    INDUSTRIAL_UNITS_GEO.forEach((unit, idx) => {
      const pos = geoTo3D(unit.lat, unit.lon, 0);
      const bldgHeight = 2.0 + (idx % 3) * 0.8;

      const group = new THREE.Group();
      group.position.copy(pos);

      const bldgGeo = new THREE.BoxGeometry(2.2, bldgHeight, 2.2);
      const bldgMesh = new THREE.Mesh(bldgGeo, new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.4, roughness: 0.6 }));
      bldgMesh.position.y = bldgHeight / 2;
      group.add(bldgMesh);

      let statusColor = 0x10b981;
      if (unit.status === "WARNING") statusColor = 0xf59e0b;
      if (unit.status === "INVESTIGATE") statusColor = 0xdc2626;

      const beaconMesh = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 12), new THREE.MeshStandardMaterial({ color: statusColor, emissive: statusColor, emissiveIntensity: 0.8 }));
      beaconMesh.position.y = bldgHeight + 0.6;
      beaconMesh.userData = { type: "unit", data: unit };
      group.add(beaconMesh);

      interactiveObjectsRef.current.push(beaconMesh);
      unitsGroupRef.current.add(group);
    });

    // 8. Groundwater FIRKA Zones
    GROUNDWATER_FIRKAS_GEO.forEach((firka) => {
      const pos = geoTo3D(firka.lat, firka.lon, 0.1);
      const firkaMesh = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 0.4, 24), new THREE.MeshStandardMaterial({ color: firka.color, transparent: true, opacity: 0.35 }));
      firkaMesh.position.copy(pos);
      firkaMesh.userData = { type: "groundwater", data: firka };
      interactiveObjectsRef.current.push(firkaMesh);
      groundwaterGroupRef.current.add(firkaMesh);
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
          const t = ((elapsedTime * 0.08 + idx / flowCount) % 1);
          const pPos = riverCurveRef.current!.getPoint(t);
          const tangent = riverCurveRef.current!.getTangent(t);
          arrow.position.copy(pPos);
          arrow.position.y += 0.35;
          arrow.lookAt(pPos.clone().add(tangent));
        });

        // Animate Pollution Plume Particles (Fix #9)
        if (layers.pollution) {
          plumeParticles.forEach((particle, idx) => {
            const t = ((elapsedTime * 0.12 + idx / plumeParticleCount) % 1);
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
  }, [autoRotate, onSelectNode]);

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
