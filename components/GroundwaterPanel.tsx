"use client";

import React, { useState, useMemo } from "react";
import type { GroundwaterAssessment, GroundwaterZone, GroundwaterRisk } from "@/lib/types";
import {
  CGWB_TIRUPPUR_FIRKAS,
  getGroundwaterRiskColors,
  computeGroundwaterRiskCategory,
} from "@/lib/groundwater/firka-registry";
import {
  Droplets,
  Gauge,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  Radio,
  Sliders,
  RotateCcw,
  Search,
  Download,
  Info,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  MapPin,
  FileText,
  Compass,
  Zap,
} from "lucide-react";

const SCENARIOS = [
  { multiplier: 0.8, label: "−20% Sustainable", desc: "Recharge & conservation target" },
  { multiplier: 1.0, label: "Baseline (1.0×)", desc: "CGWB 2024 official reference" },
  { multiplier: 1.2, label: "+20% High Demand", desc: "Drought & industrial surge stress" },
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
  const [tableSearch, setTableSearch] = useState("");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Active FIRKA metadata
  const activeFirkaMeta = useMemo(() => {
    return (
      CGWB_TIRUPPUR_FIRKAS.find(
        (f) =>
          f.zone_id === selectedZoneId ||
          f.name.toLowerCase() === selectedZoneId.toLowerCase() ||
          f.zone_id.toLowerCase().includes(selectedZoneId.toLowerCase()),
      ) || CGWB_TIRUPPUR_FIRKAS[0]
    );
  }, [selectedZoneId]);

  const baseline = assessment?.cgwb_baseline || activeFirkaMeta.baseline;
  const simulation = assessment?.simulation;
  const baselineRisk: GroundwaterRisk = baseline.category;
  const simulatedRisk: GroundwaterRisk =
    simulation?.risk ??
    computeGroundwaterRiskCategory(baseline.stage_percent * multiplier);

  const baselineColors = getGroundwaterRiskColors(baselineRisk);
  const simulatedColors = getGroundwaterRiskColors(simulatedRisk);

  // Stage gauge positioning (normalized to 125% max scale)
  const baselineStage = baseline.stage_percent;
  const simulatedStage = simulation
    ? simulation.estimated_stage_percent
    : baseline.stage_percent * multiplier;

  const baselineGaugePos = Math.min(Math.max((baselineStage / 125) * 100, 2), 98);
  const simulatedGaugePos = Math.min(Math.max((simulatedStage / 125) * 100, 2), 98);

  const netAvailability = Math.max(
    0,
    baseline.annual_extractable_resource_ham - baseline.total_extraction_ham,
  );
  const deltaExtraction = simulation
    ? simulation.estimated_extraction_ham - baseline.total_extraction_ham
    : baseline.total_extraction_ham * multiplier - baseline.total_extraction_ham;

  // Prominent FIRKAs for quick-access buttons
  const quickFirkas = [
    { id: "tiruppur_alangiyam_dup", name: "Alangiyam" },
    { id: "tiruppur_south", name: "Tiruppur South" },
    { id: "tiruppur_velampalayam", name: "Velampalayam" },
    { id: "tiruppur_palladam", name: "Palladam" },
    { id: "tiruppur_kangeyam", name: "Kangeyam" },
    { id: "tiruppur_dharapuram", name: "Dharapuram" },
  ];

  // Filtered FIRKAs for registry table
  const filteredFirkas = useMemo(() => {
    return CGWB_TIRUPPUR_FIRKAS.filter((f) => {
      const matchesSearch =
        f.name.toLowerCase().includes(tableSearch.toLowerCase()) ||
        f.taluk.toLowerCase().includes(tableSearch.toLowerCase());

      const simulatedStageLocal = f.baseline.stage_percent * multiplier;
      const simRisk = computeGroundwaterRiskCategory(simulatedStageLocal);

      if (tableFilter === "all") return matchesSearch;
      if (tableFilter === "over-exploited")
        return matchesSearch && (f.baseline.category === "Over Exploited" || simRisk === "Over Exploited");
      if (tableFilter === "critical")
        return matchesSearch && (f.baseline.category === "Critical" || simRisk === "Critical");
      if (tableFilter === "semi-critical")
        return matchesSearch && (f.baseline.category === "Semi Critical" || simRisk === "Semi Critical");
      if (tableFilter === "safe")
        return matchesSearch && (f.baseline.category === "Safe" && simRisk === "Safe");
      return matchesSearch;
    });
  }, [tableSearch, tableFilter, multiplier]);

  // Export Assessment Data JSON/CSV
  const handleExportAssessment = () => {
    const dataToExport = {
      firka: activeFirkaMeta.name,
      taluk: activeFirkaMeta.taluk,
      zone_id: selectedZoneId,
      assessment_year: 2024,
      methodology: "CGWB GEC-2015",
      baseline: {
        annual_extractable_resource_ham: baseline.annual_extractable_resource_ham,
        total_extraction_ham: baseline.total_extraction_ham,
        stage_percent: baseline.stage_percent,
        category: baseline.category,
      },
      scenario: {
        multiplier,
        estimated_extraction_ham: simulation?.estimated_extraction_ham,
        estimated_stage_percent: simulatedStage,
        simulated_risk: simulatedRisk,
      },
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CGWB_Groundwater_${activeFirkaMeta.name.replace(/\s+/g, "_")}_2024.json`;
    a.click();
    URL.revokeObjectURL(url);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  return (
    <div className="groundwater-panel" aria-labelledby="groundwater-title">
      {/* 1. TOP INTERACTIVE SELECTION & CONTEXT CARD */}
      <section className="groundwater-card" style={{ padding: "24px 28px" }}>
        <div className="groundwater-header">
          <div style={{ flex: "1 1 380px" }}>
            <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span className="pulse" />
              04 / GROUNDWATER OUTLOOK · CGWB DYNAMIC ASSESSMENT
            </p>
            <h2 id="groundwater-title" style={{ fontSize: "28px", margin: "4px 0 8px" }}>
              FIRKA Water Balance & Aquifer Staging
            </h2>
            <p className="muted" style={{ fontSize: "14.5px", margin: 0, maxWidth: "680px" }}>
              Evaluate official CGWB 2024 dynamic groundwater records (GEC-2015 methodology) paired with
              high-resolution scenario modeling across Tiruppur District revenue FIRKAs.
            </p>
          </div>

          {/* FIRKA Dropdown Selector */}
          <div className="groundwater-select-wrapper">
            <label htmlFor="firka-dropdown" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <MapPin size={13} color="var(--teal)" /> Select Revenue FIRKA ({zones.length || 33} Total)
            </label>
            <select
              id="firka-dropdown"
              className="groundwater-select"
              value={selectedZoneId}
              onChange={(e) => onZoneChange(e.target.value)}
              disabled={loading}
            >
              {zones.length > 0
                ? zones.map((zone) => {
                    const match = CGWB_TIRUPPUR_FIRKAS.find((f) => f.zone_id === zone.zone_id);
                    return (
                      <option key={zone.zone_id} value={zone.zone_id}>
                        {match ? `${match.taluk} Taluk — ${match.name}` : zone.name}
                      </option>
                    );
                  })
                : CGWB_TIRUPPUR_FIRKAS.map((firka) => (
                    <option key={firka.zone_id} value={firka.zone_id}>
                      {firka.taluk} Taluk — {firka.name}
                    </option>
                  ))}
            </select>
          </div>
        </div>

        {/* Quick-Pick FIRKA Chips */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
            marginTop: "16px",
            paddingTop: "16px",
            borderTop: "1px solid var(--hairline)",
          }}
        >
          <span className="small muted" style={{ fontSize: "12px", fontWeight: 600 }}>
            Quick select:
          </span>
          {quickFirkas.map((qf) => {
            const isSelected =
              selectedZoneId === qf.id ||
              selectedZoneId.toLowerCase().includes(qf.name.toLowerCase());
            return (
              <button
                key={qf.id}
                type="button"
                onClick={() => onZoneChange(qf.id)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: isSelected ? "1.5px solid var(--teal)" : "1px solid var(--hairline)",
                  background: isSelected ? "var(--teal-soft)" : "#ffffff",
                  color: isSelected ? "var(--teal)" : "var(--ink-soft)",
                  transition: "all 0.15s ease",
                }}
              >
                {qf.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. SCENARIO STRESS TEST CONTROLS */}
      <section className="groundwater-card" style={{ padding: "20px 24px" }}>
        <div className="scenario-control" style={{ background: "transparent", padding: 0, border: "none" }}>
          <div>
            <div className="scenario-control-label">
              <Sliders size={16} color="var(--indigo)" />
              <span style={{ fontSize: "15px", fontWeight: 700 }}>
                Extraction Stress Scenario Simulator
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: multiplier === 1.0 ? "var(--paper)" : multiplier < 1.0 ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
                  color: multiplier === 1.0 ? "var(--ink-soft)" : multiplier < 1.0 ? "#059669" : "#d97706",
                  border: "1px solid var(--hairline)",
                }}
              >
                {multiplier === 1.0 ? "Baseline Reference" : `${multiplier > 1 ? "+" : ""}${Math.round((multiplier - 1) * 100)}% Extraction Shift`}
              </span>
            </div>
            <p className="muted small" style={{ margin: "4px 0 0", fontSize: "12.5px" }}>
              Simulate GEC-2015 recharge variations, seasonal industrial draft demands, and sustainable extraction goals.
            </p>
          </div>

          {/* Scenario Button Presets */}
          <div className="scenario-buttons-group">
            {SCENARIOS.map((scenario) => {
              const isActive = Math.abs(multiplier - scenario.multiplier) < 0.01;
              return (
                <button
                  key={scenario.multiplier}
                  type="button"
                  className={`scenario-button ${isActive ? "active" : ""}`}
                  aria-pressed={isActive}
                  disabled={loading}
                  onClick={() => onScenarioChange(scenario.multiplier)}
                  title={scenario.desc}
                >
                  {scenario.label}
                </button>
              );
            })}
            {multiplier !== 1.0 && (
              <button
                type="button"
                onClick={() => onScenarioChange(1.0)}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: "6px 10px",
                  fontSize: "12px",
                  color: "var(--ink-soft)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                title="Reset to CGWB Baseline"
              >
                <RotateCcw size={12} /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Fine-Tuning Range Slider */}
        <div
          style={{
            marginTop: "16px",
            paddingTop: "14px",
            borderTop: "1px solid var(--hairline)",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--ink-soft)", minWidth: "120px" }}>
            Granular Adjustment:
          </span>
          <input
            type="range"
            min="0.70"
            max="1.30"
            step="0.05"
            value={multiplier}
            onChange={(e) => onScenarioChange(parseFloat(e.target.value))}
            style={{
              flex: "1 1 200px",
              accentColor: multiplier > 1 ? "#ea580c" : multiplier < 1 ? "#10b981" : "var(--ink)",
              cursor: "pointer",
            }}
          />
          <span
            className="mono"
            style={{
              fontSize: "13px",
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: "6px",
              background: "#f1f5f9",
              color: "var(--ink)",
              minWidth: "72px",
              textAlign: "center",
            }}
          >
            {(multiplier * 100).toFixed(0)}% (
            {multiplier > 1 ? `+${Math.round((multiplier - 1) * 100)}%` : multiplier < 1 ? `${Math.round((multiplier - 1) * 100)}%` : "±0%"}
            )
          </span>
        </div>
      </section>

      {/* 3. LOADING STATE OR ASSESSMENT DETAILS */}
      {loading && (
        <div className="groundwater-loading">
          <span className="pulse" />
          <span>Refreshing FIRKA dynamic groundwater assessment and telemetry models…</span>
        </div>
      )}

      {!loading && (
        <>
          {/* 4. HERO RISK STATUS & EXTRACTION STAGE PROGRESSION */}
          <section className="groundwater-card" style={{ padding: "24px 28px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: "18px",
                marginBottom: "20px",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--ink-soft)",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {activeFirkaMeta.taluk} Taluk · FIRKA Assessment
                </span>
                <h3 style={{ fontSize: "24px", fontWeight: 700, margin: "4px 0 8px" }}>
                  {activeFirkaMeta.name}
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 14px",
                      borderRadius: "999px",
                      background: multiplier !== 1.0 ? simulatedColors.bg : baselineColors.bg,
                      border: `1.5px solid ${multiplier !== 1.0 ? simulatedColors.border : baselineColors.border}`,
                      color: multiplier !== 1.0 ? simulatedColors.color : baselineColors.color,
                      fontWeight: 700,
                      fontSize: "13.5px",
                    }}
                  >
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: multiplier !== 1.0 ? simulatedColors.dot : baselineColors.dot,
                      }}
                    />
                    <span>{multiplier !== 1.0 ? simulatedRisk : baselineRisk}</span>
                  </div>

                  {/* Risk Migration Badge */}
                  {multiplier !== 1.0 && simulatedRisk !== baselineRisk && (
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        padding: "5px 12px",
                        borderRadius: "8px",
                        background: simulatedStage > baselineStage ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)",
                        color: simulatedStage > baselineStage ? "#dc2626" : "#059669",
                        border: "1px solid currentColor",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {simulatedStage > baselineStage ? (
                        <>
                          <AlertTriangle size={13} />
                          Risk elevated from {baselineRisk} to {simulatedRisk}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={13} />
                          Risk recovered from {baselineRisk} to {simulatedRisk}
                        </>
                      )}
                    </span>
                  )}

                  {multiplier !== 1.0 && simulatedRisk === baselineRisk && (
                    <span
                      className="small muted"
                      style={{
                        fontSize: "12px",
                        fontWeight: 500,
                        padding: "4px 10px",
                        borderRadius: "6px",
                        background: "#f1f5f9",
                      }}
                    >
                      Stage shift: {simulatedStage > baselineStage ? "+" : ""}{(simulatedStage - baselineStage).toFixed(1)}% (Category steady: {simulatedRisk})
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons: Export */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleExportAssessment}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px" }}
                >
                  <Download size={14} />
                  {copiedNotification ? "Exported!" : "Export FIRKA JSON"}
                </button>
              </div>
            </div>

            {/* Assessment Metadata Chips */}
            <div className="groundwater-summary" style={{ marginBottom: "24px" }}>
              <div className="groundwater-summary-item">
                <span>Assessment Cycle</span>
                <strong>CGWB {assessment?.assessment_year || 2024}</strong>
              </div>
              <div className="groundwater-summary-item">
                <span>Valid Observatories</span>
                <strong>
                  {simulation?.valid_observations ?? activeFirkaMeta.observations.filter((o) => o !== null).length} /{" "}
                  {simulation?.total_observations ?? activeFirkaMeta.observations.length} Active Wells
                </strong>
              </div>
              <div className="groundwater-summary-item">
                <span>Model Confidence</span>
                <strong>
                  {simulation
                    ? `${(simulation.confidence * 100).toFixed(1)}%`
                    : `${((activeFirkaMeta.observations.filter((o) => o !== null).length / (activeFirkaMeta.observations.length || 1)) * 100).toFixed(0)}%`}
                </strong>
              </div>
              <div className="groundwater-summary-item">
                <span>GEC-2015 Category</span>
                <strong style={{ color: baselineColors.color }}>{baselineRisk}</strong>
              </div>
            </div>

            {/* STAGE GAUGE BAR (0% to 125%+) */}
            <div className="stage-gauge-container">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--ink)" }}>
                  Groundwater Extraction Stage Continuum (GEC-2015 Scale)
                </span>
                <span className="mono small" style={{ fontSize: "12px", color: "var(--ink-soft)" }}>
                  Baseline: <strong>{baselineStage.toFixed(1)}%</strong>
                  {multiplier !== 1.0 && (
                    <>
                      {" "}
                      → Simulated:{" "}
                      <strong style={{ color: simulatedColors.color }}>
                        {simulatedStage.toFixed(1)}%
                      </strong>
                    </>
                  )}
                </span>
              </div>

              {/* Continuum Track */}
              <div className="stage-gauge-track">
                <div className="stage-gauge-segment safe" title="Safe Stage (<70%)" />
                <div className="stage-gauge-segment semi-critical" title="Semi Critical Stage (70% - 90%)" />
                <div className="stage-gauge-segment critical" title="Critical Stage (90% - 100%)" />
                <div className="stage-gauge-segment over-exploited" title="Over Exploited Stage (>100%)" />
              </div>

              {/* Pin Markers */}
              <div className="stage-gauge-marker-bar">
                {/* Baseline Pin */}
                <div
                  className="stage-gauge-pin"
                  style={{ left: `${baselineGaugePos}%` }}
                >
                  <div className="stage-gauge-pin-pointer" />
                  <div className="stage-gauge-pin-label">
                    Baseline: {baselineStage.toFixed(1)}%
                  </div>
                </div>

                {/* Scenario Pin if different */}
                {multiplier !== 1.0 && Math.abs(simulatedGaugePos - baselineGaugePos) > 2 && (
                  <div
                    className="stage-gauge-pin"
                    style={{ left: `${simulatedGaugePos}%` }}
                  >
                    <div
                      className="stage-gauge-pin-pointer"
                      style={{ borderBottomColor: simulatedColors.color }}
                    />
                    <div
                      className="stage-gauge-pin-label"
                      style={{ background: simulatedColors.color }}
                    >
                      Scenario: {simulatedStage.toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>

              {/* Stage Legend */}
              <div className="stage-legend">
                <div className="stage-legend-item">
                  <span className="stage-legend-dot" style={{ background: "#10b981" }} />
                  <span>Safe (&lt;70%)</span>
                </div>
                <div className="stage-legend-item">
                  <span className="stage-legend-dot" style={{ background: "#f59e0b" }} />
                  <span>Semi Critical (70%–90%)</span>
                </div>
                <div className="stage-legend-item">
                  <span className="stage-legend-dot" style={{ background: "#ea580c" }} />
                  <span>Critical (90%–100%)</span>
                </div>
                <div className="stage-legend-item">
                  <span className="stage-legend-dot" style={{ background: "#dc2626" }} />
                  <span>Over Exploited (&gt;100%)</span>
                </div>
              </div>
            </div>
          </section>

          {/* 5. SIX COMPREHENSIVE WATER BALANCE METRIC CARDS */}
          <div className="groundwater-metrics">
            <MetricCard
              icon={<Droplets size={20} color="var(--teal)" />}
              label="Extractable Resource"
              value={formatHam(baseline.annual_extractable_resource_ham)}
              detail="Total annual replenishable groundwater recharge capacity"
              provenance="CGWB 2024 Baseline"
            />
            <MetricCard
              icon={<Activity size={20} color="var(--indigo)" />}
              label="CGWB Extraction"
              value={formatHam(baseline.total_extraction_ham)}
              detail="Official reported annual draft for irrigation, domestic & industrial uses"
              provenance="GEC-2015 Assessment"
            />
            <MetricCard
              icon={<Zap size={20} color={multiplier > 1 ? "#ea580c" : multiplier < 1 ? "#10b981" : "var(--teal)"} />}
              label="Simulated Extraction"
              value={formatHam(
                simulation?.estimated_extraction_ham ??
                  baseline.total_extraction_ham * multiplier,
              )}
              detail={`Projected draft at ${scenarioLabel(multiplier)} scenario`}
              provenance={
                deltaExtraction !== 0
                  ? `${deltaExtraction > 0 ? "+" : ""}${formatHam(deltaExtraction)} shift`
                  : "Matches baseline"
              }
            />
            <MetricCard
              icon={<Gauge size={20} color={baselineColors.color} />}
              label="Baseline Stage"
              value={`${baseline.stage_percent.toFixed(1)}%`}
              detail={`Official CGWB classification: ${baseline.category}`}
              provenance="Annual Draft / Resource"
            />
            <MetricCard
              icon={<Compass size={20} color={simulatedColors.color} />}
              label="Simulated Stage"
              value={`${simulatedStage.toFixed(1)}%`}
              detail={`Model scenario risk: ${simulatedRisk}`}
              provenance={`${scenarioLabel(multiplier)} model`}
            />
            <MetricCard
              icon={<ShieldCheck size={20} color="var(--teal)" />}
              label="Net Reserve Balance"
              value={formatHam(netAvailability)}
              detail="Surplus uncommitted extractable buffer for future conservation"
              provenance={netAvailability > 0 ? "Recharge Surplus" : "Deficit State"}
            />
          </div>

          {/* 6. COMPARATIVE BALANCE BARS & PIEZOMETER WELL TELEMETRY */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: "20px",
            }}
          >
            {/* Water Balance Breakdown */}
            <div className="groundwater-card" style={{ padding: "22px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <FileText size={18} color="var(--indigo)" />
                <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
                  Water Balance Volume Allocation
                </h4>
              </div>
              <p className="muted small" style={{ margin: "0 0 16px 0", fontSize: "12.5px" }}>
                Comparison of replenishable recharge vs active draft draft in hectare-meters (HaM).
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Total Resource */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 600 }}>Total Extractable Resource</span>
                    <strong className="mono">{formatHam(baseline.annual_extractable_resource_ham)}</strong>
                  </div>
                  <div style={{ height: "10px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ width: "100%", height: "100%", background: "var(--teal)" }} />
                  </div>
                </div>

                {/* Baseline Extraction */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 600 }}>Baseline Annual Draft ({baselineStage.toFixed(1)}%)</span>
                    <strong className="mono">{formatHam(baseline.total_extraction_ham)}</strong>
                  </div>
                  <div style={{ height: "10px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.min(baselineStage, 100)}%`,
                        height: "100%",
                        background: baselineColors.color,
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>

                {/* Scenario Extraction */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 600 }}>Simulated Draft ({simulatedStage.toFixed(1)}%)</span>
                    <strong className="mono">
                      {formatHam(
                        simulation?.estimated_extraction_ham ??
                          baseline.total_extraction_ham * multiplier,
                      )}
                    </strong>
                  </div>
                  <div style={{ height: "10px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.min(simulatedStage, 100)}%`,
                        height: "100%",
                        background: simulatedColors.color,
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Piezometer Monitoring Network */}
            <div className="groundwater-card" style={{ padding: "22px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Radio size={18} color="var(--teal)" />
                  <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
                    Piezometer Observatories ({activeFirkaMeta.num_piezometers} Wells)
                  </h4>
                </div>
                <span className="badge badge-normal" style={{ fontSize: "11px" }}>
                  CGWB Hydrograph Network
                </span>
              </div>
              <p className="muted small" style={{ margin: "0 0 16px 0", fontSize: "12.5px" }}>
                Depth to water-table levels recorded across local observation piezometer wells (meters below ground level · m bgl).
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "10px" }}>
                {activeFirkaMeta.observations.map((obs, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: obs !== null ? "#f8fafc" : "#fff1f2",
                      border: `1px solid ${obs !== null ? "var(--hairline)" : "#fecdd3"}`,
                      borderRadius: "8px",
                      padding: "10px 12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    <span style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--ink-soft)", textTransform: "uppercase" }}>
                      Station #{idx + 1}
                    </span>
                    <strong style={{ fontSize: "15px", color: obs !== null ? "var(--ink)" : "#e11d48" }}>
                      {obs !== null ? `${obs.toFixed(1)} m bgl` : "Offline"}
                    </strong>
                    <span style={{ fontSize: "11px", color: obs !== null ? "#16a34a" : "#e11d48" }}>
                      {obs !== null ? "Telemetry Valid" : "Null Observation"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 7. ALL 33 TIRUPPUR FIRKAs REGISTRY TABLE */}
          <section className="groundwater-card" style={{ padding: "24px 28px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                flexWrap: "wrap",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              <div>
                <p className="eyebrow" style={{ margin: "0 0 4px 0" }}>
                  DISTRICT-WIDE INVENTORY
                </p>
                <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>
                  All 33 Tiruppur District Revenue FIRKAs
                </h3>
                <p className="muted small" style={{ margin: "4px 0 0 0" }}>
                  Browse and inspect any FIRKA across 9 taluks under the current scenario ({scenarioLabel(multiplier)}).
                </p>
              </div>

              {/* Search Bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#ffffff",
                  border: "1px solid var(--hairline)",
                  borderRadius: "var(--radius-sm)",
                  padding: "6px 12px",
                  minWidth: "260px",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <Search size={15} color="var(--ink-soft)" />
                <input
                  type="text"
                  placeholder="Filter FIRKA or Taluk..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  style={{
                    border: "none",
                    outline: "none",
                    fontSize: "13px",
                    width: "100%",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
                marginBottom: "16px",
              }}
            >
              {[
                { id: "all", label: "All FIRKAs (33)" },
                { id: "over-exploited", label: "Over Exploited (7)" },
                { id: "critical", label: "Critical (4)" },
                { id: "semi-critical", label: "Semi Critical (11)" },
                { id: "safe", label: "Safe (11)" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTableFilter(tab.id)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    border: tableFilter === tab.id ? "1.5px solid var(--ink)" : "1px solid var(--hairline)",
                    background: tableFilter === tab.id ? "var(--ink)" : "#ffffff",
                    color: tableFilter === tab.id ? "#ffffff" : "var(--ink-soft)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Table Container */}
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>FIRKA Name</th>
                    <th>Taluk</th>
                    <th>Extractable (HaM)</th>
                    <th>CGWB Draft (HaM)</th>
                    <th>Baseline Stage</th>
                    <th>CGWB Category</th>
                    <th>Scenario Draft</th>
                    <th>Scenario Stage</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFirkas.map((firka) => {
                    const isSelected =
                      firka.zone_id === selectedZoneId ||
                      firka.name.toLowerCase() === selectedZoneId.toLowerCase();

                    const simStage = Number((firka.baseline.stage_percent * multiplier).toFixed(1));
                    const simCategory = computeGroundwaterRiskCategory(simStage);
                    const simColors = getGroundwaterRiskColors(simCategory);
                    const baseColors = getGroundwaterRiskColors(firka.baseline.category);

                    return (
                      <tr
                        key={firka.zone_id}
                        style={{
                          background: isSelected ? "var(--teal-soft)" : undefined,
                          fontWeight: isSelected ? 600 : undefined,
                        }}
                      >
                        <td>
                          <strong>{firka.name}</strong>
                          {isSelected && (
                            <span
                              style={{
                                marginLeft: "8px",
                                fontSize: "10px",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                background: "var(--teal)",
                                color: "white",
                              }}
                            >
                              Selected
                            </span>
                          )}
                        </td>
                        <td className="muted">{firka.taluk}</td>
                        <td className="mono">{formatHam(firka.baseline.annual_extractable_resource_ham)}</td>
                        <td className="mono">{formatHam(firka.baseline.total_extraction_ham)}</td>
                        <td className="mono">{firka.baseline.stage_percent.toFixed(1)}%</td>
                        <td>
                          <span
                            className="risk-pill"
                            style={{
                              background: baseColors.bg,
                              color: baseColors.color,
                              borderColor: baseColors.border,
                            }}
                          >
                            {firka.baseline.category}
                          </span>
                        </td>
                        <td className="mono">
                          {formatHam(Number((firka.baseline.total_extraction_ham * multiplier).toFixed(2)))}
                        </td>
                        <td className="mono" style={{ color: simColors.color }}>
                          {simStage.toFixed(1)}% ({simCategory})
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => {
                              onZoneChange(firka.zone_id);
                              window.scrollTo({ top: 120, behavior: "smooth" });
                            }}
                            style={{ padding: "4px 10px", fontSize: "11.5px" }}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* 8. REGULATORY & CGWA POLICY GUIDANCE */}
          <section
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "var(--radius-md)",
              padding: "20px 24px",
              display: "flex",
              alignItems: "flex-start",
              gap: "16px",
            }}
          >
            <ShieldCheck size={26} color="#16a34a" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <h4 style={{ margin: "0 0 6px 0", fontSize: "15px", color: "#166534", fontWeight: 700 }}>
                Central Ground Water Authority (CGWA) & Tamil Nadu GEC-2015 Policy Context
              </h4>
              <p style={{ margin: 0, fontSize: "13px", color: "#14532d", lineHeight: "1.6" }}>
                Under the Central Ground Water Board (CGWB) framework, revenue FIRKAs with an extraction stage exceeding
                100% (<strong>Over Exploited</strong>) or between 90%–100% (<strong>Critical</strong>) are subject to
                rigorous groundwater abstraction NOC conditions. Textile processing units, dye houses, and industrial
                facilities in these zones must implement mandatory 100% rainwater harvesting recharge wells and
                continuous telemetry on deep bore extraction.
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  provenance,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  provenance: string;
}) {
  return (
    <article className="groundwater-metric">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{label}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
      <div
        style={{
          marginTop: "auto",
          paddingTop: "6px",
          borderTop: "1px dashed var(--hairline)",
          fontSize: "11px",
          color: "var(--ink-soft)",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--teal)" }} />
        <span>{provenance}</span>
      </div>
    </article>
  );
}

function formatHam(value: number) {
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)} ham`;
}

function scenarioLabel(multiplier: number) {
  if (multiplier === 1.0) return "Baseline (1.0×)";
  if (multiplier < 1.0) return `−${Math.round((1 - multiplier) * 100)}% Conservation`;
  return `+${Math.round((multiplier - 1) * 100)}% Stress Demand`;
}
