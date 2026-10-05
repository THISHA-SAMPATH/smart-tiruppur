import {
  RiskCategory,
  SteriWeights,
  SteriComponentScores,
  SpatialRiskUnit,
  SteriCityOverview,
  SteriModelComparison,
} from "./types";

export const DEFAULT_STERI_WEIGHTS: SteriWeights = {
  pollution: 0.20,
  waterQuality: 0.20,
  flood: 0.15,
  groundwater: 0.15,
  industrialPressure: 0.15,
  complaintIntensity: 0.15,
};

/**
 * Classifies a normalized 0.0-1.0 STERI score into standard risk tiers.
 */
export function classifyRiskCategory(score: number): RiskCategory {
  if (score < 0.20) return "LOW";
  if (score < 0.40) return "MODERATE";
  if (score < 0.60) return "HIGH";
  if (score < 0.80) return "VERY HIGH";
  return "CRITICAL";
}

/**
 * Human readable label for component factors.
 */
export const COMPONENT_LABELS: Record<keyof SteriComponentScores, string> = {
  pollution: "Industrial Pollution Anomaly",
  waterQuality: "Noyyal Water Quality Degradation",
  flood: "Monsoon Inundation & Drainage Risk",
  groundwater: "Groundwater Depletion Stress",
  industrialPressure: "Industrial Unit Cluster Density",
  complaintIntensity: "Citizen Complaint Density",
};

/**
 * Base Spatial Units covering Tiruppur District's primary administrative FIRKAs,
 * industrial clusters, and river corridor sub-basins.
 */
