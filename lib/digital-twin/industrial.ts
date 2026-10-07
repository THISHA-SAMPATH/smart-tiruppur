import * as THREE from "three";
import { LayerBuilderContext } from "./types";

const SYNTHETIC_SOURCE = "Synthetic demonstration dataset";

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
  sourceType: "SIMULATED";
  source: "Synthetic demonstration dataset";
  confidence: number;
}

/** Simulated/demo locations only; not a facility registry or measured dataset. */
export const INDUSTRIAL_UNITS_GEO: IndustrialUnitGeo[] = [
  ["unit_001", "Arulpuram CETP Dyeing Unit 001", 11.0835, 77.3210, "Dyeing & Bleaching", "COMPLIANT", "●", 92, 145, 0.72],
  ["unit_002", "Veerapandi Dyeing Unit 002", 11.0740, 77.3520, "Textile Processing", "COMPLIANT", "●", 89, 110, 0.68],
  ["unit_003", "Mangalam Road Unit 003", 11.1020, 77.2840, "ZLD Dyeing Unit", "WARNING", "▲", 84, 160, 0.64],
  ["unit_004", "Kasipalayam Dyeing Unit 004", 11.1190, 77.3950, "Garment Washing", "COMPLIANT", "●", 94, 98, 0.74],
  ["unit_005", "Rayapuram Processing Unit 005", 11.1140, 77.3510, "Yarn Dyeing", "COMPLIANT", "●", 91, 125, 0.70],
  ["unit_006", "Tiruppur North CETP Unit 006", 11.1350, 77.3480, "CETP Member Facility", "COMPLIANT", "●", 95, 210, 0.73],
  ["unit_007", "Angeripalayam Processing 007", 11.1420, 77.3310, "Fabric Processing", "INVESTIGATE", "!", 76, 185, 0.60],
  ["unit_008", "Murugampalayam Dyeing 008", 11.0890, 77.3620, "Textile Finishing", "COMPLIANT", "●", 88, 105, 0.69],
  ["unit_009", "Nallur Industrial Cluster 009", 11.0780, 77.3780, "Dyeing Unit", "COMPLIANT", "●", 90, 130, 0.67],
  ["unit_010", "Palayakkarai Hub Unit 010", 11.1110, 77.4420, "Textile Processing", "WARNING", "▲", 81, 140, 0.63],
  ["unit_011", "Uthukuli Road Unit 011", 11.1280, 77.4120, "Bleaching & Dyeing", "COMPLIANT", "●", 93, 115, 0.71],
  ["unit_012", "Vijayapuram Processing 012", 11.0960, 77.3380, "ZLD Facility", "COMPLIANT", "●", 96, 175, 0.75],
].map(([unit_id, name, lat, lon, type, status, symbol, reuse, flow, confidence]) => ({
  unit_id: unit_id as string, name: name as string, lat: lat as number, lon: lon as number, type: type as string,
  status: status as IndustrialUnitGeo["status"], symbol: symbol as string, reuse: reuse as number, flow: flow as number,
  sourceType: "SIMULATED" as const, source: SYNTHETIC_SOURCE, confidence: confidence as number,
}));

export interface IndustrialOutfall {
  outfall_id: string;
  unit_id: string;
  lat: number;
  lon: number;
  flow_rate: number;
  pollutant: string;
  concentration: number;
  sourceType: "SIMULATED";
  source: string;
  confidence: number;
}

/** Synthetic model inputs. Flow/concentration values are demonstration indices, not observations. */
export const INDUSTRIAL_OUTFALLS: IndustrialOutfall[] = INDUSTRIAL_UNITS_GEO.map((unit, index) => ({
  outfall_id: `outfall_${String(index + 1).padStart(3, "0")}`,
  unit_id: unit.unit_id,
  lat: unit.lat + (index % 2 === 0 ? 0.00018 : -0.00015),
  lon: unit.lon + (index % 3 === 0 ? 0.00016 : -0.00012),
  flow_rate: 22 + index * 3,
  pollutant: "Synthetic dye indicator",
  concentration: 18 + (index % 5) * 6,
  sourceType: "SIMULATED",
  source: SYNTHETIC_SOURCE,
  confidence: unit.confidence,
}));

