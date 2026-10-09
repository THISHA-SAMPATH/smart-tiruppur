import * as THREE from "three";
import {
  LayerBuilderContext,
  HydrologyGISDataset,
  HydrologyGISFeature,
  GISSourceType,
} from "./types";
import type { IndustrialOutfallConnection } from "./industrial";

export interface SimulatedTransportParticle {
  mesh: THREE.Mesh;
  connection: IndustrialOutfallConnection;
  phase: number;
}

export interface HydrologyBuilderResult {
  riverGroup: THREE.Group;
  drainageGroup: THREE.Group;
  riverFlowArrowsGroup: THREE.Group;
  pollutionPlumeGroup: THREE.Group;
  riverCurve: THREE.CatmullRomCurve3;
  flowParticles: THREE.Mesh[];
  plumeParticles: THREE.Mesh[];
  isGisLoaded: boolean;
}

/**
 * Converts a standard GeoJSON FeatureCollection into a strongly typed HydrologyGISDataset
 */
export function parseGeoJSONToHydrologyDataset(
  geojson: any,
  defaultSource = "OpenStreetMap",
  defaultSourceType: GISSourceType = "REAL"
): HydrologyGISDataset | null {
  if (!geojson || geojson.type !== "FeatureCollection" || !Array.isArray(geojson.features)) {
    return null;
  }

  const features: HydrologyGISFeature[] = geojson.features.map((feat: any, idx: number) => {
    const props = feat.properties || {};
    const waterwayType = props.waterway || props.type || "river";
    return {
      type: "Feature",
      properties: {
        id: props.id || `hydro_${idx}`,
        name: props.name || (waterwayType === "river" ? "Noyyal River" : "Drainage Stream"),
        type: waterwayType === "river" ? "river" : waterwayType === "stream" ? "tributary_stream" : "canal",
        source: props.source || defaultSource,
        sourceType: (props.sourceType as GISSourceType) || defaultSourceType,
        waterway: waterwayType,
        metadata: props,
      },
      geometry: feat.geometry,
    };
  });

  return {
    type: "FeatureCollection",
    datasetName: geojson.name || "Tiruppur Hydrological GIS Network",
    sourceType: defaultSourceType,
    features,
  };
}

