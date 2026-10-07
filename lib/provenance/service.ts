import { DataProvenance } from "./types";

/** Provenance displayed by the Digital Twin: repository-backed inputs only. */
export function getObjectProvenance(objectId: string, objectType = "node"): DataProvenance {
  const base = { provenanceId: `prov_${objectId}`, targetObjectId: objectId, timestamp: new Date().toISOString(), spatialLocation: "Tiruppur Digital Twin study area" };

  if (objectType === "steri_risk" || objectId.startsWith("steri_")) return { ...base, targetObjectName: "STERI spatial risk assessment", source: "Existing STERI component engines and scenario inputs", sourceType: "MODELLED", dataStatus: "MODELLED", processingStatus: "DERIVED_CALCULATION", modelVersion: "STERI-MultiSource-v1.4" };
  if (objectType === "building" || objectType === "road" || objectType === "hydrology") return { ...base, targetObjectName: `GIS feature (${objectId})`, source: "Existing Digital Twin GIS geometry", sourceType: "OPEN_DATA", dataStatus: "OPEN_DATA", processingStatus: "SOURCE_METADATA" };
  if (objectType === "terrain" || objectType === "groundwater") return { ...base, targetObjectName: `Modelled context (${objectId})`, source: "Existing procedural terrain and category-mapping inputs", sourceType: "MODELLED", dataStatus: "MODELLED", processingStatus: "SIMULATION_MODEL" };
  return { ...base, targetObjectName: `Digital Twin object (${objectId})`, source: "Existing synthetic demonstration inputs", sourceType: "SIMULATED", dataStatus: "SIMULATED", processingStatus: "SIMULATION_MODEL" };
}
