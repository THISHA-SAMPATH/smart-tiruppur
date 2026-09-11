"use client";

import { useEffect, useState } from "react";
import { getSensorReadings, getUnits, postEventToLedger, simulateInferenceEvent } from "@/lib/api";
import type { ContractEvent, LedgerUnit, SensorReading } from "@/lib/types";
import SensorTrends from "@/components/SensorTrends";
import StaleBanner, { ErrorBanner } from "@/components/StaleBanner";
import UnitCard from "@/components/UnitCard";

export default function MonitoringWorkspace() {
  const [units, setUnits] = useState<LedgerUnit[]>([]);
  const [unitsMeta, setUnitsMeta] = useState({ stale: false, fetchedAt: null as string | null, error: null as string | null });
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ContractEvent | null>(null);
  const [sensor, setSensor] = useState("S_A");
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [readingsError, setReadingsError] = useState<string | null>(null);
  const [readingsLoading, setReadingsLoading] = useState(false);

  async function loadUnits() {
    const res = await getUnits();
    if (res.data) setUnits(res.data);
    setUnitsMeta({ stale: res.stale, fetchedAt: res.fetchedAt, error: res.error });
  }

  async function loadReadings(sensorId: string) {
    setReadingsLoading(true);
    setReadingsError(null);
    const res = await getSensorReadings(sensorId, 1);
    setReadings(res.data?.readings ?? []);
    if (!res.data) setReadingsError(res.error || "Could not load sensor readings.");
    setReadingsLoading(false);
  }

  useEffect(() => {
    void loadUnits();
  }, []);

  async function runInference() {
    setRunning(true);
    setRunError(null);
    setLastResult(null);
    try {
      const res = await simulateInferenceEvent();
      if (!res.data) {
        setRunError(res.error || "Inference service returned no data.");
        return;
      }
      setLastResult(res.data);
      await loadReadings(sensor);
      const ledger = await postEventToLedger(res.data);
      if (!ledger.data) setRunError(`Inference succeeded but ledger storage failed: ${ledger.error}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="workspace-page">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">OPERATIONS CENTRE / 01</p>
          <h1>Discharge monitoring</h1>
          <p>Inspect network context, simulate an incident and review the raw signals behind an attribution.</p>
        </div>
        <button className="btn" onClick={runInference} disabled={running}>
          {running ? "Running inference…" : "Run simulated discharge"}
        </button>
      </header>

      {runError && <ErrorBanner message={runError} />}

      {lastResult && (
        <section className="result-card">
          <span>Latest simulated event · {lastResult.event_id}</span>
          <p>{lastResult.explanation}</p>
        </section>
      )}

      {readingsError && <ErrorBanner message={`Sensor trends are unavailable: ${readingsError}`} />}
      {readingsLoading && <p className="muted small">Loading sensor trends…</p>}
      {!readingsLoading && readings.length > 0 && (
        <SensorTrends
          readings={readings}
          sensor={sensor}
          onSensorChange={(sensorId) => {
            setSensor(sensorId);
            void loadReadings(sensorId);
          }}
        />
      )}

      <section className="network-section workspace-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CONNECTED NETWORK</p>
            <h2>Units in view</h2>
          </div>
          <span className="muted small">{units.length || "—"} facilities</span>
        </div>
        {unitsMeta.stale && (
          <StaleBanner serviceName="Ledger service" fetchedAt={unitsMeta.fetchedAt} error={unitsMeta.error} />
        )}
        {units.length === 0 && !unitsMeta.stale ? (
          <p className="muted small">{unitsMeta.error || "Loading units…"}</p>
        ) : (
          <div className="unit-grid">
            {units.map((unit) => (
              <UnitCard key={unit.unit_id} unit={unit} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

