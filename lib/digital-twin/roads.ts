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

function getRoadVisualConfig(roadClass: string): { width: number; color: number } {
  switch (roadClass) {
    case "motorway":
    case "trunk":
      return { width: 0.7, color: 0xf59e0b }; // Amber arterial
    case "primary":
      return { width: 0.55, color: 0x38bdf8 }; // Cyan major road
    case "secondary":
      return { width: 0.4, color: 0x94a3b8 }; // Slate secondary
    case "tertiary":
      return { width: 0.3, color: 0x64748b }; // Dark slate tertiary
    case "residential":
    case "service":
    case "unclassified":
    default:
      return { width: 0.22, color: 0x475569 }; // Minor street
  }
}

/**
 * Builds the 3D GIS Road Network Layer.
 * Renders real GIS vector features when available with +0.12 Y-offset to prevent z-fighting.
 * Returns a clean empty group when no GIS road dataset is provided (zero fake data invented).
 */
export function buildRoadsLayer(ctx: LayerBuilderContext): RoadsBuilderResult {
  const roadsGroup = new THREE.Group();
  roadsGroup.name = "Layer_Roads";

  let isGisLoaded = false;
  let featureCount = 0;

  const dataset = ctx.roadsDataset;

  if (dataset && dataset.features && dataset.features.length > 0) {
    const lineFeatures = dataset.features.filter(
      (f) => f.geometry && (f.geometry.type === "LineString" || f.geometry.type === "MultiLineString")
    );

    lineFeatures.forEach((feat) => {
      const lineCoordsList: Array<Array<[number, number, number?]>> = [];
      if (feat.geometry.type === "LineString") {
        lineCoordsList.push(feat.geometry.coordinates);
      } else if (feat.geometry.type === "MultiLineString") {
        lineCoordsList.push(...feat.geometry.coordinates);
      }

      // A single LineSegments object per feature retains all source vertices and
      // MultiLineString parts without the very high geometry cost of tube meshes.
      const positions: number[] = [];
      lineCoordsList.forEach((coords) => {
        for (let index = 1; index < coords.length; index++) {
          const previous = coords[index - 1];
          const current = coords[index];
          if (!Array.isArray(previous) || !Array.isArray(current) || previous.length < 2 || current.length < 2) continue;
          const start = ctx.geoTo3D(previous[1], previous[0], 0.12);
          const end = ctx.geoTo3D(current[1], current[0], 0.12);
          positions.push(start.x, start.y, start.z, end.x, end.y, end.z);
        }
      });

      if (!positions.length) return;

      const config = getRoadVisualConfig(feat.properties.roadClass || feat.properties.highway || "unclassified");
      const roadGeometry = new THREE.BufferGeometry();
      roadGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      const roadMaterial = new THREE.LineBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
      });
      const roadLine = new THREE.LineSegments(roadGeometry, roadMaterial);
      roadLine.name = `GIS_Road_${String(feat.properties.featureId ?? feat.properties.id)}`;
      roadLine.renderOrder = 1;
      roadLine.userData = {
        type: "road",
        isGisFeature: true,
        source: "TNGIS",
        sourceType: "REAL",
        featureId: feat.properties.featureId,
        roadName: feat.properties.name,
        roadClass: feat.properties.roadClass,
        originalProperties: feat.properties.metadata,
        data: feat.properties,
      };
      roadsGroup.add(roadLine);
      ctx.interactiveObjects.push(roadLine);
      featureCount++;
      isGisLoaded = true;
    });
  }

  return {
    roadsGroup,
    isGisLoaded,
    featureCount,
  };
}
