// ---------------------------------------------------------------------------
// UNIFIED DATA PROVENANCE & UNCERTAINTY LAYER — DOMAIN TYPES
// Strictly enforces data status rules (LIVE | HISTORICAL | SIMULATED | DERIVED | SCENARIO)
// and full lineage tracking across environmental observations, predictions, risk scores.
// ---------------------------------------------------------------------------

export type DataStatus = "LIVE" | "HISTORICAL" | "SIMULATED" | "DERIVED" | "SCENARIO";

export interface UpstreamSource {
  id: string;
  name: string;
  sourceType: string;
  timestamp: string;
  contributionWeight?: number;
}

export interface ComponentWeightFactor {
  componentName: string;
  componentValue: number;
  weightFactor: number;
}

export interface DataProvenance {
  provenanceId: string;
  targetObjectId: string;
  targetObjectName: string;
  source: string;
  sourceType: string;
  timestamp: string;
  spatialLocation: string;
  dataStatus: DataStatus;
  processingStatus: "RAW_TELEMETRY" | "VERIFIED_HARDWARE" | "AGGREGATE_DERIVED" | "PHYSICS_INFERRED" | "SCENARIO_ESTIMATE";
  modelVersion?: string;
  calculationVersion?: string;
  confidence: number;             // 0.00 to 1.00
  uncertaintyMargin: string;      // e.g. "±0.04" or "±3.8%"
  upstreamSources?: UpstreamSource[];
  componentWeights?: ComponentWeightFactor[];
  ledgerHash?: string;
  verificationUrl?: string;
}
