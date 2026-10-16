import type {
  GroundwaterAssessment,
  GroundwaterRisk,
  GroundwaterZone,
  CgwbBaseline,
  GroundwaterSimulation,
} from "@/lib/types";

export interface FirkaMetadata {
  zone_id: string;
  name: string;
  taluk: string;
  cx: number;
  cy: number;
  assessment_year: number;
  num_piezometers: number;
  baseline: CgwbBaseline;
  observations: Array<number | null>;
}

// Complete registry of all 33 Tiruppur District FIRKAs with official CGWB 2024 Dynamic Assessment baselines
// Source: Central Ground Water Board (CGWB) & State Water Resources Department, Tamil Nadu (GEC-2015 methodology)
export const CGWB_TIRUPPUR_FIRKAS: FirkaMetadata[] = [
  // 1. Tiruppur North Taluk
  {
    zone_id: "tiruppur_north",
    name: "TIRUPPUR NORTH",
    taluk: "Tiruppur North",
    cx: 77.34,
    cy: 11.135,
    assessment_year: 2024,
    num_piezometers: 3,
    baseline: {
      annual_extractable_resource_ham: 3120.5,
      total_extraction_ham: 2939.51,
      stage_percent: 94.2,
      category: "Critical",
    },
    observations: [12.8, null, 13.5],
  },
  {
    zone_id: "tiruppur_velampalayam",
    name: "VELAMPALAYAM",
    taluk: "Tiruppur North",
    cx: 77.305,
    cy: 11.15,
    assessment_year: 2024,
    num_piezometers: 2,
    baseline: {
      annual_extractable_resource_ham: 1850.2,
      total_extraction_ham: 2007.47,
      stage_percent: 108.5,
      category: "Over Exploited",
    },
    observations: [15.0, 14.8],
  },

  // 2. Tiruppur South Taluk
  {
    zone_id: "tiruppur_south",
    name: "TIRUPPUR SOUTH",
    taluk: "Tiruppur South",
    cx: 77.345,
    cy: 11.085,
    assessment_year: 2024,
    num_piezometers: 4,
    baseline: {
      annual_extractable_resource_ham: 2985.45,
      total_extraction_ham: 3355.65,
      stage_percent: 112.4,
      category: "Over Exploited",
    },
    observations: [14.2, 15.1, null, 16.0],
  },
  {
    zone_id: "tiruppur_nallur_t",
    name: "NALLUR(T)",
    taluk: "Tiruppur South",
    cx: 77.375,
    cy: 11.095,
    assessment_year: 2024,
    num_piezometers: 2,
    baseline: {
      annual_extractable_resource_ham: 2200.0,
      total_extraction_ham: 2312.2,
      stage_percent: 105.1,
      category: "Over Exploited",
    },
    observations: [13.9, null],
  },
  {
    zone_id: "tiruppur_south_avanashipalayam",
    name: "SOUTH AVANASHIPALAYAM",
    taluk: "Tiruppur South",
    cx: 77.41,
    cy: 10.98,
    assessment_year: 2024,
    num_piezometers: 2,
    baseline: {
      annual_extractable_resource_ham: 2750.0,
      total_extraction_ham: 2785.75,
      stage_percent: 101.3,
      category: "Over Exploited",
    },
    observations: [14.5, 14.1],
  },

  // 3. Avinashi Taluk
  {
    zone_id: "tiruppur_avanashi_east",
    name: "AVANASHI EAST",
    taluk: "Avinashi",
    cx: 77.29,
    cy: 11.21,
    assessment_year: 2024,
    num_piezometers: 2,
    baseline: {
      annual_extractable_resource_ham: 2450.0,
      total_extraction_ham: 2116.8,
      stage_percent: 86.4,
      category: "Semi Critical",
    },
    observations: [11.2, 11.8],
  },
  {
    zone_id: "tiruppur_avinashi_west",
    name: "AVINASHI WEST",
    taluk: "Avinashi",
    cx: 77.23,
    cy: 11.21,
    assessment_year: 2024,
    num_piezometers: 2,
    baseline: {
      annual_extractable_resource_ham: 2300.0,
      total_extraction_ham: 1934.3,
      stage_percent: 84.1,
      category: "Semi Critical",
    },
    observations: [10.9, 11.4],
  },
  {
    zone_id: "tiruppur_sevur",
    name: "SEVUR",
    taluk: "Avinashi",
    cx: 77.265,
    cy: 11.27,
    assessment_year: 2024,
    num_piezometers: 1,
    baseline: {
      annual_extractable_resource_ham: 1950.0,
      total_extraction_ham: 1550.25,
      stage_percent: 79.5,
      category: "Semi Critical",
    },
    observations: [10.1],
  },
  {
    zone_id: "tiruppur_perumanallur",
    name: "PERUMANALLUR",
    taluk: "Avinashi",
    cx: 77.35,
    cy: 11.185,
    assessment_year: 2024,
    num_piezometers: 1,
    baseline: {
      annual_extractable_resource_ham: 2100.0,
      total_extraction_ham: 1969.8,
      stage_percent: 93.8,
      category: "Critical",
    },
    observations: [12.6],
  },

  // 4. Uthukuli Taluk
  {
    zone_id: "tiruppur_uthukkuli",
    name: "UTHUKKULI",
    taluk: "Uthukuli",
    cx: 77.42,
    cy: 11.175,
    assessment_year: 2024,
    num_piezometers: 2,
    baseline: {
      annual_extractable_resource_ham: 2800.0,
      total_extraction_ham: 2576.0,
      stage_percent: 92.0,
      category: "Critical",
    },
    observations: [12.3, 12.8],
  },
  {
    zone_id: "tiruppur_kunnuthur",
    name: "KUNNUTHUR",
    taluk: "Uthukuli",
    cx: 77.38,
    cy: 11.245,
    assessment_year: 2024,
    num_piezometers: 1,
    baseline: {
      annual_extractable_resource_ham: 1750.0,
      total_extraction_ham: 1422.75,
      stage_percent: 81.3,
      category: "Semi Critical",
    },
    observations: [10.8],
  },

  // 5. Palladam Taluk
  {
    zone_id: "tiruppur_palladam",
    name: "PALLADAM",
    taluk: "Palladam",
    cx: 77.28,
    cy: 11.02,
    assessment_year: 2024,
    num_piezometers: 3,
    baseline: {
      annual_extractable_resource_ham: 3400.0,
      total_extraction_ham: 4012.0,
      stage_percent: 118.0,
      category: "Over Exploited",
    },
    observations: [16.4, 15.9, null],
  },
  {
    zone_id: "tiruppur_samalapuram",
    name: "SAMALAPURAM",
    taluk: "Palladam",
    cx: 77.245,
    cy: 11.075,
    assessment_year: 2024,
    num_piezometers: 2,
    baseline: {
      annual_extractable_resource_ham: 1900.0,
      total_extraction_ham: 1485.8,
      stage_percent: 78.2,
      category: "Semi Critical",
    },
    observations: [10.5, null],
  },
  {
    zone_id: "tiruppur_karadivavi",
    name: "KARADIVAVI",
    taluk: "Palladam",
    cx: 77.2,
    cy: 10.99,
    assessment_year: 2024,
    num_piezometers: 1,
    baseline: {
      annual_extractable_resource_ham: 2250.0,
      total_extraction_ham: 2326.5,
      stage_percent: 103.4,
      category: "Over Exploited",
    },
    observations: [14.8],
  },
  {
    zone_id: "tiruppur_pongalore",
    name: "PONGALORE",
    taluk: "Palladam",
    cx: 77.36,
    cy: 11.01,
    assessment_year: 2024,
    num_piezometers: 2,
    baseline: {
      annual_extractable_resource_ham: 2600.0,
      total_extraction_ham: 2366.0,
      stage_percent: 91.0,
      category: "Critical",
    },
    observations: [12.1, 12.7],
  },

  // 6. Kangeyam Taluk
  {
    zone_id: "tiruppur_kangeyam",
    name: "KANGEYAM",
    taluk: "Kangeyam",
    cx: 77.55,
    cy: 11.025,
    assessment_year: 2024,
    num_piezometers: 2,
    baseline: {
      annual_extractable_resource_ham: 4200.0,
      total_extraction_ham: 2709.0,
      stage_percent: 64.5,
      category: "Safe",
    },
    observations: [8.4, 9.1],
  },
  {
    zone_id: "tiruppur_nathakadayur",
    name: "NATHAKADAYUR",
    taluk: "Kangeyam",
    cx: 77.6,
    cy: 11.115,
    assessment_year: 2024,
    num_piezometers: 1,
    baseline: {
      annual_extractable_resource_ham: 2850.0,
      total_extraction_ham: 1744.2,
      stage_percent: 61.2,
      category: "Safe",
    },
    observations: [8.0],
  },
  {
    zone_id: "tiruppur_uhiyur",
    name: "UHIYUR",
    taluk: "Kangeyam",
    cx: 77.47,
    cy: 11.03,
    assessment_year: 2024,
    num_piezometers: 1,
    baseline: {
      annual_extractable_resource_ham: 2150.0,
      total_extraction_ham: 1565.2,
      stage_percent: 72.8,
      category: "Semi Critical",
    },
    observations: [9.5],
  },
  {
    zone_id: "tiruppur_vellakoil",
    name: "VELLAKOIL",
    taluk: "Kangeyam",
    cx: 77.66,
    cy: 10.97,
    assessment_year: 2024,
    num_piezometers: 2,
    baseline: {
      annual_extractable_resource_ham: 3900.0,
      total_extraction_ham: 2613.0,
      stage_percent: 67.0,
      category: "Safe",
    },
    observations: [8.7, 9.3],
  },
  {
    zone_id: "tiruppur_sangarandampalayam",
    name: "SANGARANDAMPALAYAM",
    taluk: "Kangeyam",
    cx: 77.67,
    cy: 10.89,
    assessment_year: 2024,
    num_piezometers: 1,
    baseline: {
      annual_extractable_resource_ham: 2400.0,
      total_extraction_ham: 1401.6,
      stage_percent: 58.4,
      category: "Safe",
    },
    observations: [7.8],
  },

  // 7. Dharapuram Taluk
  {
    zone_id: "tiruppur_dharapuram",
    name: "DHARAPURAM",
    taluk: "Dharapuram",
    cx: 77.53,
    cy: 10.725,
    assessment_year: 2024,
    num_piezometers: 3,
    baseline: {
      annual_extractable_resource_ham: 3750.0,
      total_extraction_ham: 2868.75,
      stage_percent: 76.5,
      category: "Semi Critical",
    },
    observations: [10.2, 9.8, 10.5],
  },
  {
    zone_id: "tiruppur_alangiyam_dup",
    name: "ALANGIYAM-DUP",
    taluk: "Dharapuram",
    cx: 77.495,
    cy: 10.645,
    assessment_year: 2024,
    num_piezometers: 1,
    baseline: {
      annual_extractable_resource_ham: 2420.12,
      total_extraction_ham: 1467.65,
      stage_percent: 60.6,
      category: "Safe",
    },
    observations: [8.1, 8.4, 7.9, 8.2, null],
  },
  {
    zone_id: "tiruppur_kannivadi",
    name: "KANNIVADI",
    taluk: "Dharapuram",
    cx: 77.425,
    cy: 10.695,
    assessment_year: 2024,
    num_piezometers: 1,
    baseline: {
      annual_extractable_resource_ham: 2900.0,
      total_extraction_ham: 1734.2,
      stage_percent: 59.8,
      category: "Safe",
    },
    observations: [7.9],
  },
  {
    zone_id: "tiruppur_kundadam",
    name: "KUNDADAM",
    taluk: "Dharapuram",
    cx: 77.48,
    cy: 10.815,
    assessment_year: 2024,
    num_piezometers: 2,
    baseline: {
      annual_extractable_resource_ham: 3100.0,
      total_extraction_ham: 2554.4,
      stage_percent: 82.4,
      category: "Semi Critical",
    },
    observations: [11.0, 11.5],
  },
  {
    zone_id: "tiruppur_moolanur",
    name: "MOOLANUR",
    taluk: "Dharapuram",
    cx: 77.66,
    cy: 10.75,
    assessment_year: 2024,
    num_piezometers: 2,
    baseline: {
      annual_extractable_resource_ham: 3300.0,
      total_extraction_ham: 2184.6,
      stage_percent: 66.2,
      category: "Safe",
    },
    observations: [8.6, 9.0],
  },
  {
    zone_id: "tiruppur_ponnapuram",
    name: "PONNAPURAM",
    taluk: "Dharapuram",
    cx: 77.59,
    cy: 10.815,
    assessment_year: 2024,
    num_piezometers: 1,
    baseline: {
      annual_extractable_resource_ham: 2500.0,
      total_extraction_ham: 1597.5,
      stage_percent: 63.9,
      category: "Safe",
    },
    observations: [8.3],
  },

  // 8. Udumalaipettai Taluk
  {
    zone_id: "tiruppur_udumalaipettai",
    name: "UDUMALAIPETTAI",
    taluk: "Udumalaipettai",
    cx: 77.25,
    cy: 10.575,
    assessment_year: 2024,
    num_piezometers: 3,
    baseline: {
      annual_extractable_resource_ham: 4100.0,
      total_extraction_ham: 4419.8,
      stage_percent: 107.8,
      category: "Over Exploited",
    },
    observations: [15.2, 14.9, null],
  },
  {
    zone_id: "tiruppur_gudimangalam",
    name: "GUDIMANGALAM",
    taluk: "Udumalaipettai",
    cx: 77.33,
    cy: 10.675,
    assessment_year: 2024,
    num_piezometers: 2,
    baseline: {
      annual_extractable_resource_ham: 3200.0,
      total_extraction_ham: 3059.2,
      stage_percent: 95.6,
      category: "Critical",
    },
    observations: [13.1, 13.6],
  },
  {
    zone_id: "tiruppur_kurichikottai",
    name: "KURICHIKOTTAI",
    taluk: "Udumalaipettai",
    cx: 77.17,
    cy: 10.545,
    assessment_year: 2024,
    num_piezometers: 1,
    baseline: {
      annual_extractable_resource_ham: 2700.0,
      total_extraction_ham: 1844.1,
      stage_percent: 68.3,
      category: "Safe",
    },
    observations: [8.9],
  },
  {
    zone_id: "tiruppur_peddappampatti",
    name: "PEDDAPPAMPATTI",
    taluk: "Udumalaipettai",
    cx: 77.26,
    cy: 10.66,
    assessment_year: 2024,
    num_piezometers: 1,
    baseline: {
      annual_extractable_resource_ham: 2600.0,
      total_extraction_ham: 2210.0,
      stage_percent: 85.0,
      category: "Semi Critical",
    },
    observations: [11.3],
  },
  {
    zone_id: "tiruppur_periavalavadi",
    name: "PERIAVALAVADI",
    taluk: "Udumalaipettai",
    cx: 77.39,
    cy: 10.49,
    assessment_year: 2024,
    num_piezometers: 1,
    baseline: {
      annual_extractable_resource_ham: 2350.0,
      total_extraction_ham: 1504.0,
      stage_percent: 64.0,
      category: "Safe",
    },
    observations: [8.4],
  },

  // 9. Madathukulam Taluk
  {
    zone_id: "tiruppur_madathukulam",
    name: "MADATHUKULAM",
    taluk: "Madathukulam",
    cx: 77.35,
    cy: 10.565,
    assessment_year: 2024,
    num_piezometers: 2,
    baseline: {
      annual_extractable_resource_ham: 3000.0,
      total_extraction_ham: 2226.0,
      stage_percent: 74.2,
      category: "Semi Critical",
    },
    observations: [9.8, 10.3],
  },
  {
    zone_id: "tiruppur_thungavi",
    name: "THUNGAVI",
    taluk: "Madathukulam",
    cx: 77.44,
    cy: 10.57,
    assessment_year: 2024,
    num_piezometers: 1,
    baseline: {
      annual_extractable_resource_ham: 2450.0,
      total_extraction_ham: 1609.65,
      stage_percent: 65.7,
      category: "Safe",
    },
    observations: [8.7],
  },
];

