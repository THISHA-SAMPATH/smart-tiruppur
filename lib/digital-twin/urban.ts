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

const DEFAULT_BUILDING_HEIGHT_3D = 1.5;
const LEVEL_HEIGHT_METERS = 3;
const HEIGHT_3D_PER_METER = 0.18;

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

// Restrained 1.0 visual building-scale preserving authentic source OSM footprint shapes without distortion
const VISUAL_FOOTPRINT_SCALE = 1.0;

function makeShape(
  rings: Array<Array<[number, number, number?]>>,
  ctx: LayerBuilderContext
): { shape: THREE.Shape; latitude: number; longitude: number } | null {
  const toPathPoints = (ring: Array<[number, number, number?]>) => {
    const points = ring.slice(0, -1).map(([longitude, latitude]) => ctx.geoTo3D(latitude, longitude));
    if (points.length < 3) return null;
    return points;
  };

  const extPoints = toPathPoints(rings[0]);
  if (!extPoints) return null;

  // Calculate centroid of footprint shape
  const cX = extPoints.reduce((acc, p) => acc + p.x, 0) / extPoints.length;
  const cZ = extPoints.reduce((acc, p) => acc + (-p.z), 0) / extPoints.length;

  const scalePoint = (px: number, py: number) => ({
    x: cX + (px - cX) * VISUAL_FOOTPRINT_SCALE,
    y: cZ + (py - cZ) * VISUAL_FOOTPRINT_SCALE,
  });

  const path = new THREE.Path();
  const start = scalePoint(extPoints[0].x, -extPoints[0].z);
  path.moveTo(start.x, start.y);
  for (let i = 1; i < extPoints.length; i++) {
    const pt = scalePoint(extPoints[i].x, -extPoints[i].z);
    path.lineTo(pt.x, pt.y);
  }
  path.closePath();

  const shape = new THREE.Shape(path.getPoints());

  for (const ring of rings.slice(1)) {
    const holePoints = toPathPoints(ring);
    if (holePoints) {
      const holePath = new THREE.Path();
      const hStart = scalePoint(holePoints[0].x, -holePoints[0].z);
      holePath.moveTo(hStart.x, hStart.y);
      for (let i = 1; i < holePoints.length; i++) {
        const hPt = scalePoint(holePoints[i].x, -holePoints[i].z);
        holePath.lineTo(hPt.x, hPt.y);
      }
      holePath.closePath();
      shape.holes.push(holePath);
    }
  }

  const latitude = extPoints.reduce((total, point) => total + point.z, 0) / extPoints.length;
  const longitude = extPoints.reduce((total, point) => total + point.x, 0) / extPoints.length;
  const center = ctx.vector3DToGeo(longitude, latitude);
  return { shape, latitude: center.lat, longitude: center.lon };
}

export type BuildingTypology = "RESIDENTIAL" | "COMMERCIAL" | "INDUSTRIAL" | "INSTITUTIONAL" | "RELIGIOUS";

export interface BuildingTypologyConfig {
  typology: BuildingTypology;
  label: string;
  roofColor: number;
  wallColor: number;
  roofOpacity: number;
  wallOpacity: number;
}

/**
 * Classifies building footprints strictly using existing OSM tags/properties.
 * Does NOT invent buildings or real-world locations.
 */
export function classifyBuildingTypology(props: Record<string, any>): BuildingTypologyConfig {
  const b = String(props.building || "").toLowerCase();
  const amenity = String(props.amenity || "").toLowerCase();
  const shop = String(props.shop || "").toLowerCase();
  const office = String(props.office || "").toLowerCase();
  const industrial = String(props.industrial || "").toLowerCase();
  const landuse = String(props.landuse || "").toLowerCase();

  // 1. RELIGIOUS
  if (
    amenity === "place_of_worship" ||
    b === "temple" ||
    b === "church" ||
    b === "mosque" ||
    b === "shrine" ||
    props["building:use"] === "religious"
  ) {
    return {
      typology: "RELIGIOUS",
      label: "Religious / Place of Worship (OSM Tagged)",
      roofColor: 0xfef08a, // Soft warm gold accent
      wallColor: 0xe2e8f0,
      roofOpacity: 0.85,
      wallOpacity: 0.75,
    };
  }

  // 2. INSTITUTIONAL (Schools, Hospitals, Offices)
  if (
    amenity === "school" ||
    amenity === "hospital" ||
    amenity === "clinic" ||
    amenity === "college" ||
    amenity === "university" ||
    amenity === "townhall" ||
    b === "school" ||
    b === "hospital" ||
    b === "civic" ||
    b === "public" ||
    office !== ""
  ) {
    return {
      typology: "INSTITUTIONAL",
      label: "Institutional / Public Facility (OSM Tagged)",
      roofColor: 0x94a3b8, // Slate slate-grey
      wallColor: 0xcbd5e1,
      roofOpacity: 0.80,
      wallOpacity: 0.70,
    };
  }

  // 3. INDUSTRIAL
  if (
    b === "industrial" ||
    b === "warehouse" ||
    b === "manufacture" ||
    industrial !== "" ||
    landuse === "industrial" ||
    props["building:use"] === "industrial"
  ) {
    return {
      typology: "INDUSTRIAL",
      label: "Industrial / Warehouse Shed (OSM Tagged)",
      roofColor: 0x94a3b8, // Pale grey metal shed
      wallColor: 0xb45309, // Muted terracotta/pale brick industrial base
      roofOpacity: 0.85,
      wallOpacity: 0.75,
    };
  }

  // 4. COMMERCIAL
  if (
    b === "commercial" ||
    b === "retail" ||
    b === "supermarket" ||
    shop !== "" ||
    props["building:use"] === "commercial"
  ) {
    return {
      typology: "COMMERCIAL",
      label: "Commercial / Retail Storefront (OSM Tagged)",
      roofColor: 0x64748b, // Darker street-facing slate massing
      wallColor: 0x94a3b8,
      roofOpacity: 0.80,
      wallOpacity: 0.70,
    };
  }

  // 5. RESIDENTIAL (Default concrete forms)
  return {
    typology: "RESIDENTIAL",
    label: "Residential Concrete Form (Procedural Representative)",
    roofColor: 0xe2e8f0, // Warm concrete top
    wallColor: 0xcbd5e1, // Pale concrete wall
    roofOpacity: 0.75,
    wallOpacity: 0.65,
  };
}

