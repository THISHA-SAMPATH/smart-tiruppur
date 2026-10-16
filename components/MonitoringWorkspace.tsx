"use client";

import { useEffect, useState } from "react";
import { getSensorReadings, getUnits, postEventToLedger, simulateInferenceEvent } from "@/lib/api";
import type { ContractEvent, LedgerUnit, SensorReading } from "@/lib/types";
import SensorTrends from "@/components/SensorTrends";
import StaleBanner, { ErrorBanner } from "@/components/StaleBanner";
import UnitCard from "@/components/UnitCard";
import MonsoonRainSimulator from "@/components/MonsoonRainSimulator";

export default function MonitoringWorkspace() {
  const [units, setUnits] = useState<LedgerUnit[]>([]);
  const [unitsMeta, setUnitsMeta] = useState({ stale: false, fetchedAt: null as string | null, error: null as string | null });
  const [unitSearch, setUnitSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState<"ALL" | "COMPLIANT" | "REVIEW">("ALL");
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

      {/* Hydrological Rain & Runoff Dilution Simulator */}
      <MonsoonRainSimulator />

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

      <section className="network-section workspace-section" style={{ marginTop: "36px" }}>
        <div className="section-heading" style={{ flexWrap: "wrap", gap: "16px", alignItems: "flex-end", marginBottom: "20px" }}>
          <div>
            <p className="eyebrow">CONNECTED NETWORK</p>
            <h2 style={{ margin: "2px 0 0" }}>Industrial Units in View</h2>
          </div>
          <span className="muted small" style={{ fontWeight: 600 }}>
            {units.length || "—"} monitored facilities
          </span>
        </div>

        {/* Search and Alignment Filter Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "20px",
            background: "var(--paper-raised)",
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--hairline)",
          }}
        >
          <div style={{ flex: 1, minWidth: "240px", maxWidth: "420px" }}>
            <input
              type="text"
              placeholder="Search by facility name, unit ID, or CETP..."
              value={unitSearch}
              onChange={(e) => setUnitSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: "13px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--hairline)",
                background: "var(--paper)",
                color: "var(--ink)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setUnitFilter("ALL")}
              style={{
                fontSize: "12px",
                fontWeight: 600,
                padding: "6px 12px",
                borderRadius: "999px",
                border: unitFilter === "ALL" ? "1px solid var(--indigo)" : "1px solid var(--hairline)",
                background: unitFilter === "ALL" ? "var(--indigo-soft)" : "transparent",
                color: unitFilter === "ALL" ? "var(--indigo)" : "var(--ink-soft)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              All ({units.length})
            </button>
            <button
              type="button"
              onClick={() => setUnitFilter("COMPLIANT")}
              style={{
                fontSize: "12px",
                fontWeight: 600,
                padding: "6px 12px",
                borderRadius: "999px",
                border: unitFilter === "COMPLIANT" ? "1px solid #10b981" : "1px solid var(--hairline)",
                background: unitFilter === "COMPLIANT" ? "rgba(16, 185, 129, 0.1)" : "transparent",
                color: unitFilter === "COMPLIANT" ? "#059669" : "var(--ink-soft)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Compliant ({units.filter((u) => u.compliance_status?.toLowerCase().includes("compliant")).length})
            </button>
            <button
              type="button"
              onClick={() => setUnitFilter("REVIEW")}
              style={{
                fontSize: "12px",
                fontWeight: 600,
                padding: "6px 12px",
                borderRadius: "999px",
                border: unitFilter === "REVIEW" ? "1px solid #f59e0b" : "1px solid var(--hairline)",
                background: unitFilter === "REVIEW" ? "rgba(245, 158, 11, 0.1)" : "transparent",
                color: unitFilter === "REVIEW" ? "#d97706" : "var(--ink-soft)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Action / Review ({units.filter((u) => !u.compliance_status?.toLowerCase().includes("compliant")).length})
            </button>
          </div>
        </div>

        {unitsMeta.stale && (
          <StaleBanner serviceName="Ledger service" fetchedAt={unitsMeta.fetchedAt} error={unitsMeta.error} />
        )}

        {units.length === 0 && !unitsMeta.stale ? (
          <p className="muted small">{unitsMeta.error || "Loading industrial units…"}</p>
        ) : (
          (() => {
            const displayUnits = units.filter((u) => {
              const q = unitSearch.trim().toLowerCase();
              const matchesQuery =
                !q ||
                u.name.toLowerCase().includes(q) ||
                u.unit_id.toLowerCase().includes(q) ||
                u.cetp_zld_status?.toLowerCase().includes(q);
              if (!matchesQuery) return false;
              if (unitFilter === "COMPLIANT") return u.compliance_status?.toLowerCase().includes("compliant");
              if (unitFilter === "REVIEW") return !u.compliance_status?.toLowerCase().includes("compliant");
              return true;
            });

            if (displayUnits.length === 0) {
              return (
                <div className="card" style={{ padding: "32px", textAlign: "center", color: "var(--ink-soft)" }}>
                  <p style={{ margin: 0, fontSize: "14px" }}>No industrial facilities matching &quot;{unitSearch}&quot;.</p>
                </div>
              );
            }

            return (
              <div className="unit-grid">
                {displayUnits.map((unit) => (
                  <UnitCard key={unit.unit_id} unit={unit} />
                ))}
              </div>
            );
          })()
        )}
      </section>
    </div>
  );
}

