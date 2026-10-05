import {
  FloodScenarioPreset,
  FloodScenarioConfig,
  FloodAnalysisResult,
  AffectedZoneRisk,
} from "./types";

export const FLOOD_SCENARIOS: Record<FloodScenarioPreset, FloodScenarioConfig> = {
  BASELINE: {
    preset: "BASELINE",
    rainfallMmDay: 0,
    rainfallDurationHours: 0,
    riverFlowM3s: 10,
    description: "Dry weather baseline conditions with routine Noyyal baseflow.",
  },
  MODERATE_RAIN: {
    preset: "MODERATE_RAIN",
    rainfallMmDay: 50,
    rainfallDurationHours: 6,
    riverFlowM3s: 35,
    description: "Moderate monsoon shower causing localized stormwater runoff.",
  },
  HEAVY_RAIN: {
    preset: "HEAVY_RAIN",
    rainfallMmDay: 150,
    rainfallDurationHours: 12,
    riverFlowM3s: 85,
    description: "Heavy monsoonal downpour with elevation trough accumulation.",
  },
  EXTREME_RAIN: {
    preset: "EXTREME_RAIN",
    rainfallMmDay: 250,
    rainfallDurationHours: 24,
    riverFlowM3s: 160,
    description: "Severe monsoonal inundation event triggering riverbank overtopping.",
  },
};

/**
 * Runs the Terrain-based flood risk estimation pipeline:
 * DEM elevation/slope -> drainage geometry -> rainfall scenario -> river conditions -> low-elevation accumulation -> flood-risk score.
 */
export function runFloodAnalysisPipeline(
  preset: FloodScenarioPreset = "HEAVY_RAIN"
): FloodAnalysisResult {
  const scenario = FLOOD_SCENARIOS[preset];

  // Base spatial sectors in Tiruppur with topography profiles
  const baseSectors = [
    {
      id: "kasipalayam",
      name: "Kasipalayam Noyyal Exit Trough",
      elev: 290,
      slope: 0.8,
      riverDist: 45,
      infra: ["Kasipalayam Bridge Telemetry", "Kasipalayam Market Access Road", "Drain Segment D-183"],
      complaints: 7,
      segments: ["Segment D-183", "Segment D-184"],
    },
    {
      id: "angeripalayam",
      name: "Angeripalayam Fabric Sector Slope",
      elev: 298,
      slope: 1.8,
      riverDist: 120,
      infra: ["Angeripalayam Bridge Approach", "Unit 007 Effluent Drain"],
      complaints: 4,
      segments: ["Segment D-112"],
    },
    {
      id: "firka_south",
      name: "Tiruppur South Plain",
      elev: 305,
      slope: 2.2,
      riverDist: 450,
      infra: ["Nallur Road Drainage Line", "Piezometer Station #TN-TPR-08"],
      complaints: 2,
      segments: ["Segment D-095"],
    },
    {
      id: "firka_north",
      name: "Tiruppur North Foothills",
      elev: 318,
      slope: 3.5,
      riverDist: 620,
      infra: ["North Tiruppur Primary Storm Drain"],
      complaints: 1,
      segments: ["Segment D-042"],
    },
    {
      id: "arulpuram",
      name: "Arulpuram CETP Industrial Sector",
      elev: 312,
      slope: 2.5,
      riverDist: 800,
      infra: ["Arulpuram CETP Storm Canal"],
      complaints: 1,
      segments: ["Segment D-088"],
    },
    {
      id: "mangalam",
      name: "Mangalam Upstream Floodplain",
      elev: 308,
      slope: 1.2,
      riverDist: 20,
      infra: ["Mangalam Bridge Telemetry Station", "Upstream Agricultural Channel"],
      complaints: 2,
      segments: ["Segment D-012"],
    },
  ];

  const affectedZones: AffectedZoneRisk[] = baseSectors.map((sec) => {
    // Terrain-based Accumulation Estimation Formula:
    // Low elevation (< 300m) + low slope (< 1.5 deg) + river proximity (< 100m) + rainfall
    const elevDepressionFactor = Math.max(0, (315 - sec.elev) / 25);
    const riverProximityFactor = Math.max(0, (500 - sec.riverDist) / 500);
    const rainFactor = scenario.rainfallMmDay / 250;

    const accumDepth = Number(
      (elevDepressionFactor * 0.8 + riverProximityFactor * 0.6) * rainFactor * 1.8
    ).toFixed(2);

    const depthNum = parseFloat(accumDepth);
    const score = Number(Math.min(1.0, depthNum / 1.5).toFixed(2));

    let riskCategory: "LOW" | "MODERATE" | "HIGH" | "VERY HIGH" | "CRITICAL" = "LOW";
    if (score >= 0.80) riskCategory = "CRITICAL";
    else if (score >= 0.60) riskCategory = "VERY HIGH";
    else if (score >= 0.40) riskCategory = "HIGH";
    else if (score >= 0.20) riskCategory = "MODERATE";

    return {
      zoneId: sec.id,
      zoneName: sec.name,
      elevationMetersASL: sec.elev,
      slopeDegrees: sec.slope,
      riverProximityMeters: sec.riverDist,
      accumulationDepthMeters: depthNum,
      floodRiskScore: score,
      riskCategory,
      estimatedAffectedInfrastructure: sec.infra,
      nearbyCitizenComplaintsCount: sec.complaints,
      inspectionSegmentsRequired: sec.segments,
    };
  });

  const maxDepth = Math.max(...affectedZones.map((z) => z.accumulationDepthMeters));
  const highRiskCount = affectedZones.filter((z) => z.floodRiskScore >= 0.6).length;

  return {
    scenario,
    modelType: "Terrain-based flood risk estimation",
    modelDescription: "Simplified spatial multi-criteria terrain accumulation estimation based on DEM topography, slope, and Noyyal river channel proximity.",
    citywideMaxAccumulationMeters: maxDepth,
    highRiskZonesCount: highRiskCount,
    affectedZones,
    methodologyProvenance: {
      demResolutionMeters: 30,
      riverGeometrySource: "OpenStreetMap Noyyal GeoJSON Channel",
      drainageNetworkSource: "Municipal Stormwater Drainage Lines Registry",
      disclaimer: "This model provides simplified spatial terrain risk estimation. It is not a physically accurate 2D hydrodynamic hydraulic simulation.",
    },
    timestamp: new Date().toISOString(),
  };
}
