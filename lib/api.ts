import { LEDGER_BASE_URL, INFERENCE_BASE_URL } from "./config";
import { adaptHariEvent, mapLedgerEntryToContractEvent } from "./adapter";
import type {
  ContractEvent,
  DppResponse,
  HariSimulateEventResponse,
  LedgerDppResponse,
  LedgerEntry,
  LedgerUnit,
  UnitLedgerResponse,
  VerifyResponse,
} from "./types";

export interface FetchResult<T> {
  data: T | null;
  stale: boolean;
  error: string | null;
  fetchedAt: string | null;
}

const CACHE_PREFIX = "noyyalsense_cache_";

function readCache<T>(key: string): { data: T; fetchedAt: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ data, fetchedAt: new Date().toISOString() }),
    );
  } catch {
    // localStorage full or unavailable — degrade silently, live data still works
  }
}

/**
 * Fetch JSON with a cache-backed fallback. If the request fails (service
 * down, network error, non-2xx), falls back to the last successful response
 * for this key and marks the result `stale: true` so the UI can show a
 * "last-known data" banner instead of crashing — per the integration
 * requirement that one service being down shouldn't take out the dashboard.
 */
async function fetchWithFallback<T>(
  key: string,
  url: string,
  init?: RequestInit,
): Promise<FetchResult<T>> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as T;
    writeCache(key, data);
    return {
      data,
      stale: false,
      error: null,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    const cached = readCache<T>(key);
    if (cached) {
      return {
        data: cached.data,
        stale: true,
        error: err instanceof Error ? err.message : "Request failed",
        fetchedAt: cached.fetchedAt,
      };
    }
    return {
      data: null,
      stale: false,
      error: err instanceof Error ? err.message : "Request failed",
      fetchedAt: null,
    };
  }
}

// ---------------------------------------------------------------------------
// Vamika's ledger service
// ---------------------------------------------------------------------------

export function getUnits() {
  return fetchWithFallback<LedgerUnit[]>("units", `${LEDGER_BASE_URL}/units`);
}

export function getUnit(unitId: string) {
  return fetchWithFallback<LedgerUnit>(
    `unit_${unitId}`,
    `${LEDGER_BASE_URL}/units/${unitId}`,
  );
}

export function getUnitDpp(unitId: string) {
  return fetchWithFallback<LedgerDppResponse>(
    `dpp_${unitId}`,
    `${LEDGER_BASE_URL}/units/${unitId}/dpp`,
  ).then((result): FetchResult<DppResponse> => ({
    ...result,
    data: result.data ? adaptLedgerDpp(result.data) : null,
  }));
}

/** Translate the ledger's DPP payload into the shape rendered by the UI. */
function adaptLedgerDpp(raw: LedgerDppResponse): DppResponse {
  const { unit, compliance_summary: summary, environmental_evidence: evidence } = raw;
  return {
    unit_id: unit.unit_id,
    unit_profile: unit,
    compliance_summary: `${summary.cetp_zld_status}; ${summary.compliance_status.replace(/_/g, " ")}.`,
    reuse_and_energy: {
      reuse_percentage: unit.reuse_percentage,
      renewable_energy_percentage: unit.renewable_energy_percentage,
    },
    recent_environmental_evidence: {
      status: evidence.status,
      last_event_id: null,
      confidence: evidence.latest_confidence,
    },
    issue_date: raw.issue_date,
    verification_id: raw.verification_id,
    qr_url: raw.qr_url,
  };
}

export function getUnitLedger(unitId: string) {
  return fetchWithFallback<UnitLedgerResponse>(
    `ledger_${unitId}`,
    `${LEDGER_BASE_URL}/units/${unitId}/ledger`,
  );
}

export async function getGlobalEvents(): Promise<FetchResult<ContractEvent[]>> {
  // Vamika's GET /ledger/events returns her stored LedgerEntry[] shape, not
  // the full ContractEvent shape — map each entry through the adapter so
  // every field the UI expects is always present, even if her stored
  // record doesn't carry it (see mapLedgerEntryToContractEvent).
  const res = await fetchWithFallback<LedgerEntry[]>(
    "global_events",
    `${LEDGER_BASE_URL}/ledger/events`,
  );
  return {
    data: res.data ? res.data.map(mapLedgerEntryToContractEvent) : null,
    stale: res.stale,
    error: res.error,
    fetchedAt: res.fetchedAt,
  };
}

export function getVerify(verificationId: string) {
  return fetchWithFallback<VerifyResponse>(
    `verify_${verificationId}`,
    `${LEDGER_BASE_URL}/verify/${verificationId}`,
  );
}

export function postEventToLedger(event: ContractEvent) {
  return fetchWithFallback<{ ok: boolean }>(
    `post_event_${event.event_id}`,
    `${LEDGER_BASE_URL}/ledger/events`,
    { method: "POST", body: JSON.stringify(event) },
  );
}

// ---------------------------------------------------------------------------
// Haripriya's inference service — raw responses always go through the
// adapter before anything else in the app sees them.
// ---------------------------------------------------------------------------

export async function simulateInferenceEvent(): Promise<
  FetchResult<ContractEvent>
> {
  const raw = await fetchWithFallback<HariSimulateEventResponse>(
    "last_simulated_raw",
    `${INFERENCE_BASE_URL}/simulate_event`,
    // The inference API declares its request body as required, even though
    // every field has a default. An empty JSON object satisfies that contract.
    { method: "POST", body: JSON.stringify({}) },
  );
  if (!raw.data) {
    return {
      data: null,
      stale: raw.stale,
      error: raw.error,
      fetchedAt: raw.fetchedAt,
    };
  }
  const adapted = adaptHariEvent(raw.data);
  return {
    data: adapted,
    stale: raw.stale,
    error: raw.error,
    fetchedAt: raw.fetchedAt,
  };
}

export async function inferForUnit(
  hariUnitId: string,
): Promise<FetchResult<ContractEvent>> {
  const raw = await fetchWithFallback<HariSimulateEventResponse>(
    `last_infer_${hariUnitId}`,
    `${INFERENCE_BASE_URL}/infer`,
    { method: "POST", body: JSON.stringify({ source_unit: hariUnitId }) },
  );
  if (!raw.data) {
    return {
      data: null,
      stale: raw.stale,
      error: raw.error,
      fetchedAt: raw.fetchedAt,
    };
  }
  const adapted = adaptHariEvent(raw.data);
  return {
    data: adapted,
    stale: raw.stale,
    error: raw.error,
    fetchedAt: raw.fetchedAt,
  };
}
