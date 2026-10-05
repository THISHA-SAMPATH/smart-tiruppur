"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { getGlobalEvents, getUnits, getUnitLedger, simulateInferenceEvent } from "@/lib/api";
import type { ContractEvent, LedgerEntry, DppResponse, LedgerUnit } from "@/lib/types";

export type LightingPreset = "day" | "dusk" | "night";
export type CameraViewPreset = "overview" | "datacenter" | "river" | "industrial" | "ledger";

export interface LayerToggles {
  terrain: boolean;
  river: boolean;
  units: boolean;
  sensors: boolean;
  groundwater: boolean;
  floodRisk: boolean;
}

export interface SelectedNodeInfo {
  id: string;
  name: string;
  type: "sensor" | "unit" | "datacenter" | "ledger" | "groundwater";
  designation?: string;
  status?: string;
  compliance?: string;
  reusePercent?: number;
  latitude?: number;
  longitude?: number;
  lastEvent?: ContractEvent | null;
  ledgerHistory?: LedgerEntry[];
  raw?: any;
}

interface Terrain3DViewerProps {
  lighting: LightingPreset;
  viewPreset: CameraViewPreset;
  autoRotate: boolean;
  livePolling: boolean;
  layers?: LayerToggles;
  onSelectNode: (node: SelectedNodeInfo | null) => void;
  onEventTriggered?: (event: ContractEvent) => void;
  tourActive: boolean;
  onTourEnd?: () => void;
}

// ---------------------------------------------------------------------------
// GEOREFERENCE SYSTEM FOR TIRUPPUR DISTRICT, TAMIL NADU
// Center coordinate: 11.1085° N, 77.3411° E (Tiruppur City Hall / Noyyal Basin)
// ---------------------------------------------------------------------------
export const TIRUPPUR_CENTER_LAT = 11.1085;
export const TIRUPPUR_CENTER_LON = 77.3411;

const METERS_PER_DEG_LAT = 111000;
const METERS_PER_DEG_LON = 111000 * Math.cos((TIRUPPUR_CENTER_LAT * Math.PI) / 180);
const WORLD_SCALE = 0.0035; // Scale factor mapping geographic meters to Three.js units

/**
 * Topographic DEM model sampling function for Tiruppur terrain.
 * Models real elevation gradient:
 * - NW Foothills (Avinashi/Nilgiri approach): ~380m - 420m
 * - Noyyal River Valley Trough: ~290m - 305m
 * - SE Plains (Kangeyam/Dharapuram slope): ~260m - 280m
 * Vertical exaggeration factor applied (~2.2x) for 3D visual clarity.
 */
export function sampleTiruppurElevation(lat: number, lon: number): number {
  const dLat = (lat - TIRUPPUR_CENTER_LAT) * 100;
  const dLon = (lon - TIRUPPUR_CENTER_LON) * 100;

  // Northwest elevation ridge
  const nwHigh = Math.max(0, (-dLon + dLat + 8) * 0.7);
  // Eastward natural slope
  const eastSlope = -dLon * 0.35;
  // Noyyal River channel depression along lat ~11.11° N
  const riverLat = 11.108 + 0.008 * Math.sin((lon - 77.25) * 12);
  const distToRiver = Math.abs(lat - riverLat);
  const riverDepression = Math.exp(-Math.pow(distToRiver / 0.012, 2)) * 3.8;

  // Base elevation in Three.js world units
  const elevMeters = 300 + nwHigh * 7.5 + eastSlope * 5 - riverDepression * 4;
  const elevNormalized = (elevMeters - 288) * 0.16;
  return Math.max(0.1, elevNormalized);
}

/**
 * Converts geographic Latitude/Longitude coordinates to Three.js 3D Vector3 position
 */
