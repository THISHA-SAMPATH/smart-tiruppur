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
  buildings?: boolean;
  units: boolean;
  infrastructure?: boolean;
  vegetation?: boolean;
  sensors: boolean;
  groundwater: boolean;
  floodRisk: boolean;
  pollution: boolean;
  steriRisk?: boolean;
  citizenIssues?: boolean;
}

// ---------------------------------------------------------------------------
// HYDROLOGY GIS DATA INTERFACES
// ---------------------------------------------------------------------------
export type HydrologyFeatureType = "river" | "tributary_stream" | "canal" | "waterbody";
export type GISSourceType = "REAL" | "DERIVED" | "SIMULATED";

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
}

