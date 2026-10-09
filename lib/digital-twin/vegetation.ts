import * as THREE from "three";
import { LayerBuilderContext } from "./types";

export interface VegetationBuilderResult {
  vegetationGroup: THREE.Group;
}

/**
 * Restrained procedural urban tree canopy and riparian green buffer.
 * Explicitly documented as PROCEDURAL / REPRESENTATIVE visual context (not surveyed observations).
 */
export function buildVegetationLayer(ctx: LayerBuilderContext): VegetationBuilderResult {
  const vegetationGroup = new THREE.Group();
  vegetationGroup.name = "Layer_Vegetation";

  // Low-poly foliage geometry & material palette
  const trunkGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.7, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });

  const foliageGeo = new THREE.DodecahedronGeometry(0.45, 1);
  const foliageMat1 = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 }); // Emerald tree top
  const foliageMat2 = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.7 }); // Green canopy

  // Sample positions along Noyyal riparian zone and urban park buffers (lat: 11.09 - 11.14, lon: 77.26 - 77.40)
  const treeCount = 45;
  for (let i = 0; i < treeCount; i++) {
    const angle = (i / treeCount) * Math.PI * 2;
    const lat = 11.110 + Math.sin(angle * 3) * 0.022;
    const lon = 77.270 + (i / treeCount) * 0.12;

    const pos = ctx.geoTo3D(lat, lon, 0.10);
    pos.y = ctx.sampleElevation(lat, lon) + 0.10;

    const treeGroup = new THREE.Group();
    treeGroup.position.copy(pos);

    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.35;
    treeGroup.add(trunk);

    const foliage = new THREE.Mesh(foliageGeo, i % 2 === 0 ? foliageMat1 : foliageMat2);
    foliage.position.y = 0.85;
    foliage.scale.set(1 + (i % 3) * 0.15, 1 + (i % 2) * 0.2, 1 + (i % 3) * 0.15);
    treeGroup.add(foliage);

    treeGroup.userData = {
      type: "vegetation",
      name: "Urban Tree / Riparian Vegetation Canopy",
      provenance: "PROCEDURAL / REPRESENTATIVE",
      provenanceNote: "Representative tree canopy added for spatial visual context. Not a surveyed tree inventory.",
    };

    vegetationGroup.add(treeGroup);
  }

  return {
    vegetationGroup,
  };
}
