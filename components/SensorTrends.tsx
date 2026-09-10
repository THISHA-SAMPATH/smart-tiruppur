"use client";

import type { SensorReading } from "@/lib/types";

type Metric = "ph" | "ec" | "turbidity" | "flow";

const METRICS: { key: Metric; label: string; unit: string; color: string }[] = [
  { key: "ph", label: "pH", unit: "pH", color: "#2b3a67" },
  { key: "ec", label: "EC", unit: "mS/cm", color: "#3e6b63" },
  { key: "turbidity", label: "Turbidity", unit: "NTU", color: "#a8721c" },
  { key: "flow", label: "Flow", unit: "L/min", color: "#9c3b22" },
];

export default function SensorTrends({
  readings,
  sensor,
  onSensorChange,
}: {
  readings: SensorReading[];
  sensor: string;
  onSensorChange: (sensor: string) => void;
}) {
  return (
    <section className="sensor-trends" aria-labelledby="sensor-trends-title">
      <div className="sensor-trends-header">
        <div>
          <p className="eyebrow">03 / RAW SENSOR SIGNALS</p>
          <h2 id="sensor-trends-title">Sensor trends</h2>
          <p className="muted small">Readings from the latest simulated incident.</p>
        </div>
        <label className="sensor-select">
          Sensor
          <select value={sensor} onChange={(event) => onSensorChange(event.target.value)}>
            {["S_A", "S_B", "S_C", "S_D"].map((id) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="trend-grid">
        {METRICS.map((metric) => (
          <TrendChart key={metric.key} readings={readings} metric={metric} />
        ))}
      </div>
    </section>
  );
}

function TrendChart({
  readings,
  metric,
}: {
  readings: SensorReading[];
  metric: (typeof METRICS)[number];
}) {
  const values = readings.map((reading) => reading[metric.key]).filter(Number.isFinite);
  const width = 360;
  const height = 170;
  const pad = { top: 18, right: 12, bottom: 30, left: 45 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || Math.max(Math.abs(max) * 0.1, 1);
  const lower = min - range * 0.1;
  const upper = max + range * 0.1;
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  const points = readings
    .map((reading, index) => {
      const x = pad.left + (readings.length <= 1 ? 0 : (index / (readings.length - 1)) * chartWidth);
      const y = pad.top + ((upper - reading[metric.key]) / (upper - lower)) * chartHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const start = readings[0] ? formatTime(readings[0].timestamp) : "";
  const end = readings.at(-1) ? formatTime(readings.at(-1)!.timestamp) : "";

  return (
    <article className="trend-card">
      <div className="trend-title"><h3>{metric.label}</h3><span>{metric.unit}</span></div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${metric.label} readings from ${start} to ${end}`}>
        {[0, 0.5, 1].map((fraction) => {
          const y = pad.top + fraction * chartHeight;
          const label = (upper - fraction * (upper - lower)).toFixed(metric.key === "ph" ? 1 : 2);
          return <g key={fraction}><line className="chart-gridline" x1={pad.left} x2={width - pad.right} y1={y} y2={y} /><text className="chart-axis" x={pad.left - 6} y={y + 3} textAnchor="end">{label}</text></g>;
        })}
        <polyline className="chart-line" points={points} style={{ stroke: metric.color }} />
        {readings.map((reading, index) => {
          const x = pad.left + (readings.length <= 1 ? 0 : (index / (readings.length - 1)) * chartWidth);
          const y = pad.top + ((upper - reading[metric.key]) / (upper - lower)) * chartHeight;
          return <circle key={reading.timestamp} cx={x} cy={y} r="2.6" style={{ fill: metric.color }}><title>{`${formatTime(reading.timestamp)}: ${reading[metric.key]} ${metric.unit}`}</title></circle>;
        })}
        <text className="chart-axis" x={pad.left} y={height - 8}>{start}</text>
        <text className="chart-axis" x={width - pad.right} y={height - 8} textAnchor="end">{end}</text>
      </svg>
      <p className="small muted">Latest: <strong>{values.at(-1)?.toFixed(metric.key === "ph" ? 2 : 3)} {metric.unit}</strong></p>
    </article>
  );
}

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp));
}
