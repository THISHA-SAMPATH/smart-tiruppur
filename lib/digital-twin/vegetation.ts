import * as THREE from "three";
import { LayerBuilderContext } from "./types";

export interface VegetationBuilderResult {
  vegetationGroup: THREE.Group;
}

/**
 * Clean layer container for vegetation and urban tree canopy (Phase 5 GIS ready).
 * Avoids fake or hard-coded coordinates until verified land cover datasets are ingested.
 */
export function buildVegetationLayer(ctx: LayerBuilderContext): VegetationBuilderResult {
  const vegetationGroup = new THREE.Group();
  vegetationGroup.name = "Layer_Vegetation";

  return {
    vegetationGroup,
  };
}
