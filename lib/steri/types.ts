// ---------------------------------------------------------------------------
// SMART TIRUPPUR ENVIRONMENTAL RISK INDEX (STERI) — DOMAIN TYPES & SCHEMAS
// Research-oriented spatial environmental risk scoring engine for Tiruppur.
// ---------------------------------------------------------------------------

export type RiskCategory = "LOW" | "MODERATE" | "HIGH" | "VERY HIGH" | "CRITICAL";

export interface SteriWeights {
  pollution: number;          // wp (default 0.20) - Effluent anomalies & chemical risk
  waterQuality: number;       // ww (default 0.20) - Noyyal River EC/pH/Turbidity telemetry
  flood: number;              // wf (default 0.15) - Monsoon inundation & elevation risk
  groundwater: number;        // wg (default 0.15) - CGWB FIRKA extraction & draft stage
  industrialPressure: number; // wi (default 0.15) - ZLD compliance & CETP cluster load
  complaintIntensity: number; // wc (default 0.15) - Geotagged citizen grievance density
}

export interface SteriComponentScores {
  pollution: number;          // Normalized 0.0 - 1.0
  waterQuality: number;       // Normalized 0.0 - 1.0
  flood: number;              // Normalized 0.0 - 1.0
  groundwater: number;        // Normalized 0.0 - 1.0
  industrialPressure: number; // Normalized 0.0 - 1.0
  complaintIntensity: number; // Normalized 0.0 - 1.0
}

export interface SpatialDataProvenance {
  realDataSources: string[];
  simulatedDataSources: string[];
  derivedDataSources: string[];
  historicalDataSources: string[];
}

export interface SpatialMetrics {
  activeSensors: number;
  industrialUnits: number;
  groundwaterStagePct: number;
  recentComplaints: number;
  noyyalProximityMeters: number;
  elevationMetersASL: number;
}

/** Shared provenance vocabulary used by the STERI and Digital Twin UIs. */
export type SteriSourceType = "SIMULATED" | "DERIVED" | "OPEN_DATA" | "MODELLED";

/** Traceable metadata for a calculated STERI component. */
export interface SteriComponentProvenance {
  sourceType: SteriSourceType;
  sourceDescription: string;
  scenario?: string;
  assumptions: string[];
  fallback?: string;
}

/** Building exposure remains outside the six-component STERI formula. */
export interface BuildingExposureIndicator {
  label: "OSM building exposure indicator";
  buildingCount: number;
  methodology: string;
  sourceType: "OPEN_DATA" | "DERIVED";
  limitation: string;
}

export interface SteriScenarioInput {
  floodPreset?: "BASELINE" | "MODERATE_RAIN" | "HEAVY_RAIN" | "EXTREME_RAIN";
  rainfallPctChange?: number;
  industrialLoadPctChange?: number;
  pollutionLoadPctChange?: number;
  groundwaterExtractionPctChange?: number;
}

export interface SpatialRiskUnit {
  id: string;                    // e.g., "firka_south", "kasipalayam"
  name: string;                  // e.g., "Tiruppur South FIRKA"
  type: "firka" | "industrial_sector" | "sub_basin";
  lat: number;
  lon: number;
  areaKm2: number;
  
  // Aggregate Risk Scores
  steriScore: number;            // Normalized 0.00 - 1.00
  riskCategory: RiskCategory;
  dominantFactor: keyof SteriComponentScores;
  dominantFactorLabel: string;
  recommendation: string;
  
  // Component Breakdown
  componentScores: SteriComponentScores;
  componentProvenance: Record<keyof SteriComponentScores, SteriComponentProvenance>;
  buildingExposure: BuildingExposureIndicator;
  
  // Provenance & Metadata
  confidence: number;            // 0.00 - 1.00 (e.g. 0.89)
  timestamp: string;
  provenance: SpatialDataProvenance;
  metrics: SpatialMetrics;
}

export interface SteriCityOverview {
  citywideScore: number;
  citywideCategory: RiskCategory;
  totalSpatialUnits: number;
  dominantCitywideFactor: string;
  weights: SteriWeights;
  units: SpatialRiskUnit[];
  timestamp: string;
  scenario: Required<SteriScenarioInput>;
  baselineCitywideScore: number;
  scenarioDelta: number;
  modelInfo: {
    name: string;
    version: string;
    formula: string;
    description: string;
  };
}

export interface SteriModelComparison {
  steriWeighted: SteriCityOverview;
  baselineEqualWeight: SteriCityOverview;
  maxRiskConservative: SteriCityOverview;
  comparisonMetrics: {
    maxDeltaUnitId: string;
    maxDeltaUnitName: string;
    scoreDelta: number;
    explanation: string;
  };
}
