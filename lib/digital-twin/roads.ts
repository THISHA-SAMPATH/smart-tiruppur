import * as THREE from "three";
import { LayerBuilderContext } from "./types";

export interface RoadsBuilderResult {
  roadsGroup: THREE.Group;
}

/**
 * Clean layer container for road transportation networks (Phase 3 GIS ready).
 * Avoids fake or hard-coded coordinates until verified OSM datasets are ingested.
 */
export function buildRoadsLayer(ctx: LayerBuilderContext): RoadsBuilderResult {
  const roadsGroup = new THREE.Group();
  roadsGroup.name = "Layer_Roads";

  return {
    roadsGroup,
  };
}