export interface IndustrialOutfallConnection {
  unit: IndustrialUnitGeo;
  outfall: IndustrialOutfall;
  outfallPosition: THREE.Vector3;
  waterwayPosition: THREE.Vector3;
  waterwayT: number;
  sourceStrength: number;
  normalizedSourceStrength: number;
  connectionLabel: "SIMULATED DISCHARGE PATH";
}

export interface IndustrialBuilderResult {
  unitsGroup: THREE.Group;
  dischargePathsGroup: THREE.Group;
  outfallConnections: IndustrialOutfallConnection[];
}

function nearestPointOnCurve(curve: THREE.CatmullRomCurve3, point: THREE.Vector3) {
  const steps = 512;
  let nearest = curve.getPoint(0);
  let nearestT = 0;
  let nearestDistance = Infinity;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const candidate = curve.getPoint(t);
    const distance = candidate.distanceToSquared(point);
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestT = t;
      nearestDistance = distance;
    }
  }
  return { position: nearest, t: nearestT };
}

/** Builds simulated facilities, model-input outfalls, and explicitly simulated discharge paths. */
export function buildIndustrialLayer(ctx: LayerBuilderContext): IndustrialBuilderResult {
  const unitsGroup = new THREE.Group();
  unitsGroup.name = "Layer_Industrial_Units_Simulated";
  const dischargePathsGroup = new THREE.Group();
  dischargePathsGroup.name = "Layer_Simulated_Discharge_Paths";
  const connections: IndustrialOutfallConnection[] = [];
  const strengths = INDUSTRIAL_OUTFALLS.map((outfall) => outfall.flow_rate * outfall.concentration);
  const maxStrength = Math.max(...strengths, 1);

  INDUSTRIAL_UNITS_GEO.forEach((unit, index) => {
    const facilityPosition = ctx.geoTo3D(unit.lat, unit.lon, 0);
    const buildingHeight = 2.0 + (index % 3) * 0.8;
    const group = new THREE.Group();
    group.position.copy(facilityPosition);
    const building = new THREE.Mesh(new THREE.BoxGeometry(2.2, buildingHeight, 2.2), new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.4, roughness: 0.6 }));
    building.position.y = buildingHeight / 2;
    group.add(building);

    const outfall = INDUSTRIAL_OUTFALLS[index];
    const statusColor = unit.status === "INVESTIGATE" ? 0xdc2626 : unit.status === "WARNING" ? 0xf59e0b : 0x10b981;
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 12), new THREE.MeshStandardMaterial({ color: statusColor, emissive: statusColor, emissiveIntensity: 0.8 }));
    beacon.position.y = buildingHeight + 0.6;
    beacon.userData = {
      type: "unit",
      data: {
        unit,
        outfall,
        sourceStrength: strengths[index],
        normalizedSourceStrength: strengths[index] / maxStrength,
        connectionLabel: "SIMULATED DISCHARGE PATH",
      },
    };
    group.add(beacon);
    ctx.interactiveObjects.push(beacon);
    unitsGroup.add(group);

    const outfallPosition = ctx.geoTo3D(outfall.lat, outfall.lon, 0.15);
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10), new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xf97316, emissiveIntensity: 0.6 }));
    marker.position.copy(outfallPosition);
    marker.userData = { type: "outfall", data: { unit, outfall, sourceStrength: strengths[index], normalizedSourceStrength: strengths[index] / maxStrength } };
    dischargePathsGroup.add(marker);
    ctx.interactiveObjects.push(marker);

    if (ctx.activeWaterwayCurve) {
      const nearest = nearestPointOnCurve(ctx.activeWaterwayCurve, outfallPosition);
      const connection: IndustrialOutfallConnection = {
        unit, outfall, outfallPosition, waterwayPosition: nearest.position, waterwayT: nearest.t,
        sourceStrength: strengths[index], normalizedSourceStrength: strengths[index] / maxStrength,
        connectionLabel: "SIMULATED DISCHARGE PATH",
      };
      connections.push(connection);
      const geometry = new THREE.BufferGeometry().setFromPoints([outfallPosition, nearest.position]);
      const path = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.7 }));
      path.userData = { type: "outfall", data: { unit, outfall, sourceStrength: connection.sourceStrength, normalizedSourceStrength: connection.normalizedSourceStrength, connectionLabel: connection.connectionLabel } };
      dischargePathsGroup.add(path);
      ctx.interactiveObjects.push(path);
    }
  });

  return { unitsGroup, dischargePathsGroup, outfallConnections: connections };
}