const BASE_SPATIAL_UNITS_DATA: Array<Omit<SpatialRiskUnit, "steriScore" | "riskCategory" | "dominantFactor" | "dominantFactorLabel" | "recommendation">> = [
  {
    id: "angeripalayam",
    name: "Angeripalayam Fabric Processing Sector",
    type: "industrial_sector",
    lat: 11.1420,
    lon: 77.3310,
    areaKm2: 14.2,
    populationEst: 42000,
    componentScores: {
      pollution: 0.88,          // High anomaly history (Unit 007 investigation)
      waterQuality: 0.76,       // Elevated EC/turbidity upstream Kasipalayam
      flood: 0.35,              // Moderate low-lying slope
      groundwater: 0.72,        // High extraction for fabric washing
      industrialPressure: 0.92, // Dense fabric processing cluster
      complaintIntensity: 0.80, // High citizen odor/color complaints
    },
    confidence: 0.89,
    timestamp: new Date().toISOString(),
    provenance: {
      realDataSources: ["TNPCB Telemetry Station 001", "Municipal Effluent Logs"],
      simulatedDataSources: ["Chemical Plume Dispersion Engine"],
      derivedDataSources: ["Bayesian Unit 007 Anomaly Attribution (87%)"],
      historicalDataSources: ["TNPCB 2024 Industrial Registry"],
    },
    metrics: {
      activeSensors: 2,
      industrialUnits: 4,
      groundwaterStagePct: 104,
      recentComplaints: 18,
      noyyalProximityMeters: 120,
      elevationMetersASL: 298,
    },
  },
  {
    id: "kasipalayam",
    name: "Kasipalayam Noyyal Urban Exit Sector",
    type: "sub_basin",
    lat: 11.1190,
    lon: 77.3950,
    areaKm2: 18.5,
    populationEst: 68000,
    componentScores: {
      pollution: 0.82,          // Downstream chemical discharge accumulation
      waterQuality: 0.90,       // Severe EC spike (3450 µS/cm) at Kasipalayam Bridge
      flood: 0.78,              // Low urban elevation trough, flood bottleneck
      groundwater: 0.85,        // Over-exploited aquifer zone
      industrialPressure: 0.75, // Moderate washing/dyeing cluster
      complaintIntensity: 0.72, // Frequent water discoloration reports
    },
    confidence: 0.92,
    timestamp: new Date().toISOString(),
    provenance: {
      realDataSources: ["Kasipalayam Bridge Hardware Sensor (Live pH/EC/Turbidity)"],
      simulatedDataSources: ["Noyyal Downstream Hydrodynamic Model"],
      derivedDataSources: ["Water Quality Index (WQI) Derivation"],
      historicalDataSources: ["CGWB 2023 Groundwater Baseline"],
    },
    metrics: {
      activeSensors: 3,
      industrialUnits: 3,
      groundwaterStagePct: 118,
      recentComplaints: 14,
      noyyalProximityMeters: 45,
      elevationMetersASL: 290,
    },
  },
  {
    id: "firka_south",
    name: "Tiruppur South FIRKA",
    type: "firka",
    lat: 11.0820,
    lon: 77.3550,
    areaKm2: 32.8,
    populationEst: 115000,
    componentScores: {
      pollution: 0.48,          // Moderate industrial discharge
      waterQuality: 0.55,       // Moderate Noyyal impact
      flood: 0.40,              // Medium elevation plain
      groundwater: 0.94,        // Over-Exploited CGWB Stage (112.4%)
      industrialPressure: 0.70, // High urban textile density
      complaintIntensity: 0.65, // Groundwater depletion grievances
    },
    confidence: 0.94,
    timestamp: new Date().toISOString(),
    provenance: {
      realDataSources: ["CGWB State Piezometer Network (8 Piezometers)"],
      simulatedDataSources: ["GEC-2015 Recharge/Extraction Simulator"],
      derivedDataSources: ["FIRKA Groundwater Stress Derivation"],
      historicalDataSources: ["CGWB 2023 Official Dynamic Assessment"],
    },
    metrics: {
      activeSensors: 2,
      industrialUnits: 3,
      groundwaterStagePct: 112,
      recentComplaints: 11,
      noyyalProximityMeters: 450,
      elevationMetersASL: 305,
    },
  },
  {
    id: "firka_north",
    name: "Tiruppur North FIRKA",
    type: "firka",
    lat: 11.1320,
    lon: 77.3450,
    areaKm2: 28.4,
    populationEst: 98000,
    componentScores: {
      pollution: 0.65,          // Moderate-high processing activity
      waterQuality: 0.60,       // Tributary discharge risk
      flood: 0.25,              // Higher elevated foothills slope
      groundwater: 0.81,        // Critical Stage (94.2%)
      industrialPressure: 0.84, // Heavy knitting and printing cluster
      complaintIntensity: 0.58, // Moderate urban complaints
    },
    confidence: 0.90,
    timestamp: new Date().toISOString(),
    provenance: {
      realDataSources: ["North Tiruppur Piezometer Station"],
      simulatedDataSources: ["Urban Runoff Simulation"],
      derivedDataSources: ["Spatial Kriging Interpolation"],
      historicalDataSources: ["State Groundwater Department Records"],
    },
    metrics: {
      activeSensors: 2,
      industrialUnits: 4,
      groundwaterStagePct: 94,
      recentComplaints: 9,
      noyyalProximityMeters: 620,
      elevationMetersASL: 318,
    },
  },
  {
    id: "arulpuram",
    name: "Arulpuram CETP Dyeing Hub",
    type: "industrial_sector",
    lat: 11.0835,
    lon: 77.3210,
    areaKm2: 12.0,
    populationEst: 35000,
    componentScores: {
      pollution: 0.52,          // ZLD compliant CETP (Unit 001)
      waterQuality: 0.45,       // Controlled discharge via CETP
      flood: 0.30,              // Low flood susceptibility
      groundwater: 0.68,        // High recycled water usage (94% reuse)
      industrialPressure: 0.88, // Heavy CETP member unit density
      complaintIntensity: 0.40, // Low complaint rate due to ZLD audit
    },
    confidence: 0.95,
    timestamp: new Date().toISOString(),
    provenance: {
      realDataSources: ["CETP Online Continuous Effluent Monitoring (OCEMS)", "DPP Green Ledger SHA-256"],
      simulatedDataSources: ["CETP Hydraulic Load Model"],
      derivedDataSources: ["DPP Compliance Audit Derivation"],
      historicalDataSources: ["TNPCB ZLD Certification Database"],
    },
    metrics: {
      activeSensors: 2,
      industrialUnits: 2,
      groundwaterStagePct: 82,
      recentComplaints: 4,
      noyyalProximityMeters: 800,
      elevationMetersASL: 312,
    },
  },
  {
    id: "mangalam",
    name: "Mangalam Noyyal Upstream Sector",
    type: "sub_basin",
    lat: 11.1065,
    lon: 77.2600,
    areaKm2: 24.1,
    populationEst: 29000,
    componentScores: {
      pollution: 0.15,          // Clean agricultural upstream zone
      waterQuality: 0.22,       // Good water quality at Mangalam Entry (EC ~680 µS/cm)
      flood: 0.50,              // Agricultural floodplain, monsoon wetting
      groundwater: 0.45,        // Semi-Critical / Safe transition
      industrialPressure: 0.18, // Very low industrial presence
      complaintIntensity: 0.12, // Baseline low grievances
    },
    confidence: 0.96,
    timestamp: new Date().toISOString(),
    provenance: {
      realDataSources: ["Mangalam Bridge Telemetry Station (Station 001)"],
      simulatedDataSources: ["Upstream River Discharge Simulator"],
      derivedDataSources: ["Baseline Water Quality Standard"],
      historicalDataSources: ["Public Works Dept (PWD) Hydrological Survey"],
    },
    metrics: {
      activeSensors: 2,
      industrialUnits: 1,
      groundwaterStagePct: 68,
      recentComplaints: 2,
      noyyalProximityMeters: 20,
      elevationMetersASL: 308,
    },
  },
];

