// ---------------------------------------------------------------------------
// INDUSTRIAL WATER CIRCULARITY MODULE — DOMAIN TYPES & SCHEMAS
// Tailored specifically to Tiruppur's textile dyeing & CETP ZLD ecosystem.
// ---------------------------------------------------------------------------

export type TreatmentStatus = "OPERATIONAL" | "MAINTENANCE" | "DEGRADED";

export type ComplianceStatus = "ZLD COMPLIANT" | "UNDER INVESTIGATION" | "AUDIT PENDING";

export interface IndustrialWaterFacility {
  unit_id: string;               // "unit_001".."unit_012"
  name: string;                  // e.g. "Arulpuram CETP Dyeing Unit 001"
  facilityType: string;          // e.g. "Dyeing & Bleaching CETP Member"
  latitude: number;
  longitude: number;
  
  // Water Balance Metrics (in MLD - Million Liters per Day)
  freshwaterIntakeMld: number;
  processWaterReqMld: number;
  wastewaterGeneratedMld: number;
  treatmentCapacityMld: number;
  treatedWaterMld: number;
  waterReuseMld: number;
  dischargeMld: number;
  
  // Calculated Metrics
  reusePercentage: number;       // (Reused Water / Total Water Req) * 100
  circularityScore: number;      // 0 to 100
  renewableEnergyPct: number;    // % solar/wind powered
  
  // Status & Provenance
  treatmentStatus: TreatmentStatus;
  complianceStatus: ComplianceStatus;
  isPotentialSourceCandidate: boolean; // Marked if effluent anomaly correlates
  anomalyNotes?: string;
  isDemoData: boolean;
}

export interface CircularityCitySummary {
  totalFacilities: number;
  citywideFreshwaterMld: number;
  citywideReusedMld: number;
  citywideReuseRatePct: number;
  citywideCircularityScore: number;
  zldCompliantRatio: string;
  facilities: IndustrialWaterFacility[];
  timestamp: string;
  isDemoData: boolean;
}
