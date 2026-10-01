"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { getGlobalEvents, getUnits, getUnitLedger, simulateInferenceEvent } from "@/lib/api";
import type { ContractEvent, LedgerUnit, LedgerEntry } from "@/lib/types";

export type LightingPreset = "day" | "dusk" | "night";
export type CameraViewPreset = "overview" | "datacenter" | "river" | "industrial" | "ledger";

export interface SelectedNodeInfo {
  id: string;
  name: string;
  type: "sensor" | "unit" | "datacenter" | "ledger";
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
  onSelectNode: (node: SelectedNodeInfo | null) => void;
  onEventTriggered?: (event: ContractEvent) => void;
  tourActive: boolean;
  onTourEnd?: () => void;
}

// ---------------------------------------------------------------------------
// 3D SCENE CONSTANTS & PHYSICAL LOCATIONS FOR TIRUPPUR MONITORING NETWORK
// ---------------------------------------------------------------------------

// Real River Monitoring Stations along Noyyal River
const SENSOR_NODES = [
  {
    id: "tnpcb_noyyal_001",
    name: "Mangalam Monitoring Station",
    designation: "Upstream Entry Node",
    lat: 11.10651,
    lon: 77.26001,
    pos: new THREE.Vector3(-45, 1.8, 12),
    color: 0x0284c7,
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
    pos: new THREE.Vector3(25, 1.4, -12),
    color: 0x0284c7,
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
    pos: new THREE.Vector3(85, 1.2, -4),
    color: 0x0284c7,
    ph: 7.8,
    ec: 3100,
    turbidity: 62,
  },
];

// Central AI Inference Data Center & Ledger Anchor
const DATA_CENTER_POS = new THREE.Vector3(0, 4.8, 0);
const LEDGER_ANCHOR_POS = new THREE.Vector3(-18, 4.0, 14);

// 12 Industrial Units in Tiruppur textile belt mapped to 3D terrain coordinates
const INDUSTRIAL_UNITS_CONFIG: Array<{
  unit_id: string;
  name: string;
  pos: THREE.Vector3;
  type: string;
}> = [
  { unit_id: "unit_001", name: "Arulpuram CETP Dyeing Unit 001", pos: new THREE.Vector3(-22, 2.5, 8), type: "Dyeing & Bleaching" },
  { unit_id: "unit_002", name: "Veerapandi Dyeing Unit 002", pos: new THREE.Vector3(-14, 2.6, -10), type: "Textile Processing" },
  { unit_id: "unit_003", name: "Mangalam Road Unit 003", pos: new THREE.Vector3(-34, 2.2, 18), type: "ZLD Dyeing Unit" },
  { unit_id: "unit_004", name: "Kasipalayam Dyeing Unit 004", pos: new THREE.Vector3(18, 2.3, -18), type: "Garment Washing" },
  { unit_id: "unit_005", name: "Rayapuram Processing Unit 005", pos: new THREE.Vector3(6, 2.8, -22), type: "Yarn Dyeing" },
  { unit_id: "unit_006", name: "Tiruppur North CETP Unit 006", pos: new THREE.Vector3(12, 2.4, -6), type: "CETP Member Facility" },
  { unit_id: "unit_007", name: "Angeripalayam Processing 007", pos: new THREE.Vector3(-8, 2.9, -24), type: "Fabric Processing" },
  { unit_id: "unit_008", name: "Murugampalayam Dyeing 008", pos: new THREE.Vector3(-16, 2.3, 22), type: "Textile Finishing" },
  { unit_id: "unit_009", name: "Nallur Industrial Cluster 009", pos: new THREE.Vector3(-2, 2.5, 20), type: "Dyeing Unit" },
  { unit_id: "unit_010", name: "Palayakkarai Hub Unit 010", pos: new THREE.Vector3(42, 2.0, -6), type: "Textile Processing" },
  { unit_id: "unit_011", name: "Uthukuli Road Unit 011", pos: new THREE.Vector3(30, 2.4, -22), type: "Bleaching & Dyeing" },
  { unit_id: "unit_012", name: "Vijayapuram Processing 012", pos: new THREE.Vector3(-28, 2.4, -14), type: "ZLD Facility" },
];

