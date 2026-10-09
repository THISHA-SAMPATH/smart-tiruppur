import * as THREE from "three";
import {
  LayerBuilderContext,
  RoadGISDataset,
  RoadGISFeature,
  RoadClassType,
  GISSourceType,
} from "./types";

export interface RoadsBuilderResult {
  roadsGroup: THREE.Group;
  isGisLoaded: boolean;
  featureCount: number;
}

/**
 * Converts standard GeoJSON FeatureCollection into a strongly typed RoadGISDataset
 */
export function parseGeoJSONToRoadDataset(
  geojson: any,
  defaultSource = "TNGIS",
  defaultSourceType: GISSourceType = "REAL"
): RoadGISDataset | null {
  if (!geojson || geojson.type !== "FeatureCollection" || !Array.isArray(geojson.features)) {
    return null;
  }

  const features: RoadGISFeature[] = geojson.features
    .filter((feat: any) => feat?.geometry?.type === "LineString" || feat?.geometry?.type === "MultiLineString")
    .map((feat: any, idx: number) => {
    const props = feat.properties || {};

    return {
      type: "Feature",
      properties: {
        id: props.id ?? feat.id ?? `road_${idx}`,
        featureId: feat.id,
        name: props.name ?? props.road_nam,
        highway: props.highway,
        roadClass: (props.roadClass ?? props.road_class) as RoadClassType | undefined,
        source: defaultSource,
        sourceType: defaultSourceType,
        lanes: props.lanes ? parseInt(props.lanes, 10) : undefined,
        oneway: props.oneway === "yes" || props.oneway === true,
        metadata: props,
      },
      geometry: feat.geometry,
    };
  });

  return {
    type: "FeatureCollection",
    datasetName: geojson.name || "TNGIS Tiruppur Road Network",
    sourceType: defaultSourceType,
    features,
  };
}

// Convert real-world meter widths using centralized WORLD_SCALE (0.0035 Three.js units / meter)
const METERS_TO_WORLD = 0.0035;

function getRoadVisualConfig(roadClass: string): { width: number; asphaltColor: number; markingColor: number } {
  switch (roadClass) {
    case "motorway":
    case "trunk":
      return { width: 16 * METERS_TO_WORLD, asphaltColor: 0x334155, markingColor: 0xf59e0b }; // 16 m arterial highway (0.056 units)
    case "primary":
      return { width: 12 * METERS_TO_WORLD, asphaltColor: 0x475569, markingColor: 0xe2e8f0 }; // 12 m major city arterial (0.042 units)
    case "secondary":
      return { width: 8.5 * METERS_TO_WORLD, asphaltColor: 0x64748b, markingColor: 0x94a3b8 }; // 8.5 m secondary connector (0.030 units)
    case "tertiary":
      return { width: 6 * METERS_TO_WORLD, asphaltColor: 0x64748b, markingColor: 0x64748b }; // 6 m tertiary street (0.021 units)
    case "residential":
    case "service":
    case "unclassified":
    default:
      return { width: 4 * METERS_TO_WORLD, asphaltColor: 0x94a3b8, markingColor: 0xcbd5e1 }; // 4 m fine local street (0.014 units)
  }
}

/**
 * Builds the 3D GIS Road Network Layer as physical road surfaces.
 * Renders real GIS vector features when available with muted asphalt appearance and restrained lane markings.
 */
