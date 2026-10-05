// ---------------------------------------------------------------------------
// SCENARIO / WHAT-IF ENGINE — DOMAIN TYPES & SCHEMAS
// Tests how changing environmental & urban parameters affects city risk.
// ---------------------------------------------------------------------------

export interface ScenarioParameters {
  rainfallPctChange: number;               // e.g. +30%
  riverFlowPctChange: number;              // e.g. -20%
  industrialLoadPctChange: number;         // e.g. +10%
  groundwaterExtractionPctChange: number;   // e.g. +15%
  pollutionLoadPctChange: number;          // e.g. +20%
  wasteGenerationPctChange: number;        // e.g. +5%
}

export interface ComponentRiskComparison {
  name: string;                            // e.g. "Flood risk", "Pollution risk", "Groundwater risk", "Overall STERI"
  baselineScore: number;                   // 0.00 to 1.00 (e.g. 0.32)
  scenarioScore: number;                   // 0.00 to 1.00 (e.g. 0.57)
  delta: number;                           // e.g. +0.25
  pctChange: number;                       // e.g. +78.1%
  riskCategoryBaseline: string;            // e.g. "MODERATE"
  riskCategoryScenario: string;            // e.g. "HIGH"
}

export interface ScenarioRunResult {
  scenarioId: string;
  scenarioTitle: string;
  parameters: ScenarioParameters;
  modelVersion: string;                    // e.g. "Scenario-Estimation-v1.4"
  modelType: "Scenario estimation";
  timestamp: string;
  comparisons: ComponentRiskComparison[];
  disclaimer: string;
}
