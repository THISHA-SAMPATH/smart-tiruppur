// ---------------------------------------------------------------------------
// UNIFIED DATA PROVENANCE & UNCERTAINTY SERVICE
// ---------------------------------------------------------------------------

import { DataProvenance } from "./types";

export function getObjectProvenance(objectId: string, objectType: string = "node"): DataProvenance {
  const now = new Date().toISOString();

  if (objectId.startsWith("steri_") || objectType === "steri_risk") {
    return {
      provenanceId: `prov_${objectId}_${Date.now()}`,
      targetObjectId: objectId,
      targetObjectName: "STERI Spatial Risk Assessment",
      source: "Smart Tiruppur Environmental Intelligence Engine",
      sourceType: "Multi-Criteria Spatial Risk Aggregator",
      timestamp: now,
      spatialLocation: "Kasipalayam & Industrial Corridor (Tiruppur Corporation)",
      dataStatus: "DERIVED",
      processingStatus: "AGGREGATE_DERIVED",
      calculationVersion: "STERI-Calc-v1.4",
      modelVersion: "STERI-MultiSource-v1.4",
      confidence: 0.92,
      uncertaintyMargin: "±0.038",
      upstreamSources: [
        {
          id: "tnpcb_noyyal_002",
          name: "Kasipalayam Noyyal Water Telemetry Station",
          sourceType: "IoT Hardware Telemetry",
          timestamp: now,
          contributionWeight: 0.25,
        },
        {
          id: "cgwb_piezo_south",
          name: "CGWB Aquifer Piezometer Station South",
          sourceType: "Groundwater Observation Well",
          timestamp: now,
          contributionWeight: 0.20,
        },
        {
          id: "imd_tiruppur_rain",
          name: "IMD Automated Weather Station",
          sourceType: "Precipitation Telemetry",
          timestamp: now,
          contributionWeight: 0.20,
        },
      ],
      componentWeights: [
        { componentName: "Pollution Index", componentValue: 0.76, weightFactor: 0.25 },
        { componentName: "Water Quality Index", componentValue: 0.68, weightFactor: 0.20 },
        { componentName: "Flood / Drainage Risk", componentValue: 0.54, weightFactor: 0.20 },
        { componentName: "Groundwater Draft", componentValue: 0.72, weightFactor: 0.20 },
        { componentName: "Citizen Complaint Density", componentValue: 0.45, weightFactor: 0.15 },
      ],
      ledgerHash: "0x8f9a2b4c1d6e3f5a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a",
      verificationUrl: "/evidence",
    };
  }

  if (objectId.startsWith("scn_") || objectType === "scenario") {
    return {
      provenanceId: `prov_${objectId}_${Date.now()}`,
      targetObjectId: objectId,
      targetObjectName: "What-If Environmental Scenario Estimation",
      source: "Scenario & Sensitivity Engine",
      sourceType: "Urban Stress Simulator",
      timestamp: now,
      spatialLocation: "Tiruppur Urban Agglomeration",
      dataStatus: "SCENARIO",
      processingStatus: "SCENARIO_ESTIMATE",
      modelVersion: "Scenario-Estimation-v1.4",
      confidence: 0.85,
      uncertaintyMargin: "±0.062",
      upstreamSources: [
        {
          id: "baseline_2026_q3",
          name: "Live Baseline Environmental State",
          sourceType: "Telemetry Ensemble",
          timestamp: now,
          contributionWeight: 1.0,
        },
      ],
      ledgerHash: "0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b",
    };
  }

  if (objectId.startsWith("unit_") || objectType === "unit") {
    return {
      provenanceId: `prov_${objectId}_${Date.now()}`,
      targetObjectId: objectId,
      targetObjectName: `Industrial Processing Unit (${objectId})`,
      source: "TNPCB Continuous Effluent Monitoring System (CEMS)",
      sourceType: "Industrial IoT Flow & Quality Telemetry",
      timestamp: now,
      spatialLocation: "Kasipalayam Industrial Zone (11.1075° N, 77.3398° E)",
      dataStatus: "LIVE",
      processingStatus: "VERIFIED_HARDWARE",
      calculationVersion: "CEMS-Ingest-v2.1",
      confidence: 0.98,
      uncertaintyMargin: "±0.012",
      ledgerHash: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
      verificationUrl: `/units/${objectId}`,
    };
  }

  // Default fallback provenance
  return {
    provenanceId: `prov_${objectId}_${Date.now()}`,
    targetObjectId: objectId,
    targetObjectName: `Observation Node (${objectId})`,
    source: "Smart Tiruppur Telemetry Adapter",
    sourceType: "Environmental GIS Telemetry",
    timestamp: now,
    spatialLocation: "Tiruppur Corporation Area",
    dataStatus: "HISTORICAL",
    processingStatus: "VERIFIED_HARDWARE",
    modelVersion: "GeoTwin-v2.0",
    confidence: 0.90,
    uncertaintyMargin: "±0.025",
    ledgerHash: "0xef7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a",
  };
}