/**
 * Normalizes input weights so they sum to exactly 1.0.
 */
export function normalizeWeights(weights: Partial<SteriWeights>): SteriWeights {
  const merged: SteriWeights = { ...DEFAULT_STERI_WEIGHTS, ...weights };
  const total =
    merged.pollution +
    merged.waterQuality +
    merged.flood +
    merged.groundwater +
    merged.industrialPressure +
    merged.complaintIntensity;

  if (total <= 0) return DEFAULT_STERI_WEIGHTS;

  return {
    pollution: Number((merged.pollution / total).toFixed(4)),
    waterQuality: Number((merged.waterQuality / total).toFixed(4)),
    flood: Number((merged.flood / total).toFixed(4)),
    groundwater: Number((merged.groundwater / total).toFixed(4)),
    industrialPressure: Number((merged.industrialPressure / total).toFixed(4)),
    complaintIntensity: Number((merged.complaintIntensity / total).toFixed(4)),
  };
}

/**
 * Actionable recommendations based on dominant risk factor.
 */
function getRecommendationForDominant(dominant: keyof SteriComponentScores, unitName: string): string {
  switch (dominant) {
    case "pollution":
      return `Deploy targeted TNPCB mobile inspection team to ${unitName} and mandate real-time OCEMS telemetry audit.`;
    case "waterQuality":
      return `Trigger automated river aeration & emergency discharge regulation along Noyyal channel near ${unitName}.`;
    case "flood":
      return `Clear municipal stormwater drainage choke points and activate monsoon inundation warning sensors in ${unitName}.`;
    case "groundwater":
      return `Restrict commercial deep borewell extraction and mandate rainwater harvesting injection wells across ${unitName}.`;
    case "industrialPressure":
      return `Audit CETP hydraulic capacity and enforce zero-liquid-discharge (ZLD) compliance caps for textile units in ${unitName}.`;
    case "complaintIntensity":
      return `Despatch civic response squad to address geotagged citizen grievances and investigate localized environmental odor/spills in ${unitName}.`;
    default:
      return `Maintain continuous environmental monitoring and routine GIS telemetry surveillance in ${unitName}.`;
  }
}

/**
 * Calculates the spatial STERI score for all spatial units using given weights.
 */
export function calculateSteri(customWeights?: Partial<SteriWeights>): SteriCityOverview {
  const weights = normalizeWeights(customWeights || {});

  const units: SpatialRiskUnit[] = BASE_SPATIAL_UNITS_DATA.map((base) => {
    const cs = base.componentScores;
    // STERI_i = wp*Pollution_i + ww*WaterQuality_i + wf*Flood_i + wg*Groundwater_i + wi*IndustrialPressure_i + wc*Complaint_i
    const steriScore = Number(
      (
        weights.pollution * cs.pollution +
        weights.waterQuality * cs.waterQuality +
        weights.flood * cs.flood +
        weights.groundwater * cs.groundwater +
        weights.industrialPressure * cs.industrialPressure +
        weights.complaintIntensity * cs.complaintIntensity
      ).toFixed(3)
    );

    const riskCategory = classifyRiskCategory(steriScore);

    // Identify dominant factor (highest weighted sub-score)
    let maxWeightedScore = -1;
    let dominantFactor: keyof SteriComponentScores = "pollution";

    const keys: Array<keyof SteriComponentScores> = [
      "pollution",
      "waterQuality",
      "flood",
      "groundwater",
      "industrialPressure",
      "complaintIntensity",
    ];

    keys.forEach((key) => {
      const weightedVal = cs[key] * weights[key];
      if (weightedVal > maxWeightedScore) {
        maxWeightedScore = weightedVal;
        dominantFactor = key;
      }
    });

    const dominantFactorLabel = COMPONENT_LABELS[dominantFactor];
    const recommendation = getRecommendationForDominant(dominantFactor, base.name);

    return {
      ...base,
      steriScore,
      riskCategory,
      dominantFactor,
      dominantFactorLabel,
      recommendation,
    };
  });

  // Calculate citywide spatial average
  const citywideScore = Number(
    (units.reduce((acc, u) => acc + u.steriScore, 0) / units.length).toFixed(3)
  );
  const citywideCategory = classifyRiskCategory(citywideScore);

  // Identify citywide dominant factor
  const citywideSubSum: Record<keyof SteriComponentScores, number> = {
    pollution: 0,
    waterQuality: 0,
    flood: 0,
    groundwater: 0,
    industrialPressure: 0,
    complaintIntensity: 0,
  };

  units.forEach((u) => {
    (Object.keys(u.componentScores) as Array<keyof SteriComponentScores>).forEach((k) => {
      citywideSubSum[k] += u.componentScores[k];
    });
  });

  let maxCitySum = -1;
  let dominantCitywideFactor = "Groundwater Depletion Stress";

  (Object.keys(citywideSubSum) as Array<keyof SteriComponentScores>).forEach((k) => {
    if (citywideSubSum[k] > maxCitySum) {
      maxCitySum = citywideSubSum[k];
      dominantCitywideFactor = COMPONENT_LABELS[k];
    }
  });

  return {
    citywideScore,
    citywideCategory,
    totalSpatialUnits: units.length,
    dominantCitywideFactor,
    weights,
    units,
    timestamp: new Date().toISOString(),
    modelInfo: {
      name: "Smart Tiruppur Environmental Risk Index (STERI)",
      version: "v1.2-Research",
      formula: "STERI_i = ∑ (w_k × S_{k,i})",
      description: "Spatial multi-criteria environmental decision-support model aggregating pollution, water quality, hydrogeology, monsoon drainage, industrial density, and citizen telemetry.",
    },
  };
}

