import * as THREE from "three";
import type { TerrainGrid } from "../digital-twin/types";

// ---------------------------------------------------------------------------
// GEOREFERENCE SYSTEM FOR TIRUPPUR DISTRICT, TAMIL NADU
// Center coordinate: 11.1085° N, 77.3411° E (Tiruppur City Hall / Noyyal Basin)
// ---------------------------------------------------------------------------
export const TIRUPPUR_CENTER_LAT = 11.1085;
export const TIRUPPUR_CENTER_LON = 77.3411;

export const METERS_PER_DEG_LAT = 111000;
export const METERS_PER_DEG_LON = 111000 * Math.cos((TIRUPPUR_CENTER_LAT * Math.PI) / 180);
export const WORLD_SCALE = 0.0035;

let activeTerrainGrid: TerrainGrid | null = null;

export function setActiveTerrainGrid(grid: TerrainGrid | null): void {
  activeTerrainGrid = grid;
}

export function getActiveTerrainGrid(): TerrainGrid | null {
  return activeTerrainGrid;
}

/**
 * Topographic DEM elevation sampling function for Tiruppur.
 * If a real GIS TerrainGrid is registered, samples directly from the elevation matrix.
 * Otherwise, falls back to the synthetic mathematical elevation model.
 */
export function sampleTiruppurElevation(lat: number, lon: number): number {
  if (
    activeTerrainGrid &&
    activeTerrainGrid.sourceType === "REAL" &&
    lat >= activeTerrainGrid.bounds.minLat &&
    lat <= activeTerrainGrid.bounds.maxLat &&
    lon >= activeTerrainGrid.bounds.minLon &&
    lon <= activeTerrainGrid.bounds.maxLon
  ) {
    const { bounds, width, height, elevations } = activeTerrainGrid;
    const colFrac = ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * (width - 1);
    const rowFrac = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * (height - 1);

    const c0 = Math.floor(colFrac);
    const c1 = Math.min(width - 1, c0 + 1);
    const r0 = Math.floor(rowFrac);
    const r1 = Math.min(height - 1, r0 + 1);

    const u = colFrac - c0;
    const v = rowFrac - r0;

    const e00 = elevations[r0 * width + c0] || 0;
    const e10 = elevations[r0 * width + c1] || 0;
    const e01 = elevations[r1 * width + c0] || 0;
    const e11 = elevations[r1 * width + c1] || 0;

    const top = e00 * (1 - u) + e10 * u;
    const bottom = e01 * (1 - u) + e11 * u;
    return top * (1 - v) + bottom * v;
  }

  // PROCEDURAL FALLBACK MODEL
  const dLat = (lat - TIRUPPUR_CENTER_LAT) * 100;
  const dLon = (lon - TIRUPPUR_CENTER_LON) * 100;

  const nwHigh = Math.max(0, (-dLon + dLat + 8) * 0.7);
  const eastSlope = -dLon * 0.35;
  const riverLat = 11.108 + 0.008 * Math.sin((lon - 77.25) * 12);
  const distToRiver = Math.abs(lat - riverLat);
  const riverDepression = Math.exp(-Math.pow(distToRiver / 0.012, 2)) * 3.8;

  const elevMeters = 300 + nwHigh * 7.5 + eastSlope * 5 - riverDepression * 4;
  return Math.max(0.1, (elevMeters - 288) * 0.16);
}

/**
 * Returns real elevation in meters above sea level (ASL)
 */
export function sampleRealElevationMeters(lat: number, lon: number): number {
  const elev3D = sampleTiruppurElevation(lat, lon);
  return Math.round(288 + elev3D / 0.16);
}

/**
 * Converts Geographic Latitude/Longitude coordinates to Three.js 3D Vector3 position
 */
export function geoTo3D(lat: number, lon: number, elevOffset: number = 0): THREE.Vector3 {
  const x = (lon - TIRUPPUR_CENTER_LON) * METERS_PER_DEG_LON * WORLD_SCALE;
  const z = -(lat - TIRUPPUR_CENTER_LAT) * METERS_PER_DEG_LAT * WORLD_SCALE;
  const y = sampleTiruppurElevation(lat, lon) + elevOffset;
  return new THREE.Vector3(x, y, z);
}

/**
 * Converts Three.js 3D (x, z) coordinates back to Geographic (lat, lon)
 */
export function vector3DToGeo(x: number, z: number): { lat: number; lon: number } {
  const lon = TIRUPPUR_CENTER_LON + x / (METERS_PER_DEG_LON * WORLD_SCALE);
  const lat = TIRUPPUR_CENTER_LAT - z / (METERS_PER_DEG_LAT * WORLD_SCALE);
  return { lat, lon };
}