export default function Terrain3DViewer({
  lighting,
  viewPreset,
  autoRotate,
  livePolling,
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

  // Mesh registries for interaction & animation
  const interactiveObjectsRef = useRef<THREE.Object3D[]>([]);
  const unitBeaconsRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const sensorNodesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const pulseBeamsRef = useRef<Array<{ mesh: THREE.Line | THREE.Points; progress: number; speed: number; onComplete?: () => void }>>([]);
  const waterMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);

  const [activeEvents, setActiveEvents] = useState<ContractEvent[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeName, setHoveredNodeName] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // PROCEDURAL TERRAIN & RIVER MESH GENERATION
  // ---------------------------------------------------------------------------

  const createTerrainMesh = (scene: THREE.Scene) => {
    const width = 220;
    const depth = 220;
    const segments = 120;
    const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const posAttr = geometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);

      // Calculate distance to Noyyal River winding curve
      // River curve equation: z_river = -0.2 * x + 4 * sin(x * 0.04)
      const riverZ = -0.2 * x + 5 * Math.sin(x * 0.04);
      const distToRiver = Math.abs(z - riverZ);

      // Height calculation: Valley depression along riverbed, gentle hills elsewhere
      let height = 0;
      if (distToRiver < 12) {
        // River trench
        height = -1.2 * Math.cos((distToRiver / 12) * (Math.PI / 2));
      } else {
        // Surrounding hills & Tiruppur urban basin
        const hill1 = Math.sin(x * 0.03) * Math.cos(z * 0.03) * 3.5;
        const hill2 = Math.sin(x * 0.08 + z * 0.05) * 1.5;
        height = Math.max(0.2, hill1 + hill2 + 1.2);
      }

      posAttr.setY(i, height);
    }
    geometry.computeVertexNormals();

    // Procedural terrain texture canvas
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;

    // Base topographic fill
    const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
    grad.addColorStop(0, "#1c2b23"); // Lush West Mangalam
    grad.addColorStop(0.4, "#24332a"); // Urban Tiruppur basin
    grad.addColorStop(0.8, "#2d3d32"); // East Reservoir catchment
    grad.addColorStop(1, "#18241d");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Digital twin grid overlay
    ctx.strokeStyle = "rgba(45, 212, 191, 0.08)";
    ctx.lineWidth = 1.5;
    const step = 32;
    for (let i = 0; i <= 1024; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 1024);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(1024, i);
      ctx.stroke();
    }

    // River bed contour stroke on texture
    ctx.strokeStyle = "rgba(2, 132, 199, 0.4)";
    ctx.lineWidth = 24;
    ctx.beginPath();
    for (let px = 0; px <= 1024; px += 10) {
      const worldX = (px / 1024) * 220 - 110;
      const worldZ = -0.2 * worldX + 5 * Math.sin(worldX * 0.04);
      const pz = ((worldZ + 110) / 220) * 1024;
      if (px === 0) ctx.moveTo(px, pz);
      else ctx.lineTo(px, pz);
    }
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.85,
      metalness: 0.15,
      flatShading: false,
    });

    const terrainMesh = new THREE.Mesh(geometry, material);
    terrainMesh.receiveShadow = true;
    terrainMesh.name = "TerrainMesh";
    scene.add(terrainMesh);
  };

  // ---------------------------------------------------------------------------
  // NOYYAL RIVER WATER MESH
  // ---------------------------------------------------------------------------

  const createNoyyalRiverMesh = (scene: THREE.Scene) => {
    const points: THREE.Vector3[] = [];
    for (let x = -100; x <= 100; x += 4) {
      const z = -0.2 * x + 5 * Math.sin(x * 0.04);
      points.push(new THREE.Vector3(x, -0.4, z));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 100, 2.8, 8, false);

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.82,
      emissive: 0x0369a1,
      emissiveIntensity: 0.25,
    });
    waterMaterialRef.current = waterMat;

    const riverMesh = new THREE.Mesh(tubeGeo, waterMat);
    riverMesh.name = "NoyyalRiverMesh";
    scene.add(riverMesh);
  };

  // ---------------------------------------------------------------------------
  // BUILDINGS & INFRASTRUCTURE MODELS
  // ---------------------------------------------------------------------------

  const createInfrastructureModels = (scene: THREE.Scene) => {
    interactiveObjectsRef.current = [];

    // 1. DATA CENTER MODEL (NoyyalSense AI Core)
    const dcGroup = new THREE.Group();
    dcGroup.position.copy(DATA_CENTER_POS);

    // Base pedestal
    const baseGeo = new THREE.CylinderGeometry(4.5, 5.5, 1.2, 8);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    dcGroup.add(baseMesh);

    // Glass tower core
    const towerGeo = new THREE.OctahedronGeometry(2.8, 2);
    const towerMat = new THREE.MeshPhysicalMaterial({
      color: 0x0ea5e9,
      transmission: 0.85,
      opacity: 0.9,
      transparent: true,
      roughness: 0.1,
      ior: 1.5,
      thickness: 1.2,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
    });
    const towerMesh = new THREE.Mesh(towerGeo, towerMat);
    towerMesh.position.y = 2.5;
    towerMesh.name = "node_datacenter";
    dcGroup.add(towerMesh);
    interactiveObjectsRef.current.push(towerMesh);

    // Rotating holographic ring
    const ringGeo = new THREE.TorusGeometry(3.6, 0.12, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 2.5;
    ringMesh.name = "datacenter_ring";
    dcGroup.add(ringMesh);

    scene.add(dcGroup);

    // 2. BLOCKCHAIN LEDGER ANCHOR MODEL
    const ledgerGroup = new THREE.Group();
    ledgerGroup.position.copy(LEDGER_ANCHOR_POS);

    const pedGeo = new THREE.BoxGeometry(4.0, 1.0, 4.0);
    const pedMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
    const pedMesh = new THREE.Mesh(pedGeo, pedMat);
    ledgerGroup.add(pedMesh);

    // Cryptographic Cube
    const cubeGeo = new THREE.BoxGeometry(2.2, 2.2, 2.2);
    const cubeMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      metalness: 0.95,
      roughness: 0.1,
      emissive: 0xca8a04,
      emissiveIntensity: 0.4,
    });
    const cubeMesh = new THREE.Mesh(cubeGeo, cubeMat);
    cubeMesh.position.y = 2.0;
    cubeMesh.name = "node_ledger";
    ledgerGroup.add(cubeMesh);
    interactiveObjectsRef.current.push(cubeMesh);

    scene.add(ledgerGroup);

    // 3. RIVER SENSOR STATIONS
    SENSOR_NODES.forEach((s) => {
      const sGroup = new THREE.Group();
      sGroup.position.copy(s.pos);

      // Buoy base
      const buoyGeo = new THREE.CylinderGeometry(1.2, 1.5, 1.2, 12);
      const buoyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.3 });
      const buoyMesh = new THREE.Mesh(buoyGeo, buoyMat);
      sGroup.add(buoyMesh);

      // Solar telemetry mast
      const mastGeo = new THREE.CylinderGeometry(0.15, 0.15, 2.4, 8);
      const mastMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
      const mastMesh = new THREE.Mesh(mastGeo, mastMat);
      mastMesh.position.y = 1.6;
      sGroup.add(mastMesh);

      // Pulsing status beacon sphere
      const beaconGeo = new THREE.SphereGeometry(0.6, 16, 16);
      const beaconMat = new THREE.MeshStandardMaterial({
        color: s.color,
        emissive: s.color,
        emissiveIntensity: 0.8,
      });
      const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      beaconMesh.position.y = 3.0;
      beaconMesh.name = `node_${s.id}`;
      sGroup.add(beaconMesh);
      interactiveObjectsRef.current.push(beaconMesh);
      sensorNodesRef.current.set(s.id, beaconMesh);

      scene.add(sGroup);
    });

    // 4. INDUSTRIAL UNITS (12 UNITS)
    INDUSTRIAL_UNITS_CONFIG.forEach((u) => {
      const uGroup = new THREE.Group();
      uGroup.position.copy(u.pos);

      // Factory main block
      const facGeo = new THREE.BoxGeometry(3.2, 2.0, 3.2);
      const facMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.4, roughness: 0.6 });
      const facMesh = new THREE.Mesh(facGeo, facMat);
      facMesh.position.y = 1.0;
      uGroup.add(facMesh);

      // ZLD Membrane Recycling Cylinder
      const tankGeo = new THREE.CylinderGeometry(0.8, 0.8, 2.4, 12);
      const tankMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, metalness: 0.7, roughness: 0.2 });
      const tankMesh = new THREE.Mesh(tankGeo, tankMat);
      tankMesh.position.set(1.4, 1.2, 1.4);
      uGroup.add(tankMesh);

      // Status Beacon Spire
      const spireGeo = new THREE.CylinderGeometry(0.2, 0.2, 3.2, 8);
      const spireMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
      const spireMesh = new THREE.Mesh(spireGeo, spireMat);
      spireMesh.position.y = 2.4;
      uGroup.add(spireMesh);

      // Beacon Tip Sphere (Color changes dynamically with live decision)
      const beaconGeo = new THREE.SphereGeometry(0.5, 16, 16);
      const beaconMat = new THREE.MeshStandardMaterial({
        color: 0x10b981, // Default Normal Emerald Green
        emissive: 0x10b981,
        emissiveIntensity: 0.7,
      });
      const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      beaconMesh.position.y = 4.2;
      beaconMesh.name = `node_${u.unit_id}`;
      uGroup.add(beaconMesh);

      interactiveObjectsRef.current.push(beaconMesh);
      unitBeaconsRef.current.set(u.unit_id, beaconMesh);

      scene.add(uGroup);
    });
  };

  // ---------------------------------------------------------------------------
  // ANIMATED TELEMETRY PULSE BEAMS
  // ---------------------------------------------------------------------------

  const triggerPulseAnimation = (
    fromPos: THREE.Vector3,
    toPos: THREE.Vector3,
    colorHex: number,
    onComplete?: () => void
  ) => {
    if (!sceneRef.current) return;

    // Bezier curve arc
    const midPoint = new THREE.Vector3()
      .addVectors(fromPos, toPos)
      .multiplyScalar(0.5);
    midPoint.y += 8.0; // Arch height in 3D sky

    const curve = new THREE.QuadraticBezierCurve3(fromPos, midPoint, toPos);
    const points = curve.getPoints(40);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineDashedMaterial({
      color: colorHex,
      dashSize: 1.5,
      gapSize: 0.8,
      linewidth: 3,
    });

    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    sceneRef.current.add(line);

    pulseBeamsRef.current.push({
      mesh: line,
      progress: 0,
      speed: 0.025,
      onComplete,
    });
  };

  // ---------------------------------------------------------------------------
  // LIVE EVENT TRIGGER HANDLER
  // ---------------------------------------------------------------------------

  const handleSimulateEvent = async () => {
    try {
      const res = await simulateInferenceEvent();
      if (res.data) {
        const ev = res.data;
        setActiveEvents((prev) => [ev, ...prev.slice(0, 9)]);
        if (onEventTriggered) onEventTriggered(ev);

        // Determine source station and target unit
        const sourceSensor = SENSOR_NODES[1]; // Urban exit node
        const targetUnitId = ev.most_likely_source || "unit_001";
        const targetUnit = INDUSTRIAL_UNITS_CONFIG.find((u) => u.unit_id === targetUnitId) || INDUSTRIAL_UNITS_CONFIG[0];

        const pulseColor = ev.decision === "investigate" ? 0xef4444 : ev.decision === "abstain" ? 0xf59e0b : 0x10b981;

        // Stage 1: Pulse from Sensor to Data Center
        triggerPulseAnimation(sourceSensor.pos, DATA_CENTER_POS, 0x38bdf8, () => {
          // Stage 2: Data Center to Ledger Anchor
          triggerPulseAnimation(DATA_CENTER_POS, LEDGER_ANCHOR_POS, 0xeab308, () => {
            // Stage 3: Data Center to Target Unit
            triggerPulseAnimation(DATA_CENTER_POS, targetUnit.pos, pulseColor, () => {
              // Update target unit beacon color
              const beaconMesh = unitBeaconsRef.current.get(targetUnitId);
              if (beaconMesh) {
                const mat = beaconMesh.material as THREE.MeshStandardMaterial;
                mat.color.setHex(pulseColor);
                mat.emissive.setHex(pulseColor);
              }
              // Tint river color temporarily if flagged
              if (ev.decision === "investigate" && waterMaterialRef.current) {
                waterMaterialRef.current.color.setHex(0xd97706);
                setTimeout(() => {
                  if (waterMaterialRef.current) waterMaterialRef.current.color.setHex(0x0284c7);
                }, 4000);
              }
            });
          });
        });
      }
    } catch (err) {
      console.error("Simulation pulse error:", err);
    }
  };

  // ---------------------------------------------------------------------------
  // INITIALIZE THREE.JS SCENE, LIGHTING, CAMERA & CONTROLS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x090d16, 0.006);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 1000);
    camera.position.set(0, 65, 110);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.04; // Don't clip below ground
    controls.minDistance = 15;
    controls.maxDistance = 250;
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e293b, 0.5);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(60, 80, 40);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 300;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // Build scene objects
    createTerrainMesh(scene);
    createNoyyalRiverMesh(scene);
    createInfrastructureModels(scene);

    // Raycaster for click interactivity
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerClick = (e: MouseEvent) => {
      if (!containerRef.current || !cameraRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObjects(interactiveObjectsRef.current, true);

      if (intersects.length > 0) {
        const obj = intersects[0].object;
        const name = obj.name;

        if (name === "node_datacenter") {
          setSelectedNodeId("datacenter");
          onSelectNode({
            id: "datacenter",
            name: "NoyyalSense Central AI Data Center",
            type: "datacenter",
            designation: "Real-time Bayesian Attribution & Neural Engine",
            status: "OPERATIONAL",
          });
        } else if (name === "node_ledger") {
          setSelectedNodeId("ledger");
          onSelectNode({
            id: "ledger",
            name: "Immutable Cryptographic Ledger Anchor",
            type: "ledger",
            designation: "SHA-256 Proof of Compliance Chain",
            status: "SYNCED",
          });
        } else if (name.startsWith("node_tnpcb_")) {
          const sId = name.replace("node_", "");
          const sensor = SENSOR_NODES.find((s) => s.id === sId);
          if (sensor) {
            setSelectedNodeId(sId);
            onSelectNode({
              id: sensor.id,
              name: sensor.name,
              type: "sensor",
              designation: sensor.designation,
              latitude: sensor.lat,
              longitude: sensor.lon,
              raw: sensor,
            });
          }
        } else if (name.startsWith("node_unit_")) {
          const uId = name.replace("node_", "");
          const unitConfig = INDUSTRIAL_UNITS_CONFIG.find((u) => u.unit_id === uId);
          setSelectedNodeId(uId);
          onSelectNode({
            id: uId,
            name: unitConfig?.name || uId,
            type: "unit",
            designation: unitConfig?.type,
          });
        }
      }
    };

    const domElem = renderer.domElement;
    domElem.addEventListener("click", handlePointerClick);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Rotate data center ring
      const dcRing = scene.getObjectByName("datacenter_ring");
      if (dcRing) dcRing.rotation.z = elapsedTime * 0.5;

      // Rotate ledger cube
      const ledgerCube = scene.getObjectByName("node_ledger");
      if (ledgerCube) ledgerCube.rotation.y = elapsedTime * 0.4;

      // Pulse sensor beacons
      sensorNodesRef.current.forEach((mesh) => {
        mesh.scale.setScalar(1 + Math.sin(elapsedTime * 4) * 0.08);
      });

      // Animate pulse line beams
      for (let i = pulseBeamsRef.current.length - 1; i >= 0; i--) {
        const item = pulseBeamsRef.current[i];
        item.progress += item.speed;
        if (item.progress >= 1.0) {
          scene.remove(item.mesh);
          if (item.onComplete) item.onComplete();
          pulseBeamsRef.current.splice(i, 1);
        }
      }

      if (controlsRef.current) controlsRef.current.update();
      renderer.render(scene, camera);
    };

    animate();

    // Handle Resize
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
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      domElem.removeEventListener("click", handlePointerClick);
      renderer.dispose();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // UPDATE LIGHTING PRESETS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!sceneRef.current || !dirLightRef.current || !hemiLightRef.current) return;

    if (lighting === "day") {
      sceneRef.current.background = new THREE.Color(0xdbeafe);
      sceneRef.current.fog = new THREE.FogExp2(0xdbeafe, 0.003);
      dirLightRef.current.intensity = 1.4;
      dirLightRef.current.color.setHex(0xffffff);
      hemiLightRef.current.intensity = 0.6;
    } else if (lighting === "dusk") {
      sceneRef.current.background = new THREE.Color(0x311b22);
      sceneRef.current.fog = new THREE.FogExp2(0x311b22, 0.005);
      dirLightRef.current.intensity = 1.0;
      dirLightRef.current.color.setHex(0xf97316);
      hemiLightRef.current.intensity = 0.4;
    } else {
      // Night Cyberpunk
      sceneRef.current.background = new THREE.Color(0x090d16);
      sceneRef.current.fog = new THREE.FogExp2(0x090d16, 0.007);
      dirLightRef.current.intensity = 0.5;
      dirLightRef.current.color.setHex(0x38bdf8);
      hemiLightRef.current.intensity = 0.3;
    }
  }, [lighting]);

  // ---------------------------------------------------------------------------
  // UPDATE CAMERA VIEW PRESETS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;

    switch (viewPreset) {
      case "overview":
        cam.position.set(0, 75, 120);
        ctrl.target.set(0, 0, 0);
        break;
      case "datacenter":
        cam.position.set(12, 18, 24);
        ctrl.target.copy(DATA_CENTER_POS);
        break;
      case "river":
        cam.position.set(-30, 15, 30);
        ctrl.target.set(-20, 0, 10);
        break;
      case "industrial":
        cam.position.set(-10, 22, -35);
        ctrl.target.set(-10, 2, -15);
        break;
      case "ledger":
        cam.position.set(-32, 14, 28);
        ctrl.target.copy(LEDGER_ANCHOR_POS);
        break;
    }
    ctrl.update();
  }, [viewPreset]);

  // Auto rotate controls update
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
      controlsRef.current.autoRotateSpeed = 1.2;
    }
  }, [autoRotate]);

  // ---------------------------------------------------------------------------
  // LIVE POLLING LOOP FOR LEDGER EVENTS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!livePolling) return;
    const interval = setInterval(async () => {
      const res = await getGlobalEvents();
      if (res.data && res.data.length > 0) {
        const latest = res.data[0];
        setActiveEvents((prev) => {
          if (prev[0]?.event_id !== latest.event_id) {
            // Trigger visual pulse for new live event!
            handleSimulateEvent();
            return [latest, ...prev.slice(0, 9)];
          }
          return prev;
        });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [livePolling]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      {/* WebGL Canvas Container */}
      <div ref={containerRef} style={{ width: "100%", height: "100%", cursor: "grab" }} />

      {/* Floating Action Bar inside 3D Canvas */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          background: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "30px",
          padding: "8px 18px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
        }}
      >
        <button
          type="button"
          onClick={handleSimulateEvent}
          className="btn"
          style={{
            background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
            color: "white",
            border: "none",
            borderRadius: "20px",
            padding: "6px 16px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 4px 14px rgba(2, 132, 199, 0.4)",
          }}
        >
          <span>⚡</span> Trigger Live Data Pulse
        </button>

        <div style={{ height: "20px", width: "1px", background: "rgba(255, 255, 255, 0.2)" }} />

        <div style={{ color: "#94a3b8", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: livePolling ? "#10b981" : "#f59e0b",
              boxShadow: livePolling ? "0 0 8px #10b981" : "none",
            }}
          />
          {livePolling ? "Live Ledger Synced" : "Polling Paused"}
        </div>
      </div>

      {/* Floating Canvas Quick Legend */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "16px",
          zIndex: 10,
          background: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "10px",
          padding: "10px 14px",
          color: "white",
          fontSize: "11px",
          maxWidth: "240px",
        }}
      >
        <div style={{ fontWeight: 700, letterSpacing: "0.05em", color: "#38bdf8", marginBottom: "6px" }}>
          3D NETWORK LEGEND
        </div>
        <div style={{ display: "grid", gap: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#0284c7" }} />
            <span>Noyyal Sensor Station</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#0ea5e9" }} />
            <span>NoyyalSense AI Core</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#eab308" }} />
            <span>Ledger Proof Anchor</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#10b981" }} />
            <span>Industrial Facility (12 Units)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
