import * as THREE from "three";

// ---------------------------------------------------------------------------
// DIGITAL TWIN TERRAIN GRID INTERFACE (GIS READY)
// ---------------------------------------------------------------------------
export type TerrainSourceType = "REAL" | "PROCEDURAL_FALLBACK";

export interface GeographicBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface TerrainGrid {
  width: number;
  height: number;
  elevations: Float32Array | number[];
  minElevation: number;
  maxElevation: number;
  bounds: GeographicBounds;
  sourceType: TerrainSourceType;
  datasetName?: string;
  metadata?: Record<string, any>;
}

// ---------------------------------------------------------------------------
// LAYER TOGGLES DEFINITION
// ---------------------------------------------------------------------------
export interface DigitalTwinLayerToggles {
  terrain: boolean;
  contours: boolean;
  river: boolean;
  drainage?: boolean;
  roads?: boolean;
  urbanRoads?: boolean;
  buildings?: boolean;
  units: boolean;
  /** Explicitly simulated links from demo outfalls to the active waterway. */
  dischargePaths?: boolean;
  infrastructure?: boolean;
  vegetation?: boolean;
  sensors: boolean;
  groundwater: boolean;
  floodRisk: boolean;
  pollution: boolean;
  sourceSensorInfluence?: boolean;
  steriRisk?: boolean;
  citizenIssues?: boolean;
}

// ---------------------------------------------------------------------------
// HYDROLOGY GIS DATA INTERFACES
// ---------------------------------------------------------------------------
export type HydrologyFeatureType = "river" | "tributary_stream" | "canal" | "waterbody";
export type GISSourceType = "REAL" | "DERIVED" | "SIMULATED" | "OPEN_DATA";

export interface HydrologyFeatureProperties {
  id?: string | number;
  name: string;
  type: HydrologyFeatureType;
  source: string;
  sourceType: GISSourceType;
  flowDirection?: string;
  waterway?: string;
  metadata?: Record<string, any>;
}

export interface HydrologyGISFeature {
  type: "Feature";
  properties: HydrologyFeatureProperties;
  geometry: {
    type: "LineString" | "MultiLineString" | "Polygon" | "MultiPolygon";
    coordinates: any;
  };
}

export interface HydrologyGISDataset {
  type: "FeatureCollection";
  datasetName?: string;
  sourceType: GISSourceType;
  features: HydrologyGISFeature[];
}

// ---------------------------------------------------------------------------
// ROAD NETWORK GIS DATA INTERFACES
// ---------------------------------------------------------------------------
export type RoadClassType =
  | "motorway"
  | "trunk"
  | "primary"
  | "secondary"
  | "tertiary"
  | "residential"
  | "service"
  | "unclassified";

export interface RoadFeatureProperties {
  id?: string | number;
  featureId?: string | number;
  name?: string;
  highway?: string;
  roadClass?: RoadClassType | string;
  source?: string;
  sourceType?: GISSourceType;
  lanes?: number;
  oneway?: boolean;
  metadata?: Record<string, any>;
}

export interface RoadGISFeature {
  type: "Feature";
  properties: RoadFeatureProperties;
  geometry: {
    type: "LineString" | "MultiLineString";
    coordinates: any;
  };
}

export interface RoadGISDataset {
  type: "FeatureCollection";
  datasetName?: string;
  sourceType?: GISSourceType;
  features: RoadGISFeature[];
}

// ---------------------------------------------------------------------------
// OPEN DATA BUILDING FOOTPRINT GIS INTERFACES
// ---------------------------------------------------------------------------
export interface BuildingFeatureProperties {
  featureId?: string | number;
  name?: string;
  building?: string;
  height?: string | number;
  levels?: string | number;
  source: "OpenStreetMap";
  sourceType: "OPEN_DATA";
  originalProperties: Record<string, any>;
}

export interface BuildingGISFeature {
  type: "Feature";
  properties: BuildingFeatureProperties;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: any;
  };
}

export interface BuildingGISDataset {
  type: "FeatureCollection";
  datasetName?: string;
  sourceType: "OPEN_DATA";
  features: BuildingGISFeature[];
}

// ---------------------------------------------------------------------------
// BUILDER CONTEXT
// Passed to modular layer builders to assemble 3D objects cleanly
// ---------------------------------------------------------------------------
export interface LayerBuilderContext {
  scene: THREE.Scene;
  interactiveObjects: THREE.Object3D[];
  geoTo3D: (lat: number, lon: number, elevOffset?: number) => THREE.Vector3;
  vector3DToGeo: (x: number, z: number) => { lat: number; lon: number };
  sampleElevation: (lat: number, lon: number) => number;
  terrainGrid?: TerrainGrid | null;
  hydrologyDataset?: HydrologyGISDataset | null;
  roadsDataset?: RoadGISDataset | null;
  urbanRoadsDataset?: RoadGISDataset | null;
  buildingsDataset?: BuildingGISDataset | null;
  /** Active Noyyal/waterway curve supplied by the hydrology layer. */
  activeWaterwayCurve?: THREE.CatmullRomCurve3 | null;
}
