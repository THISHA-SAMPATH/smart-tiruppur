import * as THREE from "three";
import type { IndustrialOutfallConnection } from "./industrial";
import type { LayerBuilderContext } from "./types";

const SENSOR_SOURCE = "Synthetic demonstration sensor network";
/** The monitoring workspace exposes four streams; S_D intentionally has no map station. */
export const LOGICAL_SENSOR_STREAM_IDS = ["S_A", "S_B", "S_C", "S_D"] as const;
export type SensorStreamId = (typeof LOGICAL_SENSOR_STREAM_IDS)[number];

/** Three simulated map stations. S_D remains intentionally unmapped. */
export interface EnvironmentalSensor {
  sensor_id: string;
  stream_id: Exclude<SensorStreamId, "S_D">;
  name: string;
  designation: string;
  lat: number;
  lon: number;
  ph: number;
  ec: number;
  turbidity: number;
  flow: number;
  sourceType: "SIMULATED";
  source: "Synthetic demonstration sensor network";
  confidence: number;
}

/**
 * Simulated demonstration network. The unmapped S_D stream is retained by the
 * monitoring workspace only; no fourth location is inferred here.
 */
export const ENVIRONMENTAL_SENSOR_REGISTRY: EnvironmentalSensor[] = [
  { sensor_id: "sensor_001", stream_id: "S_A", name: "Mangalam Telemetry Station", designation: "Upstream Entry Station", lat: 11.10651, lon: 77.26001, ph: 7.4, ec: 1420, turbidity: 18, flow: 142, sourceType: "SIMULATED", source: SENSOR_SOURCE, confidence: 0.68 },
  { sensor_id: "sensor_002", stream_id: "S_B", name: "Kasipalayam Bridge Telemetry", designation: "Urban/Industrial Exit Station", lat: 11.11975, lon: 77.39716, ph: 6.8, ec: 2850, turbidity: 45, flow: 128, sourceType: "SIMULATED", source: SENSOR_SOURCE, confidence: 0.65 },
  { sensor_id: "sensor_003", stream_id: "S_C", name: "Orathapalayam Reservoir Exit", designation: "Downstream Reservoir Station", lat: 11.11084, lon: 77.53981, ph: 7.8, ec: 3100, turbidity: 62, flow: 95, sourceType: "SIMULATED", source: SENSOR_SOURCE, confidence: 0.66 },
];

export interface SensorRiverAttachment {
  snappedLat: number;
  snappedLon: number;
  distanceToRiver: number;
  riverPosition: number;
  riverChainage: number;
  downstreamOrder: number;
  riverGeometrySource: "OPEN_DATA_GIS" | "SIMULATED_FALLBACK";
  riverPoint: THREE.Vector3;
}

export interface SourceSensorLink {
  sourceUnitId: string;
  outfallId: string;
  sensorId: string;
  riverDistance: number;
  downstream: boolean;
  influence: number;
  sourceType: "SIMULATED";
}

export interface SensorRenderData extends EnvironmentalSensor, SensorRiverAttachment {
  simulatedSourceInfluence: number;
  upstreamSimulatedSourceCount: number;
}

export interface SensorLayerResult {
  sensorsGroup: THREE.Group;
  sourceSensorInfluenceGroup: THREE.Group;
  sensors: SensorRenderData[];
  sourceSensorLinks: SourceSensorLink[];
}

function nearestPointOnCurve(curve: THREE.CatmullRomCurve3, point: THREE.Vector3) {
  const steps = 512;
  let position = curve.getPoint(0);
  let t = 0;
  let distance = Infinity;
  for (let index = 0; index <= steps; index++) {
    const candidateT = index / steps;
    const candidate = curve.getPoint(candidateT);
    const candidateDistance = candidate.distanceToSquared(point);
    if (candidateDistance < distance) {
      position = candidate;
      t = candidateT;
      distance = candidateDistance;
    }
  }
  return { position, t, distance: Math.sqrt(distance) };
}

/**
 * Builds simulated sensor markers and source-to-sensor river-route overlays.
 * Influence is a visual-only, normalized strength × exponential river-distance
 * decay. It is not a calibrated transport or observation model.
 */
