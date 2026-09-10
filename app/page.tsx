"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getGlobalEvents,
  getGroundwaterAssessment,
  getGroundwaterZones,
  getSensorReadings,
  getUnits,
  postEventToLedger,
  postRegulatorAction,
  simulateInferenceEvent,
} from "@/lib/api";
import type { ContractEvent, GroundwaterAssessment, GroundwaterZone, LedgerUnit, SensorReading } from "@/lib/types";
import UnitCard from "@/components/UnitCard";
import AlertFeed from "@/components/AlertFeed";
import StaleBanner, { ErrorBanner } from "@/components/StaleBanner";
import SensorTrends from "@/components/SensorTrends";
import GroundwaterPanel from "@/components/GroundwaterPanel";

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
  const [sensor, setSensor] = useState("S_A");
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [readingsError, setReadingsError] = useState<string | null>(null);
  const [readingsLoading, setReadingsLoading] = useState(false);
  const [groundwaterZones, setGroundwaterZones] = useState<GroundwaterZone[]>([]);
  const [groundwaterAssessment, setGroundwaterAssessment] = useState<GroundwaterAssessment | null>(null);
  const [groundwaterZoneId, setGroundwaterZoneId] = useState("");
  const [groundwaterMultiplier, setGroundwaterMultiplier] = useState(1);
  const [groundwaterLoading, setGroundwaterLoading] = useState(false);
  const [groundwaterError, setGroundwaterError] = useState<string | null>(null);

  async function loadReadings(sensorId: string) {
    setReadingsLoading(true);
    setReadingsError(null);
    const result = await getSensorReadings(sensorId, 1);
    if (result.data) {
      setReadings(result.data.readings);
    } else {
      setReadings([]);
      setReadingsError(result.error || "Could not load sensor readings.");
    }
    setReadingsLoading(false);
  }

  function handleSensorChange(sensorId: string) {
    setSensor(sensorId);
    void loadReadings(sensorId);
  }

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

  async function loadGroundwaterAssessment(zoneId: string, multiplier: number) {
    setGroundwaterLoading(true);
    setGroundwaterError(null);
    const res = await getGroundwaterAssessment(zoneId, multiplier);
    if (res.data) {
      setGroundwaterAssessment(res.data);
    } else {
      setGroundwaterAssessment(null);
      setGroundwaterError(res.error || "Could not load this FIRKA assessment.");
    }
    setGroundwaterLoading(false);
  }

  async function loadGroundwaterZones() {
    setGroundwaterLoading(true);
    setGroundwaterError(null);
    const res = await getGroundwaterZones();
    if (!res.data || res.data.length === 0) {
      setGroundwaterError(res.error || "Could not load groundwater FIRKAs.");
      setGroundwaterLoading(false);
      return;
    }
    setGroundwaterZones(res.data);
    setGroundwaterZoneId(res.data[0].zone_id);
    await loadGroundwaterAssessment(res.data[0].zone_id, 1);
  }

  function handleGroundwaterZoneChange(zoneId: string) {
    setGroundwaterZoneId(zoneId);
    void loadGroundwaterAssessment(zoneId, groundwaterMultiplier);
  }

  function handleGroundwaterScenarioChange(multiplier: number) {
    setGroundwaterMultiplier(multiplier);
    if (groundwaterZoneId) void loadGroundwaterAssessment(groundwaterZoneId, multiplier);
  }

  useEffect(() => {
    loadUnits();
    loadEvents();
    void loadGroundwaterZones();
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
      await loadReadings(sensor);
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

  async function handleRecordAction(eventId: string, action: string) {
    const result = await postRegulatorAction(eventId, action);
    if (!result.data) {
      return result.error || "Could not record the regulator action.";
    }
    setEvents((current) =>
      current.map((event) =>
        event.event_id === eventId
          ? { ...event, regulator_action: result.data?.regulator_action ?? action }
          : event,
      ),
    );
    return null;
  }

  return (
    <div className="landing-page">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="pulse" /> NoyyalSense · live textile intelligence</p>
          <p className="hero-kicker">THE TEXTILE CAPITAL OF SOUTH INDIA</p>
          <h1 id="hero-title">Tiruppur<span className="type-cursor">|</span></h1>
          <p className="hero-tagline">A city woven with <em>responsibility.</em></p>
          <p className="hero-description">Trace environmental evidence, verify digital product passports and make every textile decision more accountable.</p>
          <div className="hero-actions">
            <a className="btn hero-primary" href="#network">Explore the live network <span>↓</span></a>
            <Link className="text-link" href="/verify">Verify a product passport <span>↗</span></Link>
          </div>
        </div>
        <div className="hero-art" aria-label="Abstract textile weave visual">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="weave-card weave-card-back" />
          <div className="weave-card weave-card-main">
            <span className="weave-label">TRUST, TRACEABILITY, TOMORROW</span>
            <div className="weave-mark">TN</div>
            <span className="weave-location">TIRUPPUR · 11.1085° N</span>
          </div>
        </div>
      </section>

      <section className="impact-strip" aria-label="Platform overview">
        <div><strong>{units.length || "12"}</strong><span>connected units</span></div>
        <div><strong>{units.filter((u) => u.compliance_status.toLowerCase() === "compliant").length || "—"}</strong><span>compliance-ready</span></div>
        <div><strong>{events.length}</strong><span>ledger events</span></div>
        <div><strong>24/7</strong><span>evidence monitoring</span></div>
      </section>

      <section className="story-section">
        <div className="section-intro">
          <p className="eyebrow">01 / THE OPPORTUNITY</p>
          <h2>From fibre to future,<br />with proof at every step.</h2>
        </div>
        <div className="story-grid">
          <article className="story-card passport-card"><div className="story-image passport-image"><span>DPP</span></div><p className="card-index">[ 01 ]</p><h3>Digital product passports</h3><p>Make product-level environmental evidence clear, portable and ready for verification.</p><Link href="/verify">Open buyer view <span>→</span></Link></article>
          <article className="story-card factory-card"><div className="story-image factory-image"><span>01—12</span></div><p className="card-index">[ 02 ]</p><h3>A connected industrial city</h3><p>See Tiruppur’s units as a network—not isolated facilities—with live compliance context.</p><a href="#network">View the network <span>→</span></a></article>
          <article className="story-card ledger-card"><div className="story-image ledger-image"><span>✓</span></div><p className="card-index">[ 03 ]</p><h3>Evidence you can follow</h3><p>Every recorded decision is backed by a transparent, time-stamped evidence trail.</p><a href="#events">Explore evidence <span>→</span></a></article>
        </div>
      </section>

      <div id="network" className="dashboard-heading">
      <div>
          <p className="eyebrow">02 / LIVE NETWORK</p>
          <h2>Inside the Tiruppur network.</h2>
          <p className="muted" style={{ marginTop: 4 }}>
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

      {readingsError && <ErrorBanner message={`Sensor trends are unavailable: ${readingsError}. The inference service needs GET /readings?sensor=S_A&interval=1 returning timestamped pH, EC, turbidity, and flow values.`} />}
      {readingsLoading && <p className="muted small">Loading sensor trends…</p>}
      {!readingsLoading && readings.length > 0 && (
        <SensorTrends readings={readings} sensor={sensor} onSensorChange={handleSensorChange} />
      )}

      {groundwaterError && <ErrorBanner message={`Groundwater service: ${groundwaterError}`} />}
      <GroundwaterPanel
        zones={groundwaterZones}
        assessment={groundwaterAssessment}
        selectedZoneId={groundwaterZoneId}
        multiplier={groundwaterMultiplier}
        loading={groundwaterLoading}
        onZoneChange={handleGroundwaterZoneChange}
        onScenarioChange={handleGroundwaterScenarioChange}
      />

      <section className="network-section" style={{ marginBottom: 56 }}>
        <h3 className="section-label">Connected units</h3>
        {unitsStale.stale && (
          <StaleBanner serviceName="Ledger service" fetchedAt={unitsStale.fetchedAt} error={unitsStale.error} />
        )}
        {units.length === 0 && !unitsStale.stale ? (
          <p className="muted small">
            {unitsStale.error ? unitsStale.error : "Loading units…"}
          </p>
        ) : (
          <div className="unit-grid">
            {units.map((u) => (
              <UnitCard key={u.unit_id} unit={u} />
            ))}
          </div>
        )}
      </section>

      <section id="events" className="events-section">
        <div className="section-intro compact"><p className="eyebrow">03 / EVIDENCE LEDGER</p><h2>A clearer view<br />of every signal.</h2></div>
        <div className="event-panel">
        {eventsStale.stale && (
          <StaleBanner serviceName="Ledger service" fetchedAt={eventsStale.fetchedAt} error={eventsStale.error} />
        )}
        <AlertFeed events={events} onRecordAction={handleRecordAction} />
        </div>
      </section>
    </div>
  );
}
