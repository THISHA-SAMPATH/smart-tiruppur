import * as THREE from "three";
import { BuildingGISDataset, BuildingGISFeature, LayerBuilderContext } from "./types";

export interface UrbanBuilderResult {
  buildingsGroup: THREE.Group;
  featureCount: number;
}

/**
 * Parses OpenStreetMap/Overpass GeoJSON without changing source IDs, tags, or geometry.
 */
export function parseGeoJSONToBuildingDataset(geojson: any): BuildingGISDataset | null {
  if (!geojson || geojson.type !== "FeatureCollection" || !Array.isArray(geojson.features)) return null;

  const features: BuildingGISFeature[] = geojson.features
    .filter((feature: any) => feature?.geometry?.type === "Polygon" || feature?.geometry?.type === "MultiPolygon")
    .map((feature: any) => {
      const properties = feature.properties || {};
      return {
        type: "Feature",
        properties: {
          featureId: feature.id ?? properties["@id"],
          name: properties.name,
          building: properties.building,
          height: properties.height,
          levels: properties["building:levels"] ?? properties.levels,
          source: "OpenStreetMap",
          sourceType: "OPEN_DATA",
          originalProperties: properties,
        },
        geometry: feature.geometry,
      };
    });

  return {
    type: "FeatureCollection",
    datasetName: "Tiruppur OSM Building Footprints (Overpass)",
    sourceType: "OPEN_DATA",
    features,
  };
}

const DEFAULT_BUILDING_HEIGHT_3D = 0.7;
const LEVEL_HEIGHT_METERS = 3;
const HEIGHT_3D_PER_METER = 0.1;

function parseNumericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** OSM height tags are metres; a level is rendered using the documented 3 m assumption. */
function getBuildingHeight(properties: BuildingGISFeature["properties"]): number {
  const heightMeters = parseNumericValue(properties.height);
  if (heightMeters !== null && heightMeters > 0) return heightMeters * HEIGHT_3D_PER_METER;

  const levels = parseNumericValue(properties.levels);
  if (levels !== null && levels > 0) return levels * LEVEL_HEIGHT_METERS * HEIGHT_3D_PER_METER;

  return DEFAULT_BUILDING_HEIGHT_3D;
}

function makeShape(
  rings: Array<Array<[number, number, number?]>>,
  ctx: LayerBuilderContext
): { shape: THREE.Shape; latitude: number; longitude: number } | null {
  const toPath = (ring: Array<[number, number, number?]>) => {
    const points = ring.slice(0, -1).map(([longitude, latitude]) => ctx.geoTo3D(latitude, longitude));
    if (points.length < 3) return null;
    const path = new THREE.Path();
    path.moveTo(points[0].x, -points[0].z);
    for (let i = 1; i < points.length; i++) path.lineTo(points[i].x, -points[i].z);
    path.closePath();
    return { path, points };
  };

  const exterior = toPath(rings[0]);
  if (!exterior) return null;
  const shape = new THREE.Shape(exterior.path.getPoints());
  for (const ring of rings.slice(1)) {
    const hole = toPath(ring);
    if (hole) shape.holes.push(hole.path);
  }
  const latitude = exterior.points.reduce((total, point) => total + point.z, 0) / exterior.points.length;
  const longitude = exterior.points.reduce((total, point) => total + point.x, 0) / exterior.points.length;
  const center = ctx.vector3DToGeo(longitude, latitude);
  return { shape, latitude: center.lat, longitude: center.lon };
}

/**
 * Builds real OSM-derived footprint extrusions. The meshes are visualization
 * estimates, not surveyed building heights or a complete city inventory.
 */
export function buildUrbanLayer(ctx: LayerBuilderContext): UrbanBuilderResult {
  const buildingsGroup = new THREE.Group();
  buildingsGroup.name = "Layer_Urban_Fabric";
  const material = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.82,
    metalness: 0.05,
    transparent: true,
    opacity: 0.78,
  });
  let featureCount = 0;

  ctx.buildingsDataset?.features.forEach((feature) => {
    const polygons = feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;

    polygons.forEach((rings: Array<Array<[number, number, number?]>>) => {
      const footprint = makeShape(rings, ctx);
      if (!footprint) return;
      const geometry = new THREE.ExtrudeGeometry(footprint.shape, {
        depth: getBuildingHeight(feature.properties),
        bevelEnabled: false,
        curveSegments: 1,
      });
      // Shape coordinates are X/-Z; rotate extrusion upward into world Y.
      geometry.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = ctx.sampleElevation(footprint.latitude, footprint.longitude) + 0.08;
      mesh.name = `OSM_Building_${String(feature.properties.featureId)}`;
      mesh.userData = {
        type: "building",
        source: "OpenStreetMap",
        sourceType: "OPEN_DATA",
        featureId: feature.properties.featureId,
        originalProperties: feature.properties.originalProperties,
        data: feature.properties,
      };
      buildingsGroup.add(mesh);
      ctx.interactiveObjects.push(mesh);
      featureCount++;
    });
  });

  return {
    buildingsGroup,
    featureCount,
  };
}