export function buildRoadsLayer(ctx: LayerBuilderContext): RoadsBuilderResult {
  const roadsGroup = new THREE.Group();
  roadsGroup.name = "Layer_Roads";

  let isGisLoaded = false;
  let featureCount = 0;
  const processedFeatureIds = new Set<string>();

  const datasets: RoadGISDataset[] = [];
  if (ctx.roadsDataset) datasets.push(ctx.roadsDataset);
  if (ctx.urbanRoadsDataset) datasets.push(ctx.urbanRoadsDataset);

  datasets.forEach((dataset) => {
    if (!dataset || !dataset.features || dataset.features.length === 0) return;

    const lineFeatures = dataset.features.filter(
      (f) => f.geometry && (f.geometry.type === "LineString" || f.geometry.type === "MultiLineString")
    );

    lineFeatures.forEach((feat) => {
      const featureId = String(feat.properties.featureId ?? feat.properties.id ?? `road_${featureCount}`);
      if (processedFeatureIds.has(featureId)) return; // Avoid duplicate rendering across overlapping extracts
      processedFeatureIds.add(featureId);

      const lineCoordsList: Array<Array<[number, number, number?]>> = [];
      if (feat.geometry.type === "LineString") {
        lineCoordsList.push(feat.geometry.coordinates);
      } else if (feat.geometry.type === "MultiLineString") {
        lineCoordsList.push(...feat.geometry.coordinates);
      }

      const roadClass = feat.properties.roadClass || feat.properties.highway || "unclassified";
      const config = getRoadVisualConfig(roadClass);
      const isOsm = feat.properties.source === "OpenStreetMap" || dataset.sourceType === "OPEN_DATA" || String(feat.properties.id || "").includes("way/");
      const sourceLabel = isOsm ? "OpenStreetMap" : (feat.properties.source || "TNGIS");
      const sourceType = isOsm ? "OPEN_DATA" : (feat.properties.sourceType || "REAL");

      lineCoordsList.forEach((coords) => {
        if (!Array.isArray(coords) || coords.length < 2) return;

        const points: THREE.Vector3[] = [];
        for (let i = 0; i < coords.length; i++) {
          const pt = coords[i];
          if (!Array.isArray(pt) || pt.length < 2) continue;
          points.push(ctx.geoTo3D(pt[1], pt[0], 0.05));
        }

        if (points.length < 2) return;

        // Build ribbon mesh geometry for physical asphalt surface
        const ribbonPositions: number[] = [];
        const markingPositions: number[] = [];
        const halfWidth = config.width / 2;

        for (let i = 0; i < points.length; i++) {
          const p = points[i];
          const prev = points[Math.max(0, i - 1)];
          const next = points[Math.min(points.length - 1, i + 1)];
          const dir = next.clone().sub(prev).normalize();
          if (dir.lengthSq() === 0) dir.set(1, 0, 0);

          const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

          const left = p.clone().add(side.clone().multiplyScalar(halfWidth));
          const right = p.clone().sub(side.clone().multiplyScalar(halfWidth));

          left.y = ctx.sampleElevation(ctx.vector3DToGeo(left.x, left.z).lat, ctx.vector3DToGeo(left.x, left.z).lon) + 0.05;
          right.y = ctx.sampleElevation(ctx.vector3DToGeo(right.x, right.z).lat, ctx.vector3DToGeo(right.x, right.z).lon) + 0.05;

          ribbonPositions.push(left.x, left.y, left.z, right.x, right.y, right.z);

          // Center marking point
          markingPositions.push(p.x, p.y + 0.01, p.z);
        }

        const indices: number[] = [];
        const segs = points.length - 1;
        for (let i = 0; i < segs; i++) {
          const v0 = i * 2;
          const v1 = i * 2 + 1;
          const v2 = (i + 1) * 2;
          const v3 = (i + 1) * 2 + 1;
          indices.push(v0, v1, v2);
          indices.push(v1, v3, v2);
        }

        const ribbonGeo = new THREE.BufferGeometry();
        ribbonGeo.setAttribute("position", new THREE.Float32BufferAttribute(ribbonPositions, 3));
        ribbonGeo.setIndex(indices);
        ribbonGeo.computeVertexNormals();

        // Muted asphalt physical surface material cleanly rendered above terrain
        const asphaltMat = new THREE.MeshStandardMaterial({
          color: config.asphaltColor,
          roughness: 0.85,
          metalness: 0.05,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -1.0,
          polygonOffsetUnits: -1.0,
        });

        const asphaltMesh = new THREE.Mesh(ribbonGeo, asphaltMat);
        asphaltMesh.name = `${sourceLabel}_Road_${featureId}`;
        asphaltMesh.userData = {
          type: "road",
          isGisFeature: true,
          source: sourceLabel,
          sourceType: sourceType,
          featureId: featureId,
          roadName: feat.properties.name,
          roadClass: roadClass,
          originalProperties: feat.properties.metadata || feat.properties,
          data: {
            ...feat.properties,
            source: sourceLabel,
            sourceType: sourceType,
            provenanceNote: `Physical road surface rendered from ${sourceLabel} vector geometry (${sourceType}).`,
          },
        };

        // Restrained lane marking overlay line for major arterials
        if (markingPositions.length >= 6 && (roadClass === "primary" || roadClass === "trunk" || roadClass === "secondary")) {
          const markingGeo = new THREE.BufferGeometry();
          markingGeo.setAttribute("position", new THREE.Float32BufferAttribute(markingPositions, 3));
          const markingMat = new THREE.LineBasicMaterial({
            color: config.markingColor,
            transparent: true,
            opacity: 0.6,
          });
          const markingLine = new THREE.Line(markingGeo, markingMat);
          asphaltMesh.add(markingLine);
        }

        roadsGroup.add(asphaltMesh);
        ctx.interactiveObjects.push(asphaltMesh);
        featureCount++;
        isGisLoaded = true;
      });
    });
  });

  return {
    roadsGroup,
    isGisLoaded,
    featureCount,
  };
}
