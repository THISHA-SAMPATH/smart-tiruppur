import { RiskCategory, SteriWeights, SteriComponentScores, SpatialRiskUnit, SteriCityOverview, SteriModelComparison, SteriScenarioInput } from "./types";
import { calculateDynamicSectorInputs, DEFAULT_DYNAMIC_SCENARIO, resolveDynamicScenario, STERI_SECTORS, SteriComplaintPoint } from "./dynamic";

export const DEFAULT_STERI_WEIGHTS: SteriWeights = { pollution: 0.20, waterQuality: 0.20, flood: 0.15, groundwater: 0.15, industrialPressure: 0.15, complaintIntensity: 0.15 };

export function classifyRiskCategory(score: number): RiskCategory {
  if (score < 0.20) return "LOW";
  if (score < 0.40) return "MODERATE";
  if (score < 0.60) return "HIGH";
  if (score < 0.80) return "VERY HIGH";
  return "CRITICAL";
}

export const COMPONENT_LABELS: Record<keyof SteriComponentScores, string> = {
  pollution: "Relative Simulated Pollution Influence", waterQuality: "Modelled Water-Quality Risk", flood: "Monsoon Inundation & Drainage Risk", groundwater: "Groundwater Depletion Stress", industrialPressure: "Relative Simulated Industrial Pressure", complaintIntensity: "Citizen Complaint Intensity",
};

export function normalizeWeights(weights: Partial<SteriWeights>): SteriWeights {
  const merged: SteriWeights = { ...DEFAULT_STERI_WEIGHTS, ...weights };
  const total = Object.values(merged).reduce((sum, value) => sum + value, 0);
  if (total <= 0) return DEFAULT_STERI_WEIGHTS;
  return Object.fromEntries(Object.entries(merged).map(([key, value]) => [key, Number((value / total).toFixed(4))])) as unknown as SteriWeights;
}

function recommendation(dominant: keyof SteriComponentScores, name: string): string {
  const entries: Record<keyof SteriComponentScores, string> = {
    pollution: `Review simulated source-to-sensor influence and prioritize field verification near ${name}.`, waterQuality: `Review the modelled water-quality inputs and confirm conditions with appropriate monitoring near ${name}.`, flood: `Review drainage preparedness near ${name}; this remains a simplified terrain estimate.`, groundwater: `Review groundwater extraction conditions and the underlying assessment source for ${name}.`, industrialPressure: `Review relative simulated industrial loading and CETP capacity assumptions near ${name}.`, complaintIntensity: `Review complaint evidence and distinguish seeded/demo reports from submitted reports near ${name}.`,
  };
  return entries[dominant];
}

function calculateOverview(customWeights: Partial<SteriWeights> = {}, scenarioInput: SteriScenarioInput = DEFAULT_DYNAMIC_SCENARIO, realComplaintPoints?: SteriComplaintPoint[]): SteriCityOverview {
  const weights = normalizeWeights(customWeights);
  const scenario = resolveDynamicScenario(scenarioInput);
  const units: SpatialRiskUnit[] = STERI_SECTORS.map((sector) => {
    const dynamic = calculateDynamicSectorInputs(sector, scenario, realComplaintPoints);
    const scores = dynamic.componentScores;
    const steriScore = Number((weights.pollution * scores.pollution + weights.waterQuality * scores.waterQuality + weights.flood * scores.flood + weights.groundwater * scores.groundwater + weights.industrialPressure * scores.industrialPressure + weights.complaintIntensity * scores.complaintIntensity).toFixed(3));
    const dominantFactor = (Object.keys(scores) as Array<keyof SteriComponentScores>).reduce((current, key) => scores[key] * weights[key] > scores[current] * weights[current] ? key : current, "pollution");
    return {
      ...sector, ...dynamic, steriScore, riskCategory: classifyRiskCategory(steriScore), dominantFactor, dominantFactorLabel: COMPONENT_LABELS[dominantFactor], recommendation: recommendation(dominantFactor, sector.name), timestamp: new Date().toISOString(),
      provenance: {
        realDataSources: ["public/geo/tnpcb-noyyal-stations.json (station metadata only)", "public/geo/tiruppur-buildings.geojson (OSM building footprints)", "public/geo/tiruppur-roads.geojson (road geometry)", "public/geo/tiruppur-firka-boundaries.geojson (FIRKA geometry)"],
        simulatedDataSources: ["Synthetic demonstration sensor network", "Simulated industrial outfalls and source influence", "Flood-engine scenario inputs"],
        derivedDataSources: ["Spatial normalization and sector aggregation", "OSM building-count indicator"],
        historicalDataSources: ["Groundwater category baseline represented by existing sector metadata", "Seeded/demo citizen complaint dataset"],
      },
    };
  });
  const citywideScore = Number((units.reduce((sum, unit) => sum + unit.steriScore, 0) / units.length).toFixed(3));
  const dominantCitywideFactor = (Object.keys(DEFAULT_STERI_WEIGHTS) as Array<keyof SteriComponentScores>).reduce((current, key) => units.reduce((sum, unit) => sum + unit.componentScores[key] * weights[key], 0) > units.reduce((sum, unit) => sum + unit.componentScores[current] * weights[current], 0) ? key : current, "pollution");
  return {
    citywideScore, citywideCategory: classifyRiskCategory(citywideScore), totalSpatialUnits: units.length, dominantCitywideFactor: COMPONENT_LABELS[dominantCitywideFactor], weights, units, timestamp: new Date().toISOString(), scenario, baselineCitywideScore: citywideScore, scenarioDelta: 0,
    modelInfo: { name: "Smart Tiruppur Environmental Risk Index (STERI)", version: "v1.3-Dynamic-Research", formula: "STERI_i = Σ (w_k × S_{k,i})", description: "Dynamic, scenario-aware multi-criteria decision-support model using existing simulated, derived, service-based, demo, and open-data inputs. It is not a validated environmental forecast." },
  };
}

