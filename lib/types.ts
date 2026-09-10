// ---------------------------------------------------------------------------
// CONTRACT SHAPE — what the dashboard and Vamika's ledger were designed
// around (see contracts/inference_event_contract.md and the project brief).
// This is the shape every part of the UI renders against. Anything coming
// from Haripriya's real API gets translated into this shape by lib/adapter.ts
// before it ever reaches a component.
// ---------------------------------------------------------------------------

export type Decision = "investigate" | "abstain" | "normal";

export interface TopCandidate {
  unit_id: string;
  probability: number;
}

export interface ContractEvent {
  event_id: string;
  timestamp: string;
  status: "flagged" | "normal";
  decision: Decision;
  most_likely_source: string | null;
  source_probability: number | null;
  top_candidates: TopCandidate[];
  estimated_release_severity: "low" | "medium" | "high" | null;
  confidence: number;
  evidence_sufficiency: "adequate" | "insufficient";
  sensor_conditions: {
    missing_sensor_count: number;
    drift_detected: boolean;
  };
  explanation: string;
  model_version: string;
  source: "ledger" | "adapter";
}

// ---------------------------------------------------------------------------
// VAMIKA'S LEDGER — matches what's actually implemented in
// smart-tiruppur/ledger/app. Field names below were read directly out of
// ledger/app/schemas.py, routers/units.py, routers/ledger.py, routers/verify.py.
// ---------------------------------------------------------------------------

export interface LedgerUnit {
  unit_id: string; // "unit_001".."unit_012"
  name: string;
  cetp_zld_status: string;
  reuse_percentage: number;
  renewable_energy_percentage: number;
  compliance_status: string;
  certifications: string[];
}

export interface LedgerEntry {
  event_id: string;
  timestamp: string;
  unit_id: string;
  decision: string;
  confidence: number;
  model_version: string;
  regulator_action: string | null;
  previous_hash: string;
  current_hash: string;
}

export interface UnitLedgerResponse {
  unit_id: string;
  entries: LedgerEntry[];
  chain_valid: boolean;
}

export interface DppResponse {
  unit_id: string;
  unit_profile: LedgerUnit;
  compliance_summary: string;
  reuse_and_energy: {
    reuse_percentage: number;
    renewable_energy_percentage: number;
  };
  recent_environmental_evidence: {
    status: string;
    last_event_id: string | null;
    confidence: number | null;
  };
  issue_date: string;
  verification_id: string;
  qr_url: string;
}

/** The raw DPP shape returned by the ledger service. */
export interface LedgerDppResponse {
  unit: LedgerUnit;
  compliance_summary: {
    cetp_zld_status: string;
    compliance_status: string;
    certifications: string[];
  };
  environmental_evidence: {
    status: string;
    latest_confidence: number | null;
  };
  issue_date: string;
  verification_id: string;
  qr_url: string;
}

export interface VerifyResponse {
  verification_id: string;
  unit_id: string;
  valid: boolean;
  issue_date: string;
  compliance_status: string;
}

// ---------------------------------------------------------------------------
// HARIPRIYA'S RAW API — matches what's actually implemented in
// noyyalsense-main/api/main.py + inference/attribution.py. NOT the contract
// shape — this is the real POST /infer and POST /simulate_event response.
// Unit ids here are "U001".."U012", not "unit_001".."unit_012".
// ---------------------------------------------------------------------------

export interface HariPosteriorEntry {
  unit: string; // "U007"
  probability: number;
}

export interface HariDecision {
  decision: "INVESTIGATE" | "ABSTAIN";
  unit?: string; // present when decision is INVESTIGATE
  confidence?: number;
  reason?: string; // present when decision is ABSTAIN
}

export interface HariSensorHealth {
  missing_count: number;
  drift_detected: boolean;
  [sensorId: string]: unknown;
}

export interface HariSimulateEventResponse {
  event_id: string;
  // The inference service has returned both an array and a unit-to-score map.
  posterior_top3: HariPosteriorEntry[] | Record<string, number>;
  decision: HariDecision;
  sensor_health: HariSensorHealth;
}
