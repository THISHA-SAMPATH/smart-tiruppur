import * as THREE from "three";
import { LayerBuilderContext } from "./types";

export interface IndustrialUnitGeo {
  unit_id: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
  status: "COMPLIANT" | "WARNING" | "INVESTIGATE" | "OFFLINE";
  symbol: string;
  reuse: number;
  flow: number;
}

export const INDUSTRIAL_UNITS_GEO: IndustrialUnitGeo[] = [
  { unit_id: "unit_001", name: "Arulpuram CETP Dyeing Unit 001", lat: 11.0835, lon: 77.3210, type: "Dyeing & Bleaching", status: "COMPLIANT", symbol: "●", reuse: 92, flow: 145 },
  { unit_id: "unit_002", name: "Veerapandi Dyeing Unit 002", lat: 11.0740, lon: 77.3520, type: "Textile Processing", status: "COMPLIANT", symbol: "●", reuse: 89, flow: 110 },
  { unit_id: "unit_003", name: "Mangalam Road Unit 003", lat: 11.1020, lon: 77.2840, type: "ZLD Dyeing Unit", status: "WARNING", symbol: "▲", reuse: 84, flow: 160 },
  { unit_id: "unit_004", name: "Kasipalayam Dyeing Unit 004", lat: 11.1190, lon: 77.3950, type: "Garment Washing", status: "COMPLIANT", symbol: "●", reuse: 94, flow: 98 },
  { unit_id: "unit_005", name: "Rayapuram Processing Unit 005", lat: 11.1140, lon: 77.3510, type: "Yarn Dyeing", status: "COMPLIANT", symbol: "●", reuse: 91, flow: 125 },
  { unit_id: "unit_006", name: "Tiruppur North CETP Unit 006", lat: 11.1350, lon: 77.3480, type: "CETP Member Facility", status: "COMPLIANT", symbol: "●", reuse: 95, flow: 210 },
  { unit_id: "unit_007", name: "Angeripalayam Processing 007", lat: 11.1420, lon: 77.3310, type: "Fabric Processing", status: "INVESTIGATE", symbol: "!", reuse: 76, flow: 185 },
  { unit_id: "unit_008", name: "Murugampalayam Dyeing 008", lat: 11.0890, lon: 77.3620, type: "Textile Finishing", status: "COMPLIANT", symbol: "●", reuse: 88, flow: 105 },
  { unit_id: "unit_009", name: "Nallur Industrial Cluster 009", lat: 11.0780, lon: 77.3780, type: "Dyeing Unit", status: "COMPLIANT", symbol: "●", reuse: 90, flow: 130 },
  { unit_id: "unit_010", name: "Palayakkarai Hub Unit 010", lat: 11.1110, lon: 77.4420, type: "Textile Processing", status: "WARNING", symbol: "▲", reuse: 81, flow: 140 },
  { unit_id: "unit_011", name: "Uthukuli Road Unit 011", lat: 11.1280, lon: 77.4120, type: "Bleaching & Dyeing", status: "COMPLIANT", symbol: "●", reuse: 93, flow: 115 },
  { unit_id: "unit_012", name: "Vijayapuram Processing 012", lat: 11.0960, lon: 77.3380, type: "ZLD Facility", status: "COMPLIANT", symbol: "●", reuse: 96, flow: 175 },
];

export interface IndustrialBuilderResult {
  unitsGroup: THREE.Group;
}

/**
 * Builds Industrial Facilities and status beacons
 */
export function buildIndustrialLayer(ctx: LayerBuilderContext): IndustrialBuilderResult {
  const unitsGroup = new THREE.Group();
  unitsGroup.name = "Layer_Industrial_Units";

  INDUSTRIAL_UNITS_GEO.forEach((unit, idx) => {
    const pos = ctx.geoTo3D(unit.lat, unit.lon, 0);
    const bldgHeight = 2.0 + (idx % 3) * 0.8;

    const group = new THREE.Group();
    group.position.copy(pos);

    const bldgGeo = new THREE.BoxGeometry(2.2, bldgHeight, 2.2);
    const bldgMesh = new THREE.Mesh(
      bldgGeo,
      new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.4,
        roughness: 0.6,
      })
    );
    bldgMesh.position.y = bldgHeight / 2;
    group.add(bldgMesh);

    let statusColor = 0x10b981;
    if (unit.status === "WARNING") statusColor = 0xf59e0b;
    if (unit.status === "INVESTIGATE") statusColor = 0xdc2626;

    const beaconMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 12, 12),
      new THREE.MeshStandardMaterial({
        color: statusColor,
        emissive: statusColor,
        emissiveIntensity: 0.8,
      })
    );
    beaconMesh.position.y = bldgHeight + 0.6;
    beaconMesh.userData = { type: "unit", data: unit };
    group.add(beaconMesh);

    ctx.interactiveObjects.push(beaconMesh);
    unitsGroup.add(group);
  });

  return { unitsGroup };
}