/** Calculates the existing six components from repository systems and documented model assumptions. */
export function calculateSteri(customWeights: Partial<SteriWeights> = {}, scenarioInput: SteriScenarioInput = DEFAULT_DYNAMIC_SCENARIO, realComplaintPoints?: SteriComplaintPoint[]): SteriCityOverview {
  const overview = calculateOverview(customWeights, scenarioInput, realComplaintPoints);
  const isBaseline = Object.entries(overview.scenario).every(([key, value]) => value === DEFAULT_DYNAMIC_SCENARIO[key as keyof SteriScenarioInput]);
  if (isBaseline) return overview;
  const baseline = calculateOverview(customWeights, DEFAULT_DYNAMIC_SCENARIO, realComplaintPoints);
  return { ...overview, baselineCitywideScore: baseline.citywideScore, scenarioDelta: Number((overview.citywideScore - baseline.citywideScore).toFixed(3)) };
}

export function evaluateSteriModels(customWeights: Partial<SteriWeights> = {}, scenarioInput: SteriScenarioInput = DEFAULT_DYNAMIC_SCENARIO, realComplaintPoints?: SteriComplaintPoint[]): SteriModelComparison {
  const steriWeighted = calculateSteri(customWeights, scenarioInput, realComplaintPoints);
  const equalWeights: SteriWeights = { pollution: 1 / 6, waterQuality: 1 / 6, flood: 1 / 6, groundwater: 1 / 6, industrialPressure: 1 / 6, complaintIntensity: 1 / 6 };
  const baselineEqualWeight = calculateSteri(equalWeights, scenarioInput, realComplaintPoints);
  const maxRiskUnits = steriWeighted.units.map((unit) => { const score = Number(Math.max(...Object.values(unit.componentScores)).toFixed(3)); return { ...unit, steriScore: score, riskCategory: classifyRiskCategory(score) }; });
  const maxRiskScore = Number((maxRiskUnits.reduce((sum, unit) => sum + unit.steriScore, 0) / maxRiskUnits.length).toFixed(3));
  const maxRiskConservative: SteriCityOverview = { ...steriWeighted, citywideScore: maxRiskScore, citywideCategory: classifyRiskCategory(maxRiskScore), units: maxRiskUnits, modelInfo: { name: "Conservative Max-Risk Baseline", version: "v1.0-Max", formula: "STERI_i = max_k (S_{k,i})", description: "Worst-case single-factor vulnerability evaluation." } };
  let maxDelta = -1; let maxDeltaUnitId = ""; let maxDeltaUnitName = "";
  steriWeighted.units.forEach((unit) => { const comparison = baselineEqualWeight.units.find((candidate) => candidate.id === unit.id); const delta = comparison ? Math.abs(unit.steriScore - comparison.steriScore) : 0; if (delta > maxDelta) { maxDelta = delta; maxDeltaUnitId = unit.id; maxDeltaUnitName = unit.name; } });
  return { steriWeighted, baselineEqualWeight, maxRiskConservative, comparisonMetrics: { maxDeltaUnitId, maxDeltaUnitName, scoreDelta: Number(maxDelta.toFixed(3)), explanation: `The greatest weighting variance occurs in ${maxDeltaUnitName} (Δ = ${maxDelta.toFixed(3)}).` } };
}