export function buildSensorLayer(
  ctx: LayerBuilderContext,
  outfallConnections: IndustrialOutfallConnection[],
  isGisRiverLoaded: boolean,
): SensorLayerResult {
  const sensorsGroup = new THREE.Group();
  sensorsGroup.name = "Layer_Simulated_Environmental_Sensors";
  const sourceSensorInfluenceGroup = new THREE.Group();
  sourceSensorInfluenceGroup.name = "Layer_Source_To_Sensor_Influence";
  const curve = ctx.activeWaterwayCurve;

  if (!curve) return { sensorsGroup, sourceSensorInfluenceGroup, sensors: [], sourceSensorLinks: [] };

  const curveLength = curve.getLength();
  const attachments = ENVIRONMENTAL_SENSOR_REGISTRY.map((sensor) => {
    const nearest = nearestPointOnCurve(curve, ctx.geoTo3D(sensor.lat, sensor.lon, 0.15));
    const snapped = ctx.vector3DToGeo(nearest.position.x, nearest.position.z);
    return {
      ...sensor,
      snappedLat: snapped.lat,
      snappedLon: snapped.lon,
      distanceToRiver: nearest.distance,
      riverPosition: nearest.t,
      riverChainage: nearest.t * curveLength,
      downstreamOrder: 0,
      riverGeometrySource: isGisRiverLoaded ? "OPEN_DATA_GIS" as const : "SIMULATED_FALLBACK" as const,
      riverPoint: nearest.position,
    };
  }).sort((a, b) => a.riverPosition - b.riverPosition);

  attachments.forEach((sensor, index) => { sensor.downstreamOrder = index + 1; });
  const sourceSensorLinks: SourceSensorLink[] = [];
  const influenceBySensor = new Map<string, number>();
  const countBySensor = new Map<string, number>();

  outfallConnections.forEach((connection) => {
    attachments.forEach((sensor) => {
      const downstream = sensor.riverPosition > connection.waterwayT;
      const riverDistance = Math.max(0, sensor.riverChainage - connection.waterwayT * curveLength);
      const influence = downstream
        ? connection.normalizedSourceStrength * Math.exp(-riverDistance / Math.max(curveLength * 0.25, 0.001))
        : 0;
      const link: SourceSensorLink = {
        sourceUnitId: connection.unit.unit_id,
        outfallId: connection.outfall.outfall_id,
        sensorId: sensor.sensor_id,
        riverDistance,
        downstream,
        influence,
        sourceType: "SIMULATED",
      };
      sourceSensorLinks.push(link);
      if (!downstream) return;
      influenceBySensor.set(sensor.sensor_id, (influenceBySensor.get(sensor.sensor_id) || 0) + influence);
      countBySensor.set(sensor.sensor_id, (countBySensor.get(sensor.sensor_id) || 0) + 1);

      // Follow the river curve from each source's attachment point to the sensor.
      const routePoints: THREE.Vector3[] = [];
      for (let step = 0; step <= 32; step++) {
        routePoints.push(curve.getPoint(connection.waterwayT + (sensor.riverPosition - connection.waterwayT) * (step / 32)));
      }
      const path = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(routePoints),
        new THREE.LineBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.15 + influence * 0.55 }),
      );
      path.userData = { type: "source_sensor_influence", label: "Relative simulated source influence", data: link };
      sourceSensorInfluenceGroup.add(path);
    });
  });

  const sensors = attachments.map((sensor) => ({
    ...sensor,
    simulatedSourceInfluence: Math.min(1, influenceBySensor.get(sensor.sensor_id) || 0),
    upstreamSimulatedSourceCount: countBySensor.get(sensor.sensor_id) || 0,
  }));

  sensors.forEach((sensor) => {
    const group = new THREE.Group();
    group.position.copy(ctx.geoTo3D(sensor.lat, sensor.lon, 0.55));

    // Outer white base ring
    const baseMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.06, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
    );
    baseMesh.position.y = 0.03;
    group.add(baseMesh);

    // Inner Cyan/Teal Beacon Post
    const innerDot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.28, 0.5, 16),
      new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.6,
        roughness: 0.2,
      })
    );
    innerDot.position.y = 0.28;
    innerDot.userData = { type: "sensor", data: sensor };
    group.add(innerDot);

    // Subtle Animated Pulse Ring
    const pulseRingGeo = new THREE.RingGeometry(0.6, 0.8, 32);
    pulseRingGeo.rotateX(-Math.PI / 2);
    const pulseRingMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const pulseRing = new THREE.Mesh(pulseRingGeo, pulseRingMat);
    pulseRing.name = "Sensor_Pulse_Ring";
    pulseRing.position.y = 0.02;
    group.add(pulseRing);

    sensorsGroup.add(group);
    ctx.interactiveObjects.push(innerDot);
  });

  return { sensorsGroup, sourceSensorInfluenceGroup, sensors, sourceSensorLinks };
}