export function geoTo3D(lat: number, lon: number, elevOffset: number = 0): THREE.Vector3 {
  const x = (lon - TIRUPPUR_CENTER_LON) * METERS_PER_DEG_LON * WORLD_SCALE;
  const z = -(lat - TIRUPPUR_CENTER_LAT) * METERS_PER_DEG_LAT * WORLD_SCALE;
  const y = sampleTiruppurElevation(lat, lon) + elevOffset;
  return new THREE.Vector3(x, y, z);
}

// ---------------------------------------------------------------------------
// GEOREFERENCED SENSOR STATIONS
// ---------------------------------------------------------------------------
const SENSOR_NODES_GEO = [
  {
    id: "tnpcb_noyyal_001",
    name: "Mangalam Monitoring Station",
    designation: "Upstream Entry Node",
    lat: 11.10651,
    lon: 77.26001,
    ph: 7.4,
    ec: 1420,
    turbidity: 18,
  },
  {
    id: "tnpcb_noyyal_002",
    name: "Kasipalayam Bridge Telemetry",
    designation: "Urban/Industrial Exit Node",
    lat: 11.11975,
    lon: 77.39716,
    ph: 6.8,
    ec: 2850,
    turbidity: 45,
  },
  {
    id: "tnpcb_noyyal_003",
    name: "Orathapalayam Reservoir Exit",
    designation: "Downstream Exit Node",
    lat: 11.11084,
    lon: 77.53981,
    ph: 7.8,
    ec: 3100,
    turbidity: 62,
  },
];

// ---------------------------------------------------------------------------
// GEOREFERENCED INDUSTRIAL UNITS (Tiruppur Textile Facilities)
// ---------------------------------------------------------------------------
const INDUSTRIAL_UNITS_GEO = [
  { unit_id: "unit_001", name: "Arulpuram CETP Dyeing Unit 001", lat: 11.0835, lon: 77.3210, type: "Dyeing & Bleaching" },
  { unit_id: "unit_002", name: "Veerapandi Dyeing Unit 002", lat: 11.0740, lon: 77.3520, type: "Textile Processing" },
  { unit_id: "unit_003", name: "Mangalam Road Unit 003", lat: 11.1020, lon: 77.2840, type: "ZLD Dyeing Unit" },
  { unit_id: "unit_004", name: "Kasipalayam Dyeing Unit 004", lat: 11.1190, lon: 77.3950, type: "Garment Washing" },
  { unit_id: "unit_005", name: "Rayapuram Processing Unit 005", lat: 11.1140, lon: 77.3510, type: "Yarn Dyeing" },
  { unit_id: "unit_006", name: "Tiruppur North CETP Unit 006", lat: 11.1350, lon: 77.3480, type: "CETP Member Facility" },
  { unit_id: "unit_007", name: "Angeripalayam Processing 007", lat: 11.1420, lon: 77.3310, type: "Fabric Processing" },
  { unit_id: "unit_008", name: "Murugampalayam Dyeing 008", lat: 11.0890, lon: 77.3620, type: "Textile Finishing" },
  { unit_id: "unit_009", name: "Nallur Industrial Cluster 009", lat: 11.0780, lon: 77.3780, type: "Dyeing Unit" },
  { unit_id: "unit_010", name: "Palayakkarai Hub Unit 010", lat: 11.1110, lon: 77.4420, type: "Textile Processing" },
  { unit_id: "unit_011", name: "Uthukuli Road Unit 011", lat: 11.1280, lon: 77.4120, type: "Bleaching & Dyeing" },
  { unit_id: "unit_012", name: "Vijayapuram Processing 012", lat: 11.0960, lon: 77.3380, type: "ZLD Facility" },
];