/**
 * Evaluates the STERI weighted model against baseline models for academic evaluation.
 * Models compared:
 * 1. STERI Weighted Model (User/Configured weights)
 * 2. Equal-Weight Baseline (w_k = 1/6 ≈ 0.1667)
 * 3. Conservative Max-Risk Model (Score_i = max_k S_{k,i})
 */
export function evaluateSteriModels(customWeights?: Partial<SteriWeights>): SteriModelComparison {
  const steriWeighted = calculateSteri(customWeights);

  const equalWeights: SteriWeights = {
    pollution: 1 / 6,
    waterQuality: 1 / 6,
    flood: 1 / 6,
    groundwater: 1 / 6,
    industrialPressure: 1 / 6,
    complaintIntensity: 1 / 6,
  };
  const baselineEqualWeight = calculateSteri(equalWeights);

  // Calculate Max-Risk Conservative Model
  const maxRiskUnits: SpatialRiskUnit[] = steriWeighted.units.map((u) => {
    const maxSubScore = Math.max(
      u.componentScores.pollution,
      u.componentScores.waterQuality,
      u.componentScores.flood,
      u.componentScores.groundwater,
      u.componentScores.industrialPressure,
      u.componentScores.complaintIntensity
    );
    const category = classifyRiskCategory(maxSubScore);
    return {
      ...u,
      steriScore: Number(maxSubScore.toFixed(3)),
      riskCategory: category,
    };
  });

  const maxRiskScore = Number(
    (maxRiskUnits.reduce((acc, u) => acc + u.steriScore, 0) / maxRiskUnits.length).toFixed(3)
  );

  const maxRiskConservative: SteriCityOverview = {
    ...steriWeighted,
    citywideScore: maxRiskScore,
    citywideCategory: classifyRiskCategory(maxRiskScore),
    units: maxRiskUnits,
    modelInfo: {
      name: "Conservative Max-Risk Baseline",
      version: "v1.0-Max",
      formula: "STERI_i = max_k (S_{k,i})",
      description: "Worst-case single-factor vulnerability evaluation.",
    },
  };

  // Find unit with maximum variance between weighted and equal model
  let maxDelta = -1;
  let maxDeltaUnitId = "";
  let maxDeltaUnitName = "";

  steriWeighted.units.forEach((u) => {
    const eqUnit = baselineEqualWeight.units.find((eu) => eu.id === u.id);
    if (eqUnit) {
      const delta = Math.abs(u.steriScore - eqUnit.steriScore);
      if (delta > maxDelta) {
        maxDelta = delta;
        maxDeltaUnitId = u.id;
        maxDeltaUnitName = u.name;
      }
    }
  });

  return {
    steriWeighted,
    baselineEqualWeight,
    maxRiskConservative,
    comparisonMetrics: {
      maxDeltaUnitId,
      maxDeltaUnitName,
      scoreDelta: Number(maxDelta.toFixed(3)),
      explanation: `The greatest risk variance occurs in ${maxDeltaUnitName} (Δ = ${maxDelta.toFixed(
        3
      )}), driven by component weighting adjustments.`,
    },
  };
}