/**
 * Builds real OSM-derived footprint extrusions. The meshes are visualization
 * estimates, not surveyed building heights or a complete city inventory.
 */
export function buildUrbanLayer(ctx: LayerBuilderContext): UrbanBuilderResult {
  const buildingsGroup = new THREE.Group();
  buildingsGroup.name = "Layer_Urban_Fabric";

  // Reusable materials cache by typology to minimize draw calls
  const materialCache = new Map<BuildingTypology, THREE.Material[]>();
  const getTypologyMaterials = (config: BuildingTypologyConfig): THREE.Material[] => {
    if (materialCache.has(config.typology)) return materialCache.get(config.typology)!;

    const roofMaterial = new THREE.MeshStandardMaterial({
      color: config.roofColor,
      roughness: 0.5,
      metalness: config.typology === "INDUSTRIAL" ? 0.25 : 0.05,
      transparent: true,
      opacity: config.roofOpacity,
    });

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: config.wallColor,
      roughness: 0.7,
      metalness: 0.05,
      transparent: true,
      opacity: config.wallOpacity,
    });

    const mats = [roofMaterial, wallMaterial];
    materialCache.set(config.typology, mats);
    return mats;
  };

  // Reusable rooftop water tank geometry for city-life ambient detail
  const waterTankGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.35, 10);
  const waterTankMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // Black/blue plastic rooftop water storage tank
    roughness: 0.4,
    metalness: 0.1,
  });

  let featureCount = 0;

  ctx.buildingsDataset?.features.forEach((feature) => {
    const origProps = feature.properties.originalProperties || {};
    const config = classifyBuildingTypology(origProps);
    const materials = getTypologyMaterials(config);

    const polygons = feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;

    polygons.forEach((rings: Array<Array<[number, number, number?]>>) => {
      const footprint = makeShape(rings, ctx);
      if (!footprint) return;

      const buildingHeight = getBuildingHeight(feature.properties);
      const geometry = new THREE.ExtrudeGeometry(footprint.shape, {
        depth: buildingHeight,
        bevelEnabled: false,
        curveSegments: 1,
      });
      // Shape coordinates are X/-Z; rotate extrusion upward into world Y.
      geometry.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geometry, materials);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const baseElevation = ctx.sampleElevation(footprint.latitude, footprint.longitude) + 0.1;
      mesh.position.y = baseElevation;
      mesh.name = `OSM_Building_${String(feature.properties.featureId)}`;

      // Procedural City-Life Detail: Add rooftop water tank to selected residential/commercial roofs
      const featureIdNum = Number(feature.properties.featureId) || featureCount;
      if ((config.typology === "RESIDENTIAL" || config.typology === "COMMERCIAL") && featureIdNum % 3 === 0) {
        const tankMesh = new THREE.Mesh(waterTankGeo, waterTankMat);
        tankMesh.position.set(0, buildingHeight + 0.18, 0);
        tankMesh.userData = {
          type: "rooftop_tank",
          provenance: "PROCEDURAL / REPRESENTATIVE",
        };
        mesh.add(tankMesh);
      }

      mesh.userData = {
        type: "building",
        source: "OpenStreetMap",
        sourceType: "OPEN_DATA",
        featureId: feature.properties.featureId,
        typology: config.typology,
        typologyLabel: config.label,
        originalProperties: origProps,
        data: {
          ...feature.properties,
          typology: config.typology,
          typologyLabel: config.label,
          provenanceNote: "3D building form is representative/procedural except where source geometry/attributes provide evidence.",
        },
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

