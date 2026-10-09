import * as THREE from "three";
import { LayerBuilderContext } from "./types";

export interface InfrastructureBuilderResult {
  infrastructureGroup: THREE.Group;
}

/**
 * Restrained procedural city-life infrastructure: streetlights, utility poles, vehicles, and industrial transport.
 * Explicitly documented as PROCEDURAL / REPRESENTATIVE visual context (not surveyed observations).
 */
export function buildInfrastructureLayer(ctx: LayerBuilderContext): InfrastructureBuilderResult {
  const infrastructureGroup = new THREE.Group();
  infrastructureGroup.name = "Layer_Infrastructure";

  // Shared geometry & material palettes
  const poleGeo = new THREE.CylinderGeometry(0.04, 0.05, 1.2, 6);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6, metalness: 0.4 });

  const lampGeo = new THREE.BoxGeometry(0.18, 0.08, 0.35);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfef08a }); // Soft warm streetlight LED glow

  const carBodyGeo = new THREE.BoxGeometry(0.45, 0.22, 0.9);
  const carRoofGeo = new THREE.BoxGeometry(0.38, 0.18, 0.5);
  const carMat1 = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 }); // Blue car
  const carMat2 = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 }); // White car

  const truckBodyGeo = new THREE.BoxGeometry(0.65, 0.45, 1.5);
  const truckCabinGeo = new THREE.BoxGeometry(0.62, 0.35, 0.5);
  const truckMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5, metalness: 0.2 }); // Amber industrial truck

  // Build streetlights & vehicles along major urban road corridors
  const corridorPoints = [
    { lat: 11.108, lon: 77.335 },
    { lat: 11.112, lon: 77.342 },
    { lat: 11.115, lon: 77.350 },
    { lat: 11.118, lon: 77.360 },
    { lat: 11.122, lon: 77.370 },
    { lat: 11.125, lon: 77.380 },
  ];

  corridorPoints.forEach((pt, idx) => {
    const pos = ctx.geoTo3D(pt.lat, pt.lon, 0.10);
    pos.y = ctx.sampleElevation(pt.lat, pt.lon) + 0.10;

    // 1. Streetlight Pole
    const lightGroup = new THREE.Group();
    lightGroup.position.set(pos.x + 0.6, pos.y, pos.z);

    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 0.6;
    lightGroup.add(pole);

    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(0, 1.2, 0.12);
    lightGroup.add(lamp);

    lightGroup.userData = {
      type: "infrastructure",
      name: "Urban Streetlight Pole",
      provenance: "PROCEDURAL / REPRESENTATIVE",
    };
    infrastructureGroup.add(lightGroup);

    // 2. Representative Vehicle / Industrial Truck
    const vehGroup = new THREE.Group();
    vehGroup.position.set(pos.x - 0.4, pos.y + 0.12, pos.z + (idx % 2 === 0 ? 1.2 : -1.2));

    if (idx % 2 === 0) {
      // Car
      const body = new THREE.Mesh(carBodyGeo, idx % 4 === 0 ? carMat1 : carMat2);
      body.position.y = 0.11;
      const roof = new THREE.Mesh(carRoofGeo, carMat2);
      roof.position.set(0, 0.28, -0.05);
      vehGroup.add(body);
      vehGroup.add(roof);
      vehGroup.userData = {
        type: "vehicle",
        name: "Representative Urban Road Vehicle",
        provenance: "PROCEDURAL / REPRESENTATIVE",
      };
    } else {
      // Industrial Tanker/Truck near facility
      const body = new THREE.Mesh(truckBodyGeo, truckMat);
      body.position.set(0, 0.225, -0.2);
      const cabin = new THREE.Mesh(truckCabinGeo, poleMat);
      cabin.position.set(0, 0.175, 0.6);
      vehGroup.add(body);
      vehGroup.add(cabin);
      vehGroup.userData = {
        type: "vehicle",
        name: "Representative Industrial Transport Truck",
        provenance: "PROCEDURAL / REPRESENTATIVE",
      };
    }

    infrastructureGroup.add(vehGroup);
  });

  return {
    infrastructureGroup,
  };
}