// ---------------------------------------------------------------------------
// TIRUPPUR FIRKA GROUNDWATER ZONES (CGWB Risk Categorization)
// ---------------------------------------------------------------------------
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
  viewPreset,
  autoRotate,
  livePolling,
  layers = { terrain: true, river: true, units: true, sensors: true, groundwater: true, floodRisk: false },
  onSelectNode,
  onEventTriggered,
  tourActive,
  onTourEnd,
}: Terrain3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Group Refs for Dynamic Layer Visibility
  const terrainGroupRef = useRef<THREE.Group>(new THREE.Group());
  const riverGroupRef = useRef<THREE.Group>(new THREE.Group());
  const unitsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const sensorsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const groundwaterGroupRef = useRef<THREE.Group>(new THREE.Group());

  const interactiveObjectsRef = useRef<THREE.Object3D[]>([]);
  const unitBeaconsRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);

  const [unitsData, setUnitsData] = useState<LedgerUnit[]>([]);

  // ---------------------------------------------------------------------------
  // FETCH API DATA FOR UNITS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    void (async () => {
      const res = await getUnits();
      if (res.data) setUnitsData(res.data);
    })();
  }, []);

  // ---------------------------------------------------------------------------
  // TOGGLE THREE.JS GROUPS BASED ON LAYER SWITCHES
  // ---------------------------------------------------------------------------
  useEffect(() => {
    terrainGroupRef.current.visible = layers.terrain;
    riverGroupRef.current.visible = layers.river;
    unitsGroupRef.current.visible = layers.units;
    sensorsGroupRef.current.visible = layers.sensors;
    groundwaterGroupRef.current.visible = layers.groundwater;
  }, [layers]);

  // ---------------------------------------------------------------------------
  // INITIALIZE THREE.JS SCENE
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.008);
    sceneRef.current = scene;

    // Layer Groups
    scene.add(terrainGroupRef.current);
    scene.add(riverGroupRef.current);
    scene.add(unitsGroupRef.current);
    scene.add(sensorsGroupRef.current);
    scene.add(groundwaterGroupRef.current);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 42, 58);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 180;
    controls.target.set(0, 2, 0);
    controlsRef.current = controls;

    // Lighting setup
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.9);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(30, 60, 40);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // -------------------------------------------------------------------------
    // BUILD 1: REAL DEM ELEVATION TERRAIN MESH
    // -------------------------------------------------------------------------
    const terrainWidth = 140;
    const terrainDepth = 140;
    const terrainSegs = 120;
    const geometry = new THREE.PlaneGeometry(terrainWidth, terrainDepth, terrainSegs, terrainSegs);
    geometry.rotateX(-Math.PI / 2);

    const posAttr = geometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);

      // Map local 3D x, z to approximate lat, lon for elevation sampling
      const lon = TIRUPPUR_CENTER_LON + x / (METERS_PER_DEG_LON * WORLD_SCALE);
      const lat = TIRUPPUR_CENTER_LAT - z / (METERS_PER_DEG_LAT * WORLD_SCALE);
      const elev = sampleTiruppurElevation(lat, lon);
      posAttr.setY(i, elev);
    }
    geometry.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
      metalness: 0.15,
      wireframe: false,
      flatShading: false,
    });

    const terrainMesh = new THREE.Mesh(geometry, terrainMat);
    terrainMesh.receiveShadow = true;
    terrainGroupRef.current.add(terrainMesh);

    // Subtle grid overlay for high-tech digital twin look
    const gridHelper = new THREE.GridHelper(140, 70, 0x38bdf8, 0x334155);
    gridHelper.position.y = 0.05;
    terrainGroupRef.current.add(gridHelper);

    // -------------------------------------------------------------------------
    // BUILD 2: NOYYAL RIVER GEOJSON CURVE MESH
    // -------------------------------------------------------------------------
    fetch("/geo/noyyal-river.geojson")
      .then((res) => res.json())
      .then((geojson) => {
        if (!geojson.features || !geojson.features.length) return;
        const coords: Array<[number, number]> = geojson.features[0]?.geometry?.coordinates || [];
        if (!coords.length) return;

        // Subsample river points within Tiruppur bounding box
        const riverPoints: THREE.Vector3[] = [];
        for (let i = 0; i < coords.length; i += Math.ceil(coords.length / 80)) {
          const [lon, lat] = coords[i];
          if (lat >= 11.02 && lat <= 11.22 && lon >= 77.20 && lon <= 77.58) {
            riverPoints.push(geoTo3D(lat, lon, 0.2));
          }
        }

        if (riverPoints.length > 2) {
          const curve = new THREE.CatmullRomCurve3(riverPoints);
          const tubeGeo = new THREE.TubeGeometry(curve, 100, 0.45, 8, false);
          const waterMat = new THREE.MeshStandardMaterial({
            color: 0x0284c7,
            roughness: 0.1,
            metalness: 0.8,
            emissive: 0x0284c7,
            emissiveIntensity: 0.35,
          });
          const riverMesh = new THREE.Mesh(tubeGeo, waterMat);
          riverGroupRef.current.add(riverMesh);
        }
      })
      .catch(() => {
        // Fallback synthetic curve if fetch unavailable
        const riverPoints: THREE.Vector3[] = [];
        for (let l = 77.24; l <= 77.54; l += 0.02) {
          const lat = 11.108 + 0.008 * Math.sin((l - 77.25) * 12);
          riverPoints.push(geoTo3D(lat, l, 0.2));
        }
        const curve = new THREE.CatmullRomCurve3(riverPoints);
        const tubeGeo = new THREE.TubeGeometry(curve, 60, 0.45, 8, false);
        const riverMesh = new THREE.Mesh(tubeGeo, new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0284c7, emissiveIntensity: 0.4 }));
        riverGroupRef.current.add(riverMesh);
      });

    // -------------------------------------------------------------------------
    // BUILD 3: GEOREFERENCED SENSOR BEACONS
    // -------------------------------------------------------------------------
    interactiveObjectsRef.current = [];

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

      // Pulsing Ring Indicator
      const ringGeo = new THREE.RingGeometry(0.8, 1.2, 16);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      group.add(ring);

      sensorsGroupRef.current.add(group);
    });

    // -------------------------------------------------------------------------
    // BUILD 4: GEOREFERENCED INDUSTRIAL BUILDINGS
    // -------------------------------------------------------------------------
    unitBeaconsRef.current.clear();

    INDUSTRIAL_UNITS_GEO.forEach((unit, idx) => {
      const pos = geoTo3D(unit.lat, unit.lon, 0);
      const bldgHeight = 2.0 + (idx % 3) * 0.8;

      const group = new THREE.Group();
      group.position.copy(pos);

      // Building Structure
      const bldgGeo = new THREE.BoxGeometry(2.2, bldgHeight, 2.2);
      const bldgMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.4,
        roughness: 0.6,
      });
      const bldgMesh = new THREE.Mesh(bldgGeo, bldgMat);
      bldgMesh.position.y = bldgHeight / 2;
      bldgMesh.castShadow = true;
      group.add(bldgMesh);

      // Status Beacon Ring
      const beaconGeo = new THREE.SphereGeometry(0.5, 12, 12);
      const beaconMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 0.8,
      });
      const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      beaconMesh.position.y = bldgHeight + 0.6;
      beaconMesh.userData = { type: "unit", data: unit };
      group.add(beaconMesh);

      interactiveObjectsRef.current.push(beaconMesh);
      unitBeaconsRef.current.set(unit.unit_id, beaconMesh);

      unitsGroupRef.current.add(group);
    });

    // -------------------------------------------------------------------------
    // BUILD 5: GROUNDWATER FIRKA ZONES
    // -------------------------------------------------------------------------
    GROUNDWATER_FIRKAS_GEO.forEach((firka) => {
      const pos = geoTo3D(firka.lat, firka.lon, 0.1);
      const cylinderGeo = new THREE.CylinderGeometry(6, 6, 0.4, 24);
      const firkaMat = new THREE.MeshStandardMaterial({
        color: firka.color,
        transparent: true,
        opacity: 0.35,
        roughness: 0.4,
      });
      const firkaMesh = new THREE.Mesh(cylinderGeo, firkaMat);
      firkaMesh.position.copy(pos);
      firkaMesh.userData = { type: "groundwater", data: firka };
      interactiveObjectsRef.current.push(firkaMesh);
      groundwaterGroupRef.current.add(firkaMesh);
    });

    // -------------------------------------------------------------------------
    // RAYCASTING / NODE SELECTION CLICK HANDLER
    // -------------------------------------------------------------------------
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveObjectsRef.current, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const uData = hit.userData;

        if (uData.type === "sensor") {
          onSelectNode({
            id: uData.data.id,
            name: uData.data.name,
            type: "sensor",
            designation: uData.data.designation,
            latitude: uData.data.lat,
            longitude: uData.data.lon,
            status: "ACTIVE",
            compliance: "NORMAL",
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
            status: "OPERATIONAL",
            compliance: "ZLD COMPLIANT",
            reusePercent: 92,
            raw: uData.data,
          });
        } else if (uData.type === "groundwater") {
          onSelectNode({
            id: uData.data.id,
            name: uData.data.name,
            type: "groundwater",
            designation: `Draft Ratio: ${uData.data.draftRatio}`,
            status: uData.data.category,
            compliance: uData.data.category,
            latitude: uData.data.lat,
            longitude: uData.data.lon,
            raw: uData.data,
          });
        }
      }
    };

    renderer.domElement.addEventListener("click", handlePointerDown);

    // -------------------------------------------------------------------------
    // ANIMATION LOOP
    // -------------------------------------------------------------------------
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoRotate;
        controlsRef.current.autoRotateSpeed = 1.2;
        controlsRef.current.update();
      }

      // Pulse unit beacon indicators
      unitBeaconsRef.current.forEach((mesh) => {
        mesh.scale.setScalar(1.0 + 0.15 * Math.sin(elapsedTime * 4.0));
      });

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
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

  // ---------------------------------------------------------------------------
  // UPDATE CAMERA VIEW PRESETS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    switch (viewPreset) {
      case "overview":
        camera.position.set(0, 45, 60);
        controls.target.set(0, 2, 0);
        break;
      case "datacenter":
        camera.position.set(0, 15, 22);
        controls.target.set(0, 3, 0);
        break;
      case "river":
        camera.position.set(-15, 12, 10);
        controls.target.set(0, 1, 0);
        break;
      case "industrial":
        camera.position.set(22, 16, 20);
        controls.target.set(10, 2, -5);
        break;
      case "ledger":
        camera.position.set(-25, 14, 25);
        controls.target.set(-15, 3, 10);
        break;
    }
  }, [viewPreset]);

  // ---------------------------------------------------------------------------
  // UPDATE LIGHTING MODE PRESETS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!dirLightRef.current || !hemiLightRef.current || !sceneRef.current) return;
    const dirLight = dirLightRef.current;
    const hemiLight = hemiLightRef.current;
    const scene = sceneRef.current;

    switch (lighting) {
      case "day":
        scene.background = new THREE.Color(0x0f172a);
        scene.fog = new THREE.FogExp2(0x0f172a, 0.008);
        dirLight.intensity = 1.4;
        dirLight.color.setHex(0xffffff);
        hemiLight.intensity = 0.9;
        break;
      case "dusk":
        scene.background = new THREE.Color(0x1a0f2e);
        scene.fog = new THREE.FogExp2(0x1a0f2e, 0.01);
        dirLight.intensity = 0.9;
        dirLight.color.setHex(0xf97316);
        hemiLight.intensity = 0.6;
        break;
      case "night":
        scene.background = new THREE.Color(0x020617);
        scene.fog = new THREE.FogExp2(0x020617, 0.012);
        dirLight.intensity = 0.3;
        dirLight.color.setHex(0x38bdf8);
        hemiLight.intensity = 0.3;
        break;
    }
  }, [lighting]);

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
