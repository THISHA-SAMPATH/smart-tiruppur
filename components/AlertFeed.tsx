import Link from "next/link";
import type { ContractEvent } from "@/lib/types";
import StatusBadge from "./StatusBadge";

export default function AlertFeed({ events }: { events: ContractEvent[] }) {
  if (events.length === 0) {
    return <p className="muted small">No events recorded yet.</p>;
  }

  return (
    <div className="grid" style={{ gap: 10 }}>
      {events.map((ev) => (
        <div key={ev.event_id} className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "start",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <StatusBadge decision={ev.decision} />
                <span className="mono small muted">{ev.event_id}</span>
              </div>
              <p style={{ margin: 0 }}>{ev.explanation}</p>
              {ev.most_likely_source && (
                <p className="small muted" style={{ marginTop: 6 }}>
                  Most likely source:{" "}
                  <Link
                    href={`/units/${ev.most_likely_source}`}
                    className="mono"
                  >
                    {ev.most_likely_source}
                  </Link>{" "}
                  · confidence {(ev.confidence * 100).toFixed(0)}%
                </p>
              )}
              {ev.sensor_conditions.missing_sensor_count > 0 ||
              ev.sensor_conditions.drift_detected ? (
                <p className="small muted" style={{ marginTop: 4 }}>
                  {ev.sensor_conditions.missing_sensor_count} sensor(s) missing
                  {ev.sensor_conditions.drift_detected
                    ? ", drift detected"
                    : ""}
                </p>
              ) : null}
            </div>
            <span className="small muted" style={{ whiteSpace: "nowrap" }}>
              {new Date(ev.timestamp).toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
