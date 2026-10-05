import {
  ScenarioParameters,
  ScenarioRunResult,
  ComponentRiskComparison,
} from "./types";
import { classifyRiskCategory } from "@/lib/steri/calculator";

export const DEFAULT_SCENARIO_PARAMS: ScenarioParameters = {
  rainfallPctChange: 30,
  riverFlowPctChange: -20,
  industrialLoadPctChange: 10,
  groundwaterExtractionPctChange: 15,
  pollutionLoadPctChange: 20,
  wasteGenerationPctChange: 5,
};

export const BASELINE_SCORES = {
  flood: 0.32,
  pollution: 0.41,
  waterQuality: 0.45,
  groundwater: 0.55,
  industrialPressure: 0.48,
  complaints: 0.38,
  overallSteri: 0.43,
};

/**
 * Runs What-If Scenario Risk Estimation pipeline.
 * Explicitly labeled "Scenario estimation", preserving scientific transparency.
 */
export function runScenarioWhatIfEngine(
  params: Partial<ScenarioParameters> = DEFAULT_SCENARIO_PARAMS,
  title: string = "Custom What-If Simulation"
): ScenarioRunResult {
  const merged: ScenarioParameters = { ...DEFAULT_SCENARIO_PARAMS, ...params };

  // Calculate Scenario Risk Scores based on parameter sensitivity factors
  const floodSc = Math.min(
    1.0,
    Math.max(0.0, BASELINE_SCORES.flood + merged.rainfallPctChange * 0.006 - merged.riverFlowPctChange * 0.003)
  );

  const pollutionSc = Math.min(
    1.0,
    Math.max(0.0, BASELINE_SCORES.pollution + merged.industrialLoadPctChange * 0.005 + merged.pollutionLoadPctChange * 0.004)
  );

  const groundwaterSc = Math.min(
    1.0,
    Math.max(0.0, BASELINE_SCORES.groundwater + merged.groundwaterExtractionPctChange * 0.004 - merged.rainfallPctChange * 0.001)
  );

  const waterQualitySc = Math.min(
    1.0,
    Math.max(0.0, BASELINE_SCORES.waterQuality + merged.pollutionLoadPctChange * 0.005 - merged.riverFlowPctChange * 0.002)
  );

  const overallSc = Number(
    (0.20 * floodSc + 0.25 * pollutionSc + 0.20 * groundwaterSc + 0.20 * waterQualitySc + 0.15 * BASELINE_SCORES.complaints).toFixed(2)
  );

  const comparisons: ComponentRiskComparison[] = [
    {
      name: "Flood risk",
      baselineScore: BASELINE_SCORES.flood,
      scenarioScore: Number(floodSc.toFixed(2)),
      delta: Number((floodSc - BASELINE_SCORES.flood).toFixed(2)),
      pctChange: Number((((floodSc - BASELINE_SCORES.flood) / BASELINE_SCORES.flood) * 100).toFixed(1)),
      riskCategoryBaseline: classifyRiskCategory(BASELINE_SCORES.flood),
      riskCategoryScenario: classifyRiskCategory(floodSc),
    },
    {
      name: "Pollution risk",
      baselineScore: BASELINE_SCORES.pollution,
      scenarioScore: Number(pollutionSc.toFixed(2)),
      delta: Number((pollutionSc - BASELINE_SCORES.pollution).toFixed(2)),
      pctChange: Number((((pollutionSc - BASELINE_SCORES.pollution) / BASELINE_SCORES.pollution) * 100).toFixed(1)),
      riskCategoryBaseline: classifyRiskCategory(BASELINE_SCORES.pollution),
      riskCategoryScenario: classifyRiskCategory(pollutionSc),
    },
    {
      name: "Water Quality risk",
      baselineScore: BASELINE_SCORES.waterQuality,
      scenarioScore: Number(waterQualitySc.toFixed(2)),
      delta: Number((waterQualitySc - BASELINE_SCORES.waterQuality).toFixed(2)),
      pctChange: Number((((waterQualitySc - BASELINE_SCORES.waterQuality) / BASELINE_SCORES.waterQuality) * 100).toFixed(1)),
      riskCategoryBaseline: classifyRiskCategory(BASELINE_SCORES.waterQuality),
      riskCategoryScenario: classifyRiskCategory(waterQualitySc),
    },
    {
      name: "Groundwater risk",
      baselineScore: BASELINE_SCORES.groundwater,
      scenarioScore: Number(groundwaterSc.toFixed(2)),
      delta: Number((groundwaterSc - BASELINE_SCORES.groundwater).toFixed(2)),
      pctChange: Number((((groundwaterSc - BASELINE_SCORES.groundwater) / BASELINE_SCORES.groundwater) * 100).toFixed(1)),
      riskCategoryBaseline: classifyRiskCategory(BASELINE_SCORES.groundwater),
      riskCategoryScenario: classifyRiskCategory(groundwaterSc),
    },
    {
      name: "Overall STERI Index",
      baselineScore: BASELINE_SCORES.overallSteri,
      scenarioScore: overallSc,
      delta: Number((overallSc - BASELINE_SCORES.overallSteri).toFixed(2)),
      pctChange: Number((((overallSc - BASELINE_SCORES.overallSteri) / BASELINE_SCORES.overallSteri) * 100).toFixed(1)),
      riskCategoryBaseline: classifyRiskCategory(BASELINE_SCORES.overallSteri),
      riskCategoryScenario: classifyRiskCategory(overallSc),
    },
  ];

  return {
    scenarioId: `scn_${Date.now()}`,
    scenarioTitle: title,
    parameters: merged,
    modelVersion: "Scenario-Estimation-v1.4",
    modelType: "Scenario estimation",
    timestamp: new Date().toISOString(),
    comparisons,
    disclaimer: "This calculation provides simplified scenario estimation for what-if sensitivity analysis. It does not replace empirical hydrological or hydraulic predictive modeling.",
  };
}
