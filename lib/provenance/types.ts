// Digital Twin provenance uses the shared reviewer-facing vocabulary.
export type DataStatus = "OPEN_DATA" | "DERIVED" | "SIMULATED" | "MODELLED";

export interface DataProvenance {
  provenanceId: string;
  targetObjectId: string;
  targetObjectName: string;
  source: string;
  sourceType: DataStatus;
  timestamp: string;
  spatialLocation: string;
  dataStatus: DataStatus;
  processingStatus: "SOURCE_METADATA" | "DERIVED_CALCULATION" | "SIMULATION_MODEL";
  modelVersion?: string;
  calculationVersion?: string;
}
