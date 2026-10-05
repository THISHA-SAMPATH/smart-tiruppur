// ---------------------------------------------------------------------------
// ENVIRONMENTAL EARLY WARNING MODULE — TYPES & MODEL PROVIDER SCHEMAS
// Research-oriented time-series forecasting architecture (+1h, +3h, +6h, +24h).
// ---------------------------------------------------------------------------

export type PredictionHorizon = "+1h" | "+3h" | "+6h" | "+24h";

export type TargetMetricType = "water_quality" | "pollution" | "flood" | "groundwater";

export type PredictionRiskCategory = "LOW" | "MODERATE" | "HIGH" | "VERY HIGH" | "CRITICAL";

export interface TimeSeriesPoint {
  timestamp: string;
  observedValue?: number;
  predictedValue?: number;
  confidenceLower95?: number;
  confidenceUpper95?: number;
  isForecast: boolean;
}

export interface PredictionInputs {
  ph?: number;
  ec?: number;
  turbidity?: number;
  flow?: number;
  rainfallMmDay?: number;
  riverFlowM3s?: number;
  industrialActivityLoadPct?: number;
  groundwaterStagePct?: number;
  historicalRiskScore?: number;
  spatialContextName?: string;
}

export interface TimeSeriesPrediction {
  id: string;
  targetId: string;
  targetName: string;
  targetType: TargetMetricType;
  parameterName: string;           // e.g., "Electrical Conductivity (EC)"
  unitOfMeasure: string;            // e.g., "µS/cm", "NTU", "mm/hr"
  
  currentValue: number;
  predictionHorizon: PredictionHorizon;
  predictedValue: number;
  confidenceLower95: number;
  confidenceUpper95: number;
  confidence: number;              // 0.00 to 1.00 (e.g. 0.82 = 82%)
  riskCategory: PredictionRiskCategory;
  
  // Research Transparency Badge
  mode: "RESEARCH / SIMULATION MODE" | "LIVE TELEMETRY MODE";
  modelProviderName: string;       // e.g., "Heuristic Statistical Ridge Model"
  modelVersion: string;            // e.g. "v1.4-Research"
  
  series: TimeSeriesPoint[];
  inputs: PredictionInputs;
  timestamp: string;
}

/**
 * Replaceable Model Provider Interface.
 * Allows plugging in XGBoost, Random Forest, LSTM or Physics models later without changing UI/API code.
 */
export interface IPredictionModelProvider {
  name: string;
  version: string;
  predict(
    targetId: string,
    targetType: TargetMetricType,
    inputs: PredictionInputs,
    horizon: PredictionHorizon
  ): Promise<TimeSeriesPrediction>;
}