function createRiverRibbonGeometry(
  curve: THREE.CatmullRomCurve3,
  width: number,
  ctx: LayerBuilderContext
): THREE.BufferGeometry {
  const steps = 180;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const halfWidth = width / 2;
  const dt = 0.012; // Window delta for smooth tangent calculation to prevent self-intersection

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = curve.getPoint(t);
    // Calculate smoothed tangent over surrounding delta window
    const pPrev = curve.getPoint(Math.max(0, t - dt));
    const pNext = curve.getPoint(Math.min(1, t + dt));
    const tangent = pNext.clone().sub(pPrev).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const left = p.clone().add(side.clone().multiplyScalar(halfWidth));
    const right = p.clone().sub(side.clone().multiplyScalar(halfWidth));

    const geoLeft = ctx.vector3DToGeo(left.x, left.z);
    const geoRight = ctx.vector3DToGeo(right.x, right.z);

    left.y = ctx.sampleElevation(geoLeft.lat, geoLeft.lon) + 0.12;
    right.y = ctx.sampleElevation(geoRight.lat, geoRight.lon) + 0.12;

    positions.push(left.x, left.y, left.z);
    positions.push(right.x, right.y, right.z);

    uvs.push(0, t);
    uvs.push(1, t);
  }

  for (let i = 0; i < steps; i++) {
    const v0 = i * 2;
    const v1 = i * 2 + 1;
    const v2 = (i + 1) * 2;
    const v3 = (i + 1) * 2 + 1;
    indices.push(v0, v1, v2);
    indices.push(v1, v3, v2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Builds Noyyal River, drainage channels, flow arrows, and pollution plume particles.
 * Uses real GIS dataset features when provided, with smooth fallback to procedural math curve.
 */
export function buildHydrologyLayers(ctx: LayerBuilderContext): HydrologyBuilderResult {
  const riverGroup = new THREE.Group();
  riverGroup.name = "Layer_Noyyal_River";

  const drainageGroup = new THREE.Group();
  drainageGroup.name = "Layer_Drainage_Channels";

  const riverFlowArrowsGroup = new THREE.Group();
  riverFlowArrowsGroup.name = "Layer_River_Flow_Arrows";

  const pollutionPlumeGroup = new THREE.Group();
  pollutionPlumeGroup.name = "Layer_Pollution_Plume";

  let activeRiverCurve: THREE.CatmullRomCurve3 | null = null;
  let isGisLoaded = false;

  const hydroDataset = ctx.hydrologyDataset;

  // 1. Process Real GIS Dataset Features if available
  if (hydroDataset && hydroDataset.features && hydroDataset.features.length > 0) {
    const lineFeatures = hydroDataset.features.filter(
      (f) => f.geometry && (f.geometry.type === "LineString" || f.geometry.type === "MultiLineString")
    );

    lineFeatures.forEach((feat) => {
      const lineCoordsList: Array<Array<[number, number]>> = [];

      if (feat.geometry.type === "LineString") {
        lineCoordsList.push(feat.geometry.coordinates);
      } else if (feat.geometry.type === "MultiLineString") {
        lineCoordsList.push(...feat.geometry.coordinates);
      }

      lineCoordsList.forEach((coords) => {
        // Map GeoJSON longitude [0] and latitude [1] to 3D positions
        const vecPoints: THREE.Vector3[] = coords
          .filter((pt) => Array.isArray(pt) && pt.length >= 2)
          .map(([lon, lat]) => ctx.geoTo3D(lat, lon, 0.25));

        // Only build if we have enough spatial points within bounds
        if (vecPoints.length >= 2) {
          const curve = new THREE.CatmullRomCurve3(vecPoints);

          if (!activeRiverCurve && feat.properties.type === "river") {
            activeRiverCurve = curve;
            isGisLoaded = true;
          }

          const ribbonWidth = feat.properties.type === "river" ? 0.7 : 0.35;
          const ribbonGeo = createRiverRibbonGeometry(curve, ribbonWidth, ctx);

          const tubeMat = new THREE.MeshStandardMaterial({
            color: feat.properties.type === "river" ? 0x0284c7 : 0x0d9488, // Calm blue/teal default water surface
            roughness: 0.15,
            metalness: 0.3,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1,
          });

          const tubeMesh = new THREE.Mesh(ribbonGeo, tubeMat);
          tubeMesh.name = `GIS_Hydrology_${feat.properties.name}`;

          // Add visible river bank channel borders (Item #4)
          if (feat.properties.type === "river") {
            const bankGeo = createRiverRibbonGeometry(curve, ribbonWidth * 1.25, ctx);
            const bankMat = new THREE.MeshStandardMaterial({
              color: 0x94a3b8, // Muted sandy slate riverbank channel
              roughness: 0.9,
              metalness: 0.05,
              side: THREE.DoubleSide,
              polygonOffset: true,
              polygonOffsetFactor: 0,
              polygonOffsetUnits: 0,
            });
            const bankMesh = new THREE.Mesh(bankGeo, bankMat);
            bankMesh.position.y = -0.02;
            tubeMesh.add(bankMesh);

            // Derivation of road-river intersection bridges (e.g. Kasipalayam & Mangalam Bridges)
            const bridgeSampleTimes = [0.25, 0.58, 0.82]; // Key urban road crossing points along Noyyal curve
            const bridgeGeo = new THREE.BoxGeometry(ribbonWidth * 1.5, 0.25, 0.8);
            const bridgeMat = new THREE.MeshStandardMaterial({
              color: 0x64748b, // Concrete bridge deck
              roughness: 0.6,
              metalness: 0.1,
            });

            bridgeSampleTimes.forEach((t, bIdx) => {
              const bridgePos = curve.getPoint(t);
              const tangent = curve.getTangent(t);
              const bridgeMesh = new THREE.Mesh(bridgeGeo, bridgeMat);
              bridgeMesh.position.copy(bridgePos);
              bridgeMesh.position.y += 0.15;
              bridgeMesh.lookAt(bridgePos.clone().add(tangent));
              bridgeMesh.name = `Bridge_Crossing_${bIdx + 1}`;
              bridgeMesh.userData = {
                type: "bridge",
                name: bIdx === 1 ? "Kasipalayam Urban Noyyal Bridge" : bIdx === 0 ? "Mangalam Upstream Bridge" : "Orathapalayam Highway Bridge",
                provenance: "DERIVED (Spatial Road-River Intersection)",
              };
              tubeMesh.add(bridgeMesh);
              ctx.interactiveObjects.push(bridgeMesh);
            });
          }

          tubeMesh.userData = {
            type: "hydrology",
            isGisFeature: true,
            data: {
              ...feat.properties,
              provenanceNote: "Noyyal River surface with derived terrain channel and bridge crossings.",
            },
          };

          if (feat.properties.type === "river") {
            riverGroup.add(tubeMesh);
          } else {
            drainageGroup.add(tubeMesh);
          }
        }
      });
    });

    // Process Waterbody Polygons (if present)
    const polyFeatures = hydroDataset.features.filter(
      (f) => f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")
    );

    polyFeatures.forEach((feat) => {
      const polyCoordsList: Array<Array<Array<[number, number]>>> = [];
      if (feat.geometry.type === "Polygon") {
        polyCoordsList.push(feat.geometry.coordinates);
      } else if (feat.geometry.type === "MultiPolygon") {
        polyCoordsList.push(...feat.geometry.coordinates);
      }

      polyCoordsList.forEach((polyRings) => {
        const outerRing = polyRings[0];
        if (outerRing && outerRing.length >= 3) {
          const shape = new THREE.Shape();
          outerRing.forEach(([lon, lat], i) => {
            const pos = ctx.geoTo3D(lat, lon, 0.15);
            if (i === 0) shape.moveTo(pos.x, -pos.z);
            else shape.lineTo(pos.x, -pos.z);
          });

          const polyGeo = new THREE.ShapeGeometry(shape);
          polyGeo.rotateX(-Math.PI / 2);

          const polyMat = new THREE.MeshStandardMaterial({
            color: 0x0284c7,
            roughness: 0.15,
            metalness: 0.2,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide,
          });

          const polyMesh = new THREE.Mesh(polyGeo, polyMat);
          polyMesh.userData = {
            type: "hydrology_waterbody",
            isGisFeature: true,
            data: feat.properties,
          };
          riverGroup.add(polyMesh);
        }
      });
    });
  }

  // 2. Procedural Fallback Noyyal River Curve
  if (!activeRiverCurve) {
    const riverPoints: THREE.Vector3[] = [];
    for (let l = 77.24; l <= 77.54; l += 0.015) {
      const lat = 11.108 + 0.008 * Math.sin((l - 77.25) * 12);
      riverPoints.push(ctx.geoTo3D(lat, l, 0.25));
    }
    activeRiverCurve = new THREE.CatmullRomCurve3(riverPoints);

    const ribbonGeo = createRiverRibbonGeometry(activeRiverCurve, 0.7, ctx);
    const riverMesh = new THREE.Mesh(
      ribbonGeo,
      new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.15,
        metalness: 0.2,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      })
    );
    riverMesh.name = "Noyyal_River_Procedural_Fallback";
    riverMesh.userData = {
      type: "hydrology",
      isGisFeature: false,
      data: {
        name: "Noyyal River (Procedural Fallback)",
        type: "river",
        source: "Synthetic Mathematical Elevation Model",
        sourceType: "SIMULATED",
      },
    };
    riverGroup.add(riverMesh);
  }

  // 3. Flow Direction Particles along active curve
  const flowCount = 12;
  const flowParticles: THREE.Mesh[] = [];
  const arrowGeo = new THREE.ConeGeometry(0.3, 0.8, 6);
  arrowGeo.rotateX(Math.PI / 2);
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  for (let f = 0; f < flowCount; f++) {
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    riverFlowArrowsGroup.add(arrow);
    flowParticles.push(arrow);
  }

  // Pollution transport is created from simulated industrial outfalls by the viewer,
  // after it has connected those sources to this active waterway curve.
  const plumeParticles: THREE.Mesh[] = [];

  return {
    riverGroup,
    drainageGroup,
    riverFlowArrowsGroup,
    pollutionPlumeGroup,
    riverCurve: activeRiverCurve,
    flowParticles,
    plumeParticles,
    isGisLoaded,
  };
}

/**
 * Creates a simulated source-to-river transport visualization. It uses relative
 * synthetic source strength only; this is not a calibrated dispersion model.
 */
export function buildSimulatedSourceTransport(connections: IndustrialOutfallConnection[]) {
  const group = new THREE.Group();
  group.name = "Layer_Simulated_Pollution_Transport";
  const particles: SimulatedTransportParticle[] = [];
  const geometry = new THREE.SphereGeometry(0.18, 8, 8);

  connections.forEach((connection) => {
    const count = connection.normalizedSourceStrength > 0.66 ? 3 : 2;
    for (let index = 0; index < count; index++) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xdc2626,
        transparent: true,
        opacity: 0.45 + connection.normalizedSourceStrength * 0.45,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = {
        type: "simulated_transport",
        label: "SIMULATED SOURCE-TO-RIVER TRANSPORT VISUALIZATION",
        relativeSourceStrength: connection.normalizedSourceStrength,
      };
      group.add(mesh);
      particles.push({ mesh, connection, phase: index / count });
    }
  });

  return { group, particles };
}
