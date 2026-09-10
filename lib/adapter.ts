// ---------------------------------------------------------------------------
// ADAPTER LAYER
//
// Haripriya's inference service was built against a different shape than
// the shared contract (see contracts/inference_event_contract.md). Rather
// than block on her changing the API, this file is the single place that
// translates her real output into the ContractEvent shape everything else
// in the dashboard renders against.
//
// If she ever updates her API to match the contract exactly, this file is
// the only thing that should need to shrink or go away.
// ---------------------------------------------------------------------------

import type {
  ContractEvent,
  Decision,
  HariSimulateEventResponse,
  LedgerEntry,
  TopCandidate,
} from "./types";

export function toLedgerUnitId(hariUnitId: string): string {
  const match = hariUnitId.match(/^U0*(\d+)$/i);
  if (match) {
    const num = match[1].padStart(3, "0");
    return `unit_${num}`;
  }
  return hariUnitId;
}

export function toHariUnitId(ledgerUnitId: string): string {
  const match = ledgerUnitId.match(/^unit_0*(\d+)$/i);
  if (match) {
    const num = match[1].padStart(3, "0");
    return `U${num}`;
  }
  return ledgerUnitId;
}

function normalizeDecision(raw: "INVESTIGATE" | "ABSTAIN"): Decision {
  return raw === "INVESTIGATE" ? "investigate" : "abstain";
}

function estimateSeverity(
  confidence: number | undefined,
  decision: Decision,
): ContractEvent["estimated_release_severity"] {
  if (decision !== "investigate" || confidence == null) return null;
  if (confidence >= 0.75) return "high";
  if (confidence >= 0.55) return "medium";
  return "low";
}

function buildExplanation(
  raw: HariSimulateEventResponse,
  decision: Decision,
  topUnitLedgerId: string | null,
  topProbability: number | null,
): string {
  if (decision === "investigate" && topUnitLedgerId) {
    const pct = topProbability != null ? Math.round(topProbability * 100) : null;
    return pct != null
      ? `Sensor pattern is most consistent with a release from ${topUnitLedgerId} (${pct}% posterior probability).`
      : `Sensor pattern is most consistent with a release from ${topUnitLedgerId}.`;
  }
  if (raw.decision.reason) return raw.decision.reason;
  return "Evidence across candidate sources was too close to make a defensible attribution.";
}

export function adaptHariEvent(raw: HariSimulateEventResponse): ContractEvent {
  const decision = normalizeDecision(raw.decision.decision);
  const posterior = Array.isArray(raw.posterior_top3)
    ? raw.posterior_top3
    : Object.entries(raw.posterior_top3).map(([unit, probability]) => ({
        unit,
        probability,
      }));
  const topCandidates: TopCandidate[] = posterior.map((c) => ({
    unit_id: toLedgerUnitId(c.unit),
    probability: c.probability,
  }));

  const mostLikelySource =
    decision === "investigate" && raw.decision.unit
      ? toLedgerUnitId(raw.decision.unit)
      : (topCandidates[0]?.unit_id ?? null);

  const confidence =
    raw.decision.confidence ?? topCandidates[0]?.probability ?? 0;

  const missingCount = raw.sensor_health?.missing_count ?? 0;
  const driftDetected = raw.sensor_health?.drift_detected ?? false;

  const gap =
    topCandidates.length >= 2
      ? topCandidates[0].probability - topCandidates[1].probability
      : 1;
  const evidenceSufficiency: ContractEvent["evidence_sufficiency"] =
    decision === "abstain" ||
    confidence < 0.55 ||
    gap < 0.15 ||
    missingCount > 1
      ? "insufficient"
      : "adequate";

  return {
    event_id: raw.event_id,
    timestamp: new Date().toISOString(),
    status: decision === "investigate" ? "flagged" : "normal",
    decision,
    most_likely_source: mostLikelySource,
    source_probability:
      decision === "investigate"
        ? confidence
        : (topCandidates[0]?.probability ?? null),
    top_candidates: topCandidates,
    estimated_release_severity: estimateSeverity(confidence, decision),
    confidence,
    evidence_sufficiency: evidenceSufficiency,
    sensor_conditions: {
      missing_sensor_count: missingCount,
      drift_detected: driftDetected,
    },
    explanation: buildExplanation(
      raw,
      decision,
      mostLikelySource,
      topCandidates[0]?.probability ?? null,
    ),
    model_version: "haripriya-inference-v1 (adapted)",
    source: "adapter",
    regulator_action: null,
  };
}

export function mapLedgerEntryToContractEvent(
  entry: LedgerEntry,
): ContractEvent {
  const decision = (entry.decision?.toLowerCase() as Decision) || "abstain";
  return {
    event_id: entry.event_id,
    timestamp: entry.timestamp,
    status: decision === "investigate" ? "flagged" : "normal",
    decision,
    most_likely_source: decision === "investigate" ? entry.unit_id : null,
    source_probability: decision === "investigate" ? entry.confidence : null,
    top_candidates: [],
    estimated_release_severity: null,
    confidence: entry.confidence ?? 0,
    evidence_sufficiency: decision === "abstain" ? "insufficient" : "adequate",
    sensor_conditions: {
      missing_sensor_count: 0,
      drift_detected: false,
    },
    explanation:
      decision === "investigate"
        ? `Recorded event for ${entry.unit_id}.`
        : "Recorded as abstain — insufficient evidence.",
    model_version: entry.model_version,
    source: "ledger",
    regulator_action: entry.regulator_action,
  };
}
