import Link from "next/link";
import type { LedgerUnit } from "@/lib/types";

export default function UnitCard({ unit }: { unit: LedgerUnit }) {
  const isCompliant =
    unit.compliance_status?.toLowerCase().includes("compliant") ?? true;
  const isActionPending =
    unit.compliance_status?.toLowerCase().includes("action") ||
    unit.compliance_status?.toLowerCase().includes("review") ||
    unit.compliance_status?.toLowerCase().includes("flagged");

  return (
    <Link
      href={`/units/${unit.unit_id}`}
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div
        className="card unit-card-item"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100%",
          padding: "20px",
          borderRadius: "var(--radius-md)",
          background: "var(--paper-raised)",
          border: "1px solid var(--hairline)",
          boxShadow: "var(--shadow-sm)",
          position: "relative",
          boxSizing: "border-box",
          transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease",
        }}
      >
        {/* Top Header Row: Unit ID Badge & Status Pill */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
              gap: "8px",
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--ink-soft)",
                background: "var(--paper)",
                padding: "3px 8px",
                borderRadius: "4px",
                border: "1px solid var(--hairline)",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              {unit.unit_id}
            </span>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "999px",
                background: isCompliant
                  ? "rgba(16, 185, 129, 0.12)"
                  : isActionPending
                  ? "rgba(245, 158, 11, 0.12)"
                  : "rgba(239, 68, 68, 0.12)",
                color: isCompliant
                  ? "#059669"
                  : isActionPending
                  ? "#d97706"
                  : "#dc2626",
                border: isCompliant
                  ? "1px solid rgba(16, 185, 129, 0.3)"
                  : isActionPending
                  ? "1px solid rgba(245, 158, 11, 0.3)"
                  : "1px solid rgba(239, 68, 68, 0.3)",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: isCompliant
                    ? "#10b981"
                    : isActionPending
                    ? "#f59e0b"
                    : "#ef4444",
                }}
              />
              {unit.compliance_status || (isCompliant ? "Compliant" : "Review")}
            </span>
          </div>

          {/* Facility Name with fixed min-height for uniform row alignment across grid */}
          <h3
            style={{
              fontSize: "15.5px",
              fontWeight: 700,
              lineHeight: 1.35,
              color: "var(--ink)",
              margin: "0 0 8px 0",
              minHeight: "42px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
            title={unit.name}
          >
            {unit.name}
          </h3>

          {/* CETP / ZLD Status Tag */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              color: "var(--ink-soft)",
              marginBottom: "16px",
            }}
          >
            <span style={{ fontSize: "14px" }}>🏭</span>
            <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {unit.cetp_zld_status || "ZLD System"}
            </span>
            {unit.certifications && unit.certifications.length > 0 && (
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--teal)",
                  background: "var(--teal-soft)",
                  padding: "1px 6px",
                  borderRadius: "3px",
                  marginLeft: "auto",
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {unit.certifications[0]}
              </span>
            )}
          </div>
        </div>

        {/* Bottom Section: Pinned Metrics Grid */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: "14px",
            borderTop: "1px solid var(--hairline)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            {/* Water Reuse Metric */}
            <div
              style={{
                background: "var(--paper)",
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--hairline)",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--ink-soft)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "2px",
                }}
              >
                Water Reuse
              </div>
              <div
                className="mono"
                style={{
                  fontSize: "15px",
                  fontWeight: 800,
                  color: "var(--teal)",
                }}
              >
                {unit.reuse_percentage != null ? `${unit.reuse_percentage}%` : "—"}
              </div>
              <div
                style={{
                  width: "100%",
                  height: "4px",
                  background: "#e2e8f0",
                  borderRadius: "2px",
                  marginTop: "6px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, Math.max(0, unit.reuse_percentage ?? 0))}%`,
                    height: "100%",
                    background: "var(--teal)",
                    borderRadius: "2px",
                  }}
                />
              </div>
            </div>

            {/* Renewable Energy Metric */}
            <div
              style={{
                background: "var(--paper)",
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--hairline)",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--ink-soft)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "2px",
                }}
              >
                Renewable
              </div>
              <div
                className="mono"
                style={{
                  fontSize: "15px",
                  fontWeight: 800,
                  color: "var(--indigo)",
                }}
              >
                {unit.renewable_energy_percentage != null
                  ? `${unit.renewable_energy_percentage}%`
                  : "—"}
              </div>
              <div
                style={{
                  width: "100%",
                  height: "4px",
                  background: "#e2e8f0",
                  borderRadius: "2px",
                  marginTop: "6px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, Math.max(0, unit.renewable_energy_percentage ?? 0))}%`,
                    height: "100%",
                    background: "var(--indigo)",
                    borderRadius: "2px",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--indigo)",
              paddingTop: "2px",
            }}
          >
            <span>View Facility Passport</span>
            <span style={{ fontSize: "14px", transition: "transform 0.15s ease" }}>→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
