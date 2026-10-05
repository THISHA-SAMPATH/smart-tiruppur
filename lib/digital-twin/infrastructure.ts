import * as THREE from "three";
import { LayerBuilderContext } from "./types";

export interface InfrastructureBuilderResult {
  infrastructureGroup: THREE.Group;
}

/**
 * Clean layer container for utility infrastructure (Phase 5 GIS ready).
 * Avoids fake or hard-coded coordinates until verified infrastructure datasets are ingested.
 */
export function buildInfrastructureLayer(ctx: LayerBuilderContext): InfrastructureBuilderResult {
  const infrastructureGroup = new THREE.Group();
  infrastructureGroup.name = "Layer_Infrastructure";

  return {
    infrastructureGroup,
  };
}