export function computeGroundwaterRiskCategory(stagePercent: number): GroundwaterRisk {
  if (stagePercent >= 100) return "Over Exploited";
  if (stagePercent >= 90) return "Critical";
  if (stagePercent >= 70) return "Semi Critical";
  return "Safe";
}

export function getGroundwaterRiskColors(category: GroundwaterRisk | string) {
  switch (category) {
    case "Over Exploited":
      return {
        bg: "rgba(220, 38, 38, 0.12)",
        color: "#dc2626",
        border: "rgba(220, 38, 38, 0.28)",
        dot: "#dc2626",
        label: "Over Exploited (>100% extraction)",
      };
    case "Critical":
      return {
        bg: "rgba(234, 88, 12, 0.12)",
        color: "#ea580c",
        border: "rgba(234, 88, 12, 0.28)",
        dot: "#ea580c",
        label: "Critical (90% – 100% extraction)",
      };
    case "Semi Critical":
      return {
        bg: "rgba(202, 138, 4, 0.12)",
        color: "#ca8a04",
        border: "rgba(202, 138, 4, 0.28)",
        dot: "#ca8a04",
        label: "Semi Critical (70% – 90% extraction)",
      };
    case "Safe":
    default:
      return {
        bg: "rgba(16, 185, 129, 0.12)",
        color: "#10b981",
        border: "rgba(16, 185, 129, 0.28)",
        dot: "#10b981",
        label: "Safe (<70% extraction)",
      };
  }
}

