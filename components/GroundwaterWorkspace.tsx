"use client";

import { useEffect, useState } from "react";
import GroundwaterPanel from "@/components/GroundwaterPanel";
import { getGroundwaterAssessment, getGroundwaterZones } from "@/lib/api";
import type { GroundwaterAssessment, GroundwaterZone } from "@/lib/types";
import { ErrorBanner } from "@/components/StaleBanner";
import { Droplet, AlertTriangle, CheckCircle, ShieldCheck, Database } from "lucide-react";

export default function GroundwaterWorkspace() {
  const [zones, setZones] = useState<GroundwaterZone[]>([]);
  const [assessment, setAssessment] = useState<GroundwaterAssessment | null>(null);
  const [zoneId, setZoneId] = useState("");
  const [multiplier, setMultiplier] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAssessment(nextZoneId: string, nextMultiplier: number) {
    setLoading(true);
    setError(null);
    const res = await getGroundwaterAssessment(nextZoneId, nextMultiplier);
    setAssessment(res.data);
    if (!res.data) setError(res.error || "Could not load this FIRKA assessment.");
    setLoading(false);
  }

  useEffect(() => {
    void (async () => {
      const res = await getGroundwaterZones();
      if (!res.data?.length) {
        setError(res.error || "Could not load groundwater FIRKAs.");
        setLoading(false);
        return;
      }
      setZones(res.data);
      // Default to Alangiyam (matching the user's view) or first zone
      const defaultZone =
        res.data.find((z) => z.zone_id === "tiruppur_alangiyam_dup" || z.name.includes("ALANGIYAM"))?.zone_id ||
        res.data[0].zone_id;

      setZoneId(defaultZone);
      await loadAssessment(defaultZone, 1);
    })();
  }, []);

  return (
    <div className="workspace-page">
      {/* Workspace Header */}
      <header className="workspace-header">
        <div>
          <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="pulse" />
            RESOURCE STEWARDSHIP / 02 · CGWB DYNAMIC ASSESSMENT
          </p>
          <h1 style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.03em" }}>
            Groundwater Outlook & Aquifer Stewardship
          </h1>
          <p style={{ maxWidth: "720px", marginTop: "8px" }}>
            Official Central Ground Water Board (CGWB) 2024 dynamic groundwater assessment paired with
            interactive extraction stress scenarios for all 33 revenue FIRKAs of Tiruppur District.
          </p>
        </div>

        {/* Provenance Tag */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
          <span
            className="badge badge-normal"
            style={{
              padding: "6px 14px",
              fontSize: "12px",
              background: "#ffffff",
              border: "1px solid var(--hairline)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <Database size={13} color="var(--teal)" style={{ marginRight: "4px" }} />
            CGWB 2024 · GEC-2015 Methodology
          </span>
          <span className="small muted" style={{ fontSize: "11px" }}>
            State Water Resources Dept., Tamil Nadu
          </span>
        </div>
      </header>

      {/* District Macro Statistics Strip */}
      <div
        className="impact-strip"
        style={{
          marginTop: "0",
          marginBottom: "28px",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Droplet size={14} color="var(--teal)" />
            <span>Monitored FIRKAs</span>
          </div>
          <strong>33</strong>
          <span className="small muted">9 Revenue Taluks</span>
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <AlertTriangle size={14} color="#dc2626" />
            <span>Over-Exploited</span>
          </div>
          <strong style={{ color: "#dc2626" }}>7 FIRKAs</strong>
          <span className="small muted">&gt;100% Extraction Stage</span>
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <AlertTriangle size={14} color="#ea580c" />
            <span>Critical Units</span>
          </div>
          <strong style={{ color: "#ea580c" }}>4 FIRKAs</strong>
          <span className="small muted">90% – 100% Draft Stage</span>
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ShieldCheck size={14} color="#ca8a04" />
            <span>Semi-Critical</span>
          </div>
          <strong style={{ color: "#ca8a04" }}>11 FIRKAs</strong>
          <span className="small muted">70% – 90% Moderate Draft</span>
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <CheckCircle size={14} color="#16a34a" />
            <span>Safe Categories</span>
          </div>
          <strong style={{ color: "#16a34a" }}>11 FIRKAs</strong>
          <span className="small muted">&lt;70% Sustainable Stage</span>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: "20px" }}>
          <ErrorBanner message={`Groundwater service notice: ${error} (operating on official CGWB registry cache)`} />
        </div>
      )}

      {/* Main Groundwater Interactive Panel */}
      <GroundwaterPanel
        zones={zones}
        assessment={assessment}
        selectedZoneId={zoneId}
        multiplier={multiplier}
        loading={loading}
        onZoneChange={(nextZoneId) => {
          setZoneId(nextZoneId);
          void loadAssessment(nextZoneId, multiplier);
        }}
        onScenarioChange={(nextMultiplier) => {
          setMultiplier(nextMultiplier);
          if (zoneId) void loadAssessment(zoneId, nextMultiplier);
        }}
      />
    </div>
  );
}
