// ---------------------------------------------------------------------------
// EXPLAINABLE AI LAYER (XAI) — DOMAIN TYPES & SCHEMAS
// Standardized reusable explanation shape for risk, attribution & predictions.
// ---------------------------------------------------------------------------

export type FeatureDirection = "positive" | "negative";

export type ExplanationType = "SHAP_AI_MODEL" | "DETERMINISTIC_RISK_FACTOR";

export interface FeatureContribution {
  feature: string;                 // Human-readable feature name (e.g., "Pollution Anomaly")
  contribution: number;            // Numeric raw contribution (e.g. +0.34)
  direction: FeatureDirection;     // "positive" increases risk, "negative" reduces risk
  value: number | string;         // Observed value (e.g., "3,450 µS/cm", "112% Draft", "Active U007")
  normalizedContribution: number;  // Relative percentage 0–100% (e.g. 34)
}

export interface ExplanationResult {
  id: string;
  targetName: string;              // e.g., "Kasipalayam Noyyal Exit Sector"
  targetType:
    | "pollution"
    | "water_quality"
    | "flood"
    | "groundwater"
    | "industrial_attribution"
    | "steri_risk"
    | "prediction";
  explanationType: ExplanationType;
  explanationTitle: string;        // e.g. "Risk Factor Contribution Breakdown" or "SHAP Feature Value Impact"
  overallScore: number;            // 0.00 to 1.00
  overallCategory: string;         // e.g., "CRITICAL", "HIGH", "INVESTIGATE"
  
  // Reusable array of contributions
  contributions: FeatureContribution[];
  
  // Mandatory Provenance Metadata
  calculationVersion: string;     // e.g. "STERI-XAI v1.2" or "NoyyalSense-Attribution-SHAP v2.1"
  timestamp: string;
  inputDataSources: string[];      // e.g. ["Hardware EC/pH Telemetry", "CGWB Piezometer Logs"]
  confidence: number;             // 0.00 to 1.00
  uncertaintyMargin?: number;     // e.g. ±0.04
}
