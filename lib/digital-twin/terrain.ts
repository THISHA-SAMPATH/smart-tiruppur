import * as THREE from "three";
import { TerrainGrid, LayerBuilderContext } from "./types";
import {
  TIRUPPUR_CENTER_LAT,
  TIRUPPUR_CENTER_LON,
  METERS_PER_DEG_LAT,
  METERS_PER_DEG_LON,
  WORLD_SCALE,
  sampleTiruppurElevation,
} from "../geo/projection";

export interface TerrainBuilderResult {
  terrainGroup: THREE.Group;
  contourGroup: THREE.Group;
  terrainMesh: THREE.Mesh;
  terrainGrid: TerrainGrid;
}

/**
 * Creates a procedural fallback TerrainGrid data structure for Tiruppur.
 * Ensures data interface compliance even when real raster DEM is not yet loaded.
 */
export function createProceduralTerrainGrid(
  width = 120,
  height = 120,
  bounds = {
    minLat: 11.00,
    maxLat: 11.22,
    minLon: 77.20,
    maxLon: 77.55,
  }
): TerrainGrid {
  const count = width * height;
  const elevations = new Float32Array(count);
  let minElev = Infinity;
  let maxElev = -Infinity;

  for (let r = 0; r < height; r++) {
    const lat = bounds.maxLat - (r / (height - 1)) * (bounds.maxLat - bounds.minLat);
    for (let c = 0; c < width; c++) {
      const lon = bounds.minLon + (c / (width - 1)) * (bounds.maxLon - bounds.minLon);
      const idx = r * width + c;
      const elev = sampleTiruppurElevation(lat, lon);
      elevations[idx] = elev;
      if (elev < minElev) minElev = elev;
      if (elev > maxElev) maxElev = elev;
    }
  }

  return {
    width,
    height,
    elevations,
    minElevation: minElev,
    maxElevation: maxElev,
    bounds,
    sourceType: "PROCEDURAL_FALLBACK",
    datasetName: "Tiruppur Synthetic Topographic Model (Fallback)",
  };
}

/**
 * Sample elevation from a TerrainGrid instance or fallback to procedural math
 */
export function sampleGridElevation(
  lat: number,
  lon: number,
  grid?: TerrainGrid | null
): number {
  if (!grid) {
    return sampleTiruppurElevation(lat, lon);
  }

  const { bounds, width, height, elevations, sourceType } = grid;
  if (
    sourceType === "REAL" &&
    lat >= bounds.minLat &&
    lat <= bounds.maxLat &&
    lon >= bounds.minLon &&
    lon <= bounds.maxLon
  ) {
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

  return sampleTiruppurElevation(lat, lon);
}

/**
 * Builds the 3D DEM Terrain mesh and GIS Contour Rings
 */
export function buildTerrainLayer(ctx: LayerBuilderContext): TerrainBuilderResult {
  const terrainGroup = new THREE.Group();
  terrainGroup.name = "Layer_Terrain";

  const contourGroup = new THREE.Group();
  contourGroup.name = "Layer_Contours";

  const activeGrid = ctx.terrainGrid || createProceduralTerrainGrid();

  const terrainWidth = 140;
  const terrainDepth = 140;
  const terrainSegs = 120;
  const geometry = new THREE.PlaneGeometry(terrainWidth, terrainDepth, terrainSegs, terrainSegs);
  geometry.rotateX(-Math.PI / 2);

  const posAttr = geometry.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const lon = TIRUPPUR_CENTER_LON + x / (METERS_PER_DEG_LON * WORLD_SCALE);
    const lat = TIRUPPUR_CENTER_LAT - z / (METERS_PER_DEG_LAT * WORLD_SCALE);

    const elev = sampleGridElevation(lat, lon, activeGrid);
    posAttr.setY(i, elev);
  }
  geometry.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.85,
    metalness: 0.02,
    flatShading: false,
  });
  const terrainMesh = new THREE.Mesh(geometry, terrainMat);
  terrainMesh.castShadow = true;
  terrainMesh.receiveShadow = true;
  terrainMesh.name = "Terrain_Surface_Mesh";

  terrainGroup.add(terrainMesh);
  ctx.interactiveObjects.push(terrainMesh);

  // Faint Topographical Elevation Plane Contours (Item #4)
  const contourLevels = [1.0, 2.5, 4.0];
  contourLevels.forEach((level) => {
    const planeRingGeo = new THREE.RingGeometry(20 * level, 20.2 * level, 64);
    planeRingGeo.rotateX(-Math.PI / 2);
    const contourMat = new THREE.MeshBasicMaterial({ color: 0xcbd5e1, side: THREE.DoubleSide, transparent: true, opacity: 0.12 });
    const ringMesh = new THREE.Mesh(planeRingGeo, contourMat);
    ringMesh.position.y = level;
    contourGroup.add(ringMesh);
  });

  return {
    terrainGroup,
    contourGroup,
    terrainMesh,
    terrainGrid: activeGrid,
  };
}
