import { FLOOD_SCENARIOS, runFloodAnalysisPipeline } from "@/lib/flood/engine";
import { detectComplaintHotspots, calculateDistanceMeters } from "@/lib/citizen/engine";
import { ENVIRONMENTAL_SENSOR_REGISTRY } from "@/lib/digital-twin/sensors";
import { INDUSTRIAL_OUTFALLS, INDUSTRIAL_UNITS_GEO } from "@/lib/digital-twin/industrial";
import { BuildingExposureIndicator, SpatialMetrics, SteriComponentProvenance, SteriComponentScores, SteriScenarioInput } from "./types";

export const WATER_QUALITY_ASSUMPTIONS = {
  ecBaselineUsCm: 1500,
  ecHighRiskUsCm: 4000,
  neutralPh: 7,
  phDeviationAtFullRisk: 2,
  turbidityAtFullRisk: 100,
  lowFlowReference: 160,
} as const;

export const DEFAULT_DYNAMIC_SCENARIO: Required<SteriScenarioInput> = {
  floodPreset: "BASELINE",
  rainfallPctChange: 0,
  industrialLoadPctChange: 0,
  pollutionLoadPctChange: 0,
  groundwaterExtractionPctChange: 0,
};

/** Applies optional API/UI scenario fields without allowing `undefined` to erase defaults. */
export function resolveDynamicScenario(scenarioInput?: SteriScenarioInput): Required<SteriScenarioInput> {
  return {
    floodPreset: scenarioInput?.floodPreset ?? DEFAULT_DYNAMIC_SCENARIO.floodPreset,
    rainfallPctChange: scenarioInput?.rainfallPctChange ?? DEFAULT_DYNAMIC_SCENARIO.rainfallPctChange,
    industrialLoadPctChange: scenarioInput?.industrialLoadPctChange ?? DEFAULT_DYNAMIC_SCENARIO.industrialLoadPctChange,
    pollutionLoadPctChange: scenarioInput?.pollutionLoadPctChange ?? DEFAULT_DYNAMIC_SCENARIO.pollutionLoadPctChange,
    groundwaterExtractionPctChange: scenarioInput?.groundwaterExtractionPctChange ?? DEFAULT_DYNAMIC_SCENARIO.groundwaterExtractionPctChange,
  };
}

export interface SteriSectorDefinition {
  id: string;
  name: string;
  type: "firka" | "industrial_sector" | "sub_basin";
  lat: number;
  lon: number;
  areaKm2: number;
  groundwaterStagePct: number;
  elevationMetersASL: number;
}

export interface SteriComplaintPoint { latitude: number; longitude: number; }

export const STERI_SECTORS: SteriSectorDefinition[] = [
  { id: "angeripalayam", name: "Angeripalayam Fabric Processing Sector", type: "industrial_sector", lat: 11.142, lon: 77.331, areaKm2: 14.2, groundwaterStagePct: 104, elevationMetersASL: 298 },
  { id: "kasipalayam", name: "Kasipalayam Noyyal Urban Exit Sector", type: "sub_basin", lat: 11.119, lon: 77.395, areaKm2: 18.5, groundwaterStagePct: 118, elevationMetersASL: 290 },
  { id: "firka_south", name: "Tiruppur South FIRKA", type: "firka", lat: 11.082, lon: 77.355, areaKm2: 32.8, groundwaterStagePct: 112, elevationMetersASL: 305 },
  { id: "firka_north", name: "Tiruppur North FIRKA", type: "firka", lat: 11.132, lon: 77.345, areaKm2: 28.4, groundwaterStagePct: 94, elevationMetersASL: 318 },
  { id: "arulpuram", name: "Arulpuram CETP Dyeing Hub", type: "industrial_sector", lat: 11.0835, lon: 77.321, areaKm2: 12, groundwaterStagePct: 82, elevationMetersASL: 312 },
  { id: "mangalam", name: "Mangalam Noyyal Upstream Sector", type: "sub_basin", lat: 11.1065, lon: 77.26, areaKm2: 24.1, groundwaterStagePct: 68, elevationMetersASL: 308 },
];

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const sectorRadiusMeters = (areaKm2: number) => Math.sqrt(areaKm2 / Math.PI) * 1000;

function nearestSensor(sector: SteriSectorDefinition) {
  return ENVIRONMENTAL_SENSOR_REGISTRY.reduce((nearest, sensor) =>
    calculateDistanceMeters(sector.lat, sector.lon, sensor.lat, sensor.lon) < calculateDistanceMeters(sector.lat, sector.lon, nearest.lat, nearest.lon) ? sensor : nearest
  );
}

function categoryFromStage(stage: number) {
  if (stage >= 100) return "Over Exploited";
  if (stage >= 90) return "Critical";
  if (stage >= 70) return "Semi Critical";
  return "Safe";
}