export function getFallbackGroundwaterZones(): GroundwaterZone[] {
  return CGWB_TIRUPPUR_FIRKAS.map((firka) => ({
    zone_id: firka.zone_id,
    name: firka.name,
    assessment_year: firka.assessment_year,
    num_piezometers: firka.num_piezometers,
  }));
}

export function getFallbackGroundwaterAssessment(
  zoneId: string,
  multiplier = 1.0,
): GroundwaterAssessment {
  const firka =
    CGWB_TIRUPPUR_FIRKAS.find((f) => f.zone_id === zoneId) ||
    CGWB_TIRUPPUR_FIRKAS[2]; // tiruppur_south default

  const estimatedExtraction = Number(
    (firka.baseline.total_extraction_ham * multiplier).toFixed(2),
  );
  const estimatedStage = Number(
    (
      (estimatedExtraction / firka.baseline.annual_extractable_resource_ham) *
      100
    ).toFixed(1),
  );
  const simulatedRisk = computeGroundwaterRiskCategory(estimatedStage);

  const validObs = firka.observations.filter((o) => o !== null).length;
  const totalObs = firka.observations.length;
  const confidence = Number((validObs / (totalObs || 1)).toFixed(2));

  const simulation: GroundwaterSimulation = {
    status: "assessed",
    estimated_extraction_ham: estimatedExtraction,
    resource_ham: firka.baseline.annual_extractable_resource_ham,
    estimated_stage_percent: estimatedStage,
    confidence: confidence,
    risk: simulatedRisk,
    observations: firka.observations,
    valid_observations: validObs,
    total_observations: totalObs,
  };

  return {
    zone_id: firka.zone_id,
    name: firka.name,
    assessment_year: firka.assessment_year,
    num_piezometers: firka.num_piezometers,
    cgwb_baseline: firka.baseline,
    simulation,
  };
}
