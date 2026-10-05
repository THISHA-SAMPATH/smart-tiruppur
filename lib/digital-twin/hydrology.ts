import * as THREE from "three";
import { LayerBuilderContext } from "./types";

export interface HydrologyBuilderResult {
  riverGroup: THREE.Group;
  drainageGroup: THREE.Group;
  riverFlowArrowsGroup: THREE.Group;
  pollutionPlumeGroup: THREE.Group;
  riverCurve: THREE.CatmullRomCurve3;
  flowParticles: THREE.Mesh[];
  plumeParticles: THREE.Mesh[];
}

/**
 * Builds Noyyal River tube geometry, flow arrows, pollution plume, and drainage channel container
 */
export function buildHydrologyLayers(ctx: LayerBuilderContext): HydrologyBuilderResult {
  const riverGroup = new THREE.Group();
  riverGroup.name = "Layer_Noyyal_River";

  const drainageGroup = new THREE.Group();
  drainageGroup.name = "Layer_Drainage_Channels"; // Container for GIS drainage vectors (Phase 2 ready)

  const riverFlowArrowsGroup = new THREE.Group();
  riverFlowArrowsGroup.name = "Layer_River_Flow_Arrows";

  const pollutionPlumeGroup = new THREE.Group();
  pollutionPlumeGroup.name = "Layer_Pollution_Plume";

  // 1. Noyyal River Core Curve
  const riverPoints: THREE.Vector3[] = [];
  for (let l = 77.24; l <= 77.54; l += 0.015) {
    const lat = 11.108 + 0.008 * Math.sin((l - 77.25) * 12);
    riverPoints.push(ctx.geoTo3D(lat, l, 0.25));
  }
  const riverCurve = new THREE.CatmullRomCurve3(riverPoints);

  const tubeGeo = new THREE.TubeGeometry(riverCurve, 80, 0.5, 8, false);
  const riverMesh = new THREE.Mesh(
    tubeGeo,
    new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
      roughness: 0.1,
    })
  );
  riverMesh.name = "Noyyal_River_Tube";
  riverGroup.add(riverMesh);

  // 2. River Flow Directional Cone Particles
  const flowCount = 12;
  const flowParticles: THREE.Mesh[] = [];
  const arrowGeo = new THREE.ConeGeometry(0.3, 0.8, 6);
  arrowGeo.rotateX(Math.PI / 2);
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  for (let f = 0; f < flowCount; f++) {
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    riverFlowArrowsGroup.add(arrow);
    flowParticles.push(arrow);
  }

  // 3. Pollution Plume Particles
  const plumeParticleCount = 16;
  const plumeParticles: THREE.Mesh[] = [];
  const plumeGeo = new THREE.SphereGeometry(0.4, 8, 8);
  const plumeMat = new THREE.MeshBasicMaterial({
    color: 0xdc2626,
    transparent: true,
    opacity: 0.85,
  });

  for (let p = 0; p < plumeParticleCount; p++) {
    const particle = new THREE.Mesh(plumeGeo, plumeMat);
    pollutionPlumeGroup.add(particle);
    plumeParticles.push(particle);
  }

  return {
    riverGroup,
    drainageGroup,
    riverFlowArrowsGroup,
    pollutionPlumeGroup,
    riverCurve,
    flowParticles,
    plumeParticles,
  };
}