const groundwaterCategoryScore: Record<string, number> = { Safe: 0.2, "Semi Critical": 0.45, Critical: 0.7, "Over Exploited": 0.9 };

// Derived from the 451 existing public/geo/tiruppur-buildings.geojson features.
// Each footprint centroid is counted within the documented equivalent-area sector circle.
// This compact artifact avoids bundling a public GeoJSON file into the client calculator.
const OSM_BUILDING_COUNTS: Record<string, number> = { angeripalayam: 7, kasipalayam: 6, firka_south: 160, firka_north: 42, arulpuram: 3, mangalam: 0 };

function buildingExposure(sector: SteriSectorDefinition): BuildingExposureIndicator {
  const buildingCount = OSM_BUILDING_COUNTS[sector.id] || 0;
  return {
    label: "OSM building exposure indicator",
    buildingCount,
    methodology: "Counts centroids from the existing OSM building footprints within a circular analysis footprint derived from the existing sector area.",
    sourceType: "OPEN_DATA",
    limitation: "The sectors have no authoritative boundary polygons; this is a building-count indicator, not occupancy, population, damage, or flood exposure.",
  };
}

export function calculateDynamicSectorInputs(sector: SteriSectorDefinition, scenarioInput?: SteriScenarioInput, realComplaintPoints?: SteriComplaintPoint[]) {
  const scenario = resolveDynamicScenario(scenarioInput);
  const sensor = nearestSensor(sector);
  const loadMultiplier = Math.max(0, 1 + scenario.industrialLoadPctChange / 100);
  const pollutionMultiplier = Math.max(0, 1 + scenario.pollutionLoadPctChange / 100);
  const maxSourceStrength = Math.max(...INDUSTRIAL_OUTFALLS.map((outfall) => outfall.flow_rate * outfall.concentration));
  const sourceInfluence = INDUSTRIAL_OUTFALLS.reduce((total, outfall) => {
    const sourceStrength = (outfall.flow_rate * outfall.concentration) / maxSourceStrength;
    const sensorDistance = calculateDistanceMeters(sensor.lat, sensor.lon, outfall.lat, outfall.lon);
    return total + sourceStrength * Math.exp(-sensorDistance / 8000);
  }, 0);
  const pollution = clamp(sourceInfluence * loadMultiplier * pollutionMultiplier);
  const ec = clamp((sensor.ec - WATER_QUALITY_ASSUMPTIONS.ecBaselineUsCm) / (WATER_QUALITY_ASSUMPTIONS.ecHighRiskUsCm - WATER_QUALITY_ASSUMPTIONS.ecBaselineUsCm));
  const ph = clamp(Math.abs(sensor.ph - WATER_QUALITY_ASSUMPTIONS.neutralPh) / WATER_QUALITY_ASSUMPTIONS.phDeviationAtFullRisk);
  const turbidity = clamp(sensor.turbidity / WATER_QUALITY_ASSUMPTIONS.turbidityAtFullRisk);
  const lowFlow = clamp((WATER_QUALITY_ASSUMPTIONS.lowFlowReference - sensor.flow) / WATER_QUALITY_ASSUMPTIONS.lowFlowReference);
  const waterQuality = Number((0.45 * ec + 0.2 * ph + 0.2 * turbidity + 0.15 * lowFlow).toFixed(3));
  const floodZone = runFloodAnalysisPipeline(scenario.floodPreset).affectedZones.find((zone) => zone.zoneId === sector.id);
  const flood = clamp((floodZone?.floodRiskScore || 0) * Math.max(0, 1 + scenario.rainfallPctChange / 100));
  const adjustedStage = sector.groundwaterStagePct * Math.max(0, 1 + scenario.groundwaterExtractionPctChange / 100);
  const groundwater = groundwaterCategoryScore[categoryFromStage(adjustedStage)];
  const radius = sectorRadiusMeters(sector.areaKm2);
  const nearbyUnits = INDUSTRIAL_UNITS_GEO.map((unit) => ({ unit, distance: calculateDistanceMeters(sector.lat, sector.lon, unit.lat, unit.lon) }));
  const industrialRaw = nearbyUnits.reduce((total, item) => total + (item.distance <= radius ? 1 : Math.exp(-(item.distance - radius) / 5000) * 0.25) * (item.unit.flow / 210), 0) * loadMultiplier;
  const allIndustrialRaw = STERI_SECTORS.map((other) => {
    const otherRadius = sectorRadiusMeters(other.areaKm2);
    return INDUSTRIAL_UNITS_GEO.reduce((total, unit) => {
      const distance = calculateDistanceMeters(other.lat, other.lon, unit.lat, unit.lon);
      return total + (distance <= otherRadius ? 1 : Math.exp(-(distance - otherRadius) / 5000) * 0.25) * (unit.flow / 210);
    }, 0);
  });
  const industrialPressure = clamp(industrialRaw / Math.max(...allIndustrialRaw, 1));
  const complaintPoints = realComplaintPoints?.length ? realComplaintPoints : detectComplaintHotspots().flatMap((hotspot) => hotspot.complaints);
  const complaintSource = realComplaintPoints?.length ? "Persisted geocoded citizen reports" : "Seeded geocoded citizen-complaint hotspot dataset";
  const complaintCount = complaintPoints.filter((complaint) => calculateDistanceMeters(sector.lat, sector.lon, complaint.latitude, complaint.longitude) <= radius).length;
  const allComplaintCounts = STERI_SECTORS.map((other) => complaintPoints.filter((complaint) => calculateDistanceMeters(other.lat, other.lon, complaint.latitude, complaint.longitude) <= sectorRadiusMeters(other.areaKm2)).length);
  const complaintIntensity = clamp(complaintCount / Math.max(...allComplaintCounts, 1));
  const componentScores: SteriComponentScores = { pollution, waterQuality, flood, groundwater, industrialPressure, complaintIntensity };
  const componentProvenance: Record<keyof SteriComponentScores, SteriComponentProvenance> = {
    pollution: { sourceType: "SIMULATED", sourceDescription: "Relative simulated source influence aggregated at the nearest simulated sensor.", scenario: `Industrial ${scenario.industrialLoadPctChange >= 0 ? "+" : ""}${scenario.industrialLoadPctChange}%, pollution ${scenario.pollutionLoadPctChange >= 0 ? "+" : ""}${scenario.pollutionLoadPctChange}%`, assumptions: ["Synthetic outfall strength = simulated flow × synthetic dye indicator.", "Distance-decay is a visual/model input, not calibrated dispersion."], fallback: "Nearest simulated sensor is used because sector-to-river sensor routing is not available to the server calculator." },
    waterQuality: { sourceType: "SIMULATED", sourceDescription: `Modelled water-quality risk from ${sensor.name} pH, EC, turbidity, and flow.`, assumptions: [`EC ${WATER_QUALITY_ASSUMPTIONS.ecBaselineUsCm}–${WATER_QUALITY_ASSUMPTIONS.ecHighRiskUsCm} µS/cm; pH deviation ${WATER_QUALITY_ASSUMPTIONS.phDeviationAtFullRisk}; turbidity ${WATER_QUALITY_ASSUMPTIONS.turbidityAtFullRisk}; low-flow reference ${WATER_QUALITY_ASSUMPTIONS.lowFlowReference}.`, "All thresholds are configurable model assumptions, not regulatory standards."], fallback: "Nearest simulated sensor association." },
    flood: { sourceType: "MODELLED", sourceDescription: "Existing terrain-based flood engine sector score.", scenario: `${scenario.floodPreset}: ${FLOOD_SCENARIOS[scenario.floodPreset].description}`, assumptions: ["Rainfall percentage scales the existing normalized flood score."], fallback: floodZone ? undefined : "No matching flood-engine zone; uses 0." },
    groundwater: { sourceType: "DERIVED", sourceDescription: "Existing groundwater assessment category mapping represented by sector baseline stage metadata.", scenario: `Extraction ${scenario.groundwaterExtractionPctChange >= 0 ? "+" : ""}${scenario.groundwaterExtractionPctChange}%`, assumptions: ["Safe=0.20, Semi Critical=0.45, Critical=0.70, Over Exploited=0.90.", "The local calculator does not fetch new groundwater observations." ] },
    industrialPressure: { sourceType: "SIMULATED", sourceDescription: "Relative simulated industrial pressure from the 12 simulated units, source flow proxy, and sector proximity.", scenario: `Industrial load ${scenario.industrialLoadPctChange >= 0 ? "+" : ""}${scenario.industrialLoadPctChange}%`, assumptions: ["Sector footprint is an equivalent-area circle.", "Unit flow is a simulated relative strength, not a facility record." ] },
    complaintIntensity: { sourceType: realComplaintPoints?.length ? "DERIVED" : "SIMULATED", sourceDescription: `${complaintSource} aggregated within the sector analysis footprint.`, assumptions: ["Sector footprint is an equivalent-area circle."], fallback: realComplaintPoints?.length ? undefined : "Seeded/simulated complaints are used when geocoded submitted reports are unavailable." },
  };
  const metrics: SpatialMetrics = { activeSensors: 1, industrialUnits: nearbyUnits.filter((item) => item.distance <= radius).length, groundwaterStagePct: Number(adjustedStage.toFixed(1)), recentComplaints: complaintCount, noyyalProximityMeters: Math.round(calculateDistanceMeters(sector.lat, sector.lon, sensor.lat, sensor.lon)), elevationMetersASL: sector.elevationMetersASL };
  return { componentScores, componentProvenance, metrics, buildingExposure: buildingExposure(sector), confidence: sensor.confidence };
}
