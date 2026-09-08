"use client";

import { useEffect, useState } from "react";
import {
  getGlobalEvents,
  getUnits,
  postEventToLedger,
  simulateInferenceEvent,
} from "@/lib/api";
import type { ContractEvent, LedgerUnit } from "@/lib/types";
import UnitCard from "@/components/UnitCard";
import AlertFeed from "@/components/AlertFeed";
import StaleBanner, { ErrorBanner } from "@/components/StaleBanner";

export default function RegulatorDashboard() {
  const [units, setUnits] = useState<LedgerUnit[]>([]);
  const [unitsStale, setUnitsStale] = useState<{ stale: boolean; fetchedAt: string | null; error: string | null }>({
    stale: false,
    fetchedAt: null,
    error: null,
  });

  const [events, setEvents] = useState<ContractEvent[]>([]);
  const [eventsStale, setEventsStale] = useState<{ stale: boolean; fetchedAt: string | null; error: string | null }>({
    stale: false,
    fetchedAt: null,
    error: null,
  });

  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ContractEvent | null>(null);

  async function loadUnits() {
    const res = await getUnits();
    if (res.data) setUnits(res.data);
    setUnitsStale({ stale: res.stale, fetchedAt: res.fetchedAt, error: res.error });
  }

  async function loadEvents() {
    const res = await getGlobalEvents();
    if (res.data) {
      setEvents([...res.data].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)));
    }
    setEventsStale({ stale: res.stale, fetchedAt: res.fetchedAt, error: res.error });
  }

  useEffect(() => {
    loadUnits();
    loadEvents();
  }, []);

  async function handleSimulate() {
    setRunning(true);
    setRunError(null);
    setLastResult(null);
    try {
      const inferRes = await simulateInferenceEvent();
      if (!inferRes.data) {
        setRunError(inferRes.error || "Inference service returned no data.");
        return;
      }
      setLastResult(inferRes.data);
      const pushRes = await postEventToLedger(inferRes.data);
      if (pushRes.error && !pushRes.data) {
        setRunError(
          `Inference succeeded but writing to the ledger failed: ${pushRes.error}`
        );
      }
      await loadEvents();
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 24 }}>Regulator dashboard</h2>
          <p className="muted small" style={{ marginTop: 4 }}>
            Live discharge events, source attribution and evidence status across all 12 units.
          </p>
        </div>
        <button className="btn" onClick={handleSimulate} disabled={running}>
          {running ? "Running inference…" : "Run simulated discharge event"}
        </button>
      </div>

      {runError && <ErrorBanner message={runError} />}
      {lastResult && (
        <div className="card" style={{ marginBottom: 18, borderColor: "var(--indigo)" }}>
          <p className="small muted" style={{ margin: "0 0 6px" }}>
            Latest simulated event ({lastResult.event_id})
          </p>
          <p style={{ margin: 0 }}>{lastResult.explanation}</p>
        </div>
      )}

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, marginBottom: 10 }}>Units</h3>
        {unitsStale.stale && (
          <StaleBanner serviceName="Ledger service" fetchedAt={unitsStale.fetchedAt} error={unitsStale.error} />
        )}
        {units.length === 0 && !unitsStale.stale ? (
          <p className="muted small">
            {unitsStale.error ? unitsStale.error : "Loading units…"}
          </p>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
            {units.map((u) => (
              <UnitCard key={u.unit_id} unit={u} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 style={{ fontSize: 16, marginBottom: 10 }}>Event feed</h3>
        {eventsStale.stale && (
          <StaleBanner serviceName="Ledger service" fetchedAt={eventsStale.fetchedAt} error={eventsStale.error} />
        )}
        <AlertFeed events={events} />
      </section>
    </div>
  );
}
