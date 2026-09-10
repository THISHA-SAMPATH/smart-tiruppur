"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { ContractEvent } from "@/lib/types";
import StatusBadge from "./StatusBadge";

export default function AlertFeed({
  events,
  onRecordAction,
}: {
  events: ContractEvent[];
  onRecordAction: (eventId: string, action: string) => Promise<string | null>;
}) {
  if (events.length === 0) {
    return <p className="muted small">No events recorded yet.</p>;
  }

  return (
    <div className="grid" style={{ gap: 10 }}>
      {events.map((ev) => (
        <AlertCard key={ev.event_id} event={ev} onRecordAction={onRecordAction} />
      ))}
    </div>
  );
}

function AlertCard({
  event: ev,
  onRecordAction,
}: {
  event: ContractEvent;
  onRecordAction: (eventId: string, action: string) => Promise<string | null>;
}) {
  const [action, setAction] = useState(ev.regulator_action ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedAction = action.trim();
    if (!trimmedAction) {
      setMessage("Enter the action taken before recording it.");
      return;
    }
    setSaving(true);
    setMessage(null);
    const error = await onRecordAction(ev.event_id, trimmedAction);
    setSaving(false);
    setMessage(error ?? "Action recorded in the evidence ledger.");
  }

  return (
    <div className="card">
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
      {ev.decision === "investigate" && (
        <form className="regulator-action" onSubmit={submitAction}>
          <label htmlFor={`action-${ev.event_id}`}>Regulator action</label>
          <div className="regulator-action-controls">
            <input
              id={`action-${ev.event_id}`}
              list="regulator-action-options"
              value={action}
              onChange={(event) => setAction(event.target.value)}
              placeholder="e.g. Inspection requested"
              disabled={saving}
            />
            <button className="btn" type="submit" disabled={saving}>
              {saving ? "Recording…" : ev.regulator_action ? "Update action" : "Record action"}
            </button>
          </div>
          {message && (
            <p className={`small action-message${message.startsWith("Action recorded") ? " success" : ""}`} role="status">
              {message}
            </p>
          )}
        </form>
      )}
      {ev.decision !== "investigate" && ev.regulator_action && (
        <p className="small regulator-action-record">Regulator action: {ev.regulator_action}</p>
      )}
    </div>
  );
}
