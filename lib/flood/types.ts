// ---------------------------------------------------------------------------
// TERRAIN-AWARE FLOOD-RISK ANALYSIS & SCENARIO ENGINE — TYPES
// Multi-scenario spatial accumulation estimation based on DEM topography & Noyyal river.
// ---------------------------------------------------------------------------

export type FloodScenarioPreset = "BASELINE" | "MODERATE_RAIN" | "HEAVY_RAIN" | "EXTREME_RAIN";

export interface FloodScenarioConfig {
  preset: FloodScenarioPreset;
  rainfallMmDay: number;
  rainfallDurationHours: number;
  riverFlowM3s: number;
  description: string;
}

export interface AffectedZoneRisk {
  zoneId: string;
  zoneName: string;
  elevationMetersASL: number;
  slopeDegrees: number;
  riverProximityMeters: number;
  accumulationDepthMeters: number;
  floodRiskScore: number;         // 0.00 to 1.00
  riskCategory: "LOW" | "MODERATE" | "HIGH" | "VERY HIGH" | "CRITICAL";
  estimatedAffectedInfrastructure: string[];
  nearbyCitizenComplaintsCount: number;
  inspectionSegmentsRequired: string[];
}

export interface FloodAnalysisResult {
  scenario: FloodScenarioConfig;
  modelType: "Terrain-based flood risk estimation";
  modelDescription: string;
  citywideMaxAccumulationMeters: number;
  highRiskZonesCount: number;
  affectedZones: AffectedZoneRisk[];
  methodologyProvenance: {
    demResolutionMeters: number;
    riverGeometrySource: string;
    drainageNetworkSource: string;
    disclaimer: string;
  };
  timestamp: string;
}
