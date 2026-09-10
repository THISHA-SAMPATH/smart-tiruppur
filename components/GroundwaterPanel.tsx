"use client";

import type { GroundwaterAssessment, GroundwaterZone } from "@/lib/types";

const SCENARIOS = [
  { multiplier: 0.8, label: "−20%" },
  { multiplier: 1, label: "Baseline" },
  { multiplier: 1.2, label: "+20%" },
];

export default function GroundwaterPanel({
  zones,
  assessment,
  selectedZoneId,
  multiplier,
  loading,
  onZoneChange,
  onScenarioChange,
}: {
  zones: GroundwaterZone[];
  assessment: GroundwaterAssessment | null;
  selectedZoneId: string;
  multiplier: number;
  loading: boolean;
  onZoneChange: (zoneId: string) => void;
  onScenarioChange: (multiplier: number) => void;
}) {
  const baseline = assessment?.cgwb_baseline;
  const simulation = assessment?.simulation;
  const risk = simulation?.risk ?? baseline?.category;

  return (
    <section className="groundwater-panel" aria-labelledby="groundwater-title">
      <div className="groundwater-header">
        <div>
          <p className="eyebrow">04 / GROUNDWATER OUTLOOK</p>
          <h2 id="groundwater-title">FIRKA water balance</h2>
          <p className="muted small">CGWB baseline paired with a simulated extraction scenario.</p>
        </div>
        <label className="groundwater-select">
          FIRKA
          <select value={selectedZoneId} onChange={(event) => onZoneChange(event.target.value)} disabled={loading || zones.length === 0}>
            {zones.map((zone) => <option key={zone.zone_id} value={zone.zone_id}>{zone.name}</option>)}
          </select>
        </label>
      </div>

      <div className="scenario-control" aria-label="Extraction scenario">
        <span>Extraction scenario</span>
        <div role="group" aria-label="Set extraction scenario">
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.multiplier}
              type="button"
              className={multiplier === scenario.multiplier ? "scenario-button active" : "scenario-button"}
              aria-pressed={multiplier === scenario.multiplier}
              disabled={loading || !assessment}
              onClick={() => onScenarioChange(scenario.multiplier)}
            >
              {scenario.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="muted small groundwater-loading">Refreshing groundwater assessment…</p>}
      {!loading && assessment && baseline && simulation && (
        <>
          <div className="groundwater-summary">
            <div>
              <span>Risk category</span>
              <strong className={`risk-pill risk-${risk?.toLowerCase().replaceAll(" ", "-")}`}>{risk}</strong>
            </div>
            <div><span>Assessment year</span><strong>{assessment.assessment_year}</strong></div>
            <div><span>Valid observations</span><strong>{simulation.valid_observations} / {simulation.total_observations}</strong></div>
            <div><span>Confidence</span><strong>{formatPercent(simulation.confidence)}</strong></div>
          </div>
          <div className="groundwater-metrics">
            <Metric label="CGWB extraction" value={formatHam(baseline.total_extraction_ham)} detail="Baseline annual extraction" />
            <Metric label="Extractable resource" value={formatHam(baseline.annual_extractable_resource_ham)} detail="Annual extractable resource" />
            <Metric label="Stage" value={formatPercent(baseline.stage_percent / 100)} detail={`CGWB: ${baseline.category}`} />
            <Metric label="Simulated extraction" value={formatHam(simulation.estimated_extraction_ham)} detail={`${scenarioLabel(multiplier)} scenario`} />
            <Metric label="Simulated stage" value={formatPercent(simulation.estimated_stage_percent / 100)} detail={`Model risk: ${simulation.risk}`} />
          </div>
        </>
      )}
    </section>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="groundwater-metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function formatHam(value: number) {
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)} ham`;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function scenarioLabel(multiplier: number) {
  return multiplier === 1 ? "Baseline" : multiplier < 1 ? "20% lower extraction" : "20% higher extraction";
}
