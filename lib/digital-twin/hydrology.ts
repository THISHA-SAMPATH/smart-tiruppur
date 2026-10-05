import * as THREE from "three";
import {
  LayerBuilderContext,
  HydrologyGISDataset,
  HydrologyGISFeature,
  GISSourceType,
} from "./types";

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

          const tubeRadius = feat.properties.type === "river" ? 0.5 : 0.25;
          const tubeGeo = new THREE.TubeGeometry(curve, Math.max(20, vecPoints.length * 2), tubeRadius, 8, false);

          const tubeMat = new THREE.MeshStandardMaterial({
            color: feat.properties.type === "river" ? 0x0284c7 : 0x0d9488,
            emissive: feat.properties.type === "river" ? 0x0284c7 : 0x0d9488,
            emissiveIntensity: 0.35,
            roughness: 0.15,
          });

          const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
          tubeMesh.name = `GIS_Hydrology_${feat.properties.name}`;
          tubeMesh.userData = {
            type: "hydrology",
            isGisFeature: true,
            data: feat.properties,
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
            emissive: 0x0284c7,
            emissiveIntensity: 0.25,
            transparent: true,
            opacity: 0.7,
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

    const tubeGeo = new THREE.TubeGeometry(activeRiverCurve, 80, 0.5, 8, false);
    const riverMesh = new THREE.Mesh(
      tubeGeo,
      new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        emissive: 0x0284c7,
        emissiveIntensity: 0.4,
        roughness: 0.1,
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

  // 4. Pollution Plume Particles along active curve
  const plumeParticleCount = 16;
  const plumeParticles: THREE.Mesh[] = [];
  const plumeGeo = new THREE.SphereGeometry(0.4, 8, 8);
  const plumeMat = new THREE.MeshBasicMaterial({
    color: 0xdc2626,
    transparent: true,
    opacity: 0.85,
  });

  for (let p = 0; p < plumeParticleCount; p++) {
    const particle = new THREE.Mesh(plumeGeo, plumeMat);
    pollutionPlumeGroup.add(particle);
    plumeParticles.push(particle);
  }

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
