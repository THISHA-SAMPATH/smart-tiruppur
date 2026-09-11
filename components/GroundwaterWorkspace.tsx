"use client";

import { useEffect, useState } from "react";
import GroundwaterPanel from "@/components/GroundwaterPanel";
import { getGroundwaterAssessment, getGroundwaterZones } from "@/lib/api";
import type { GroundwaterAssessment, GroundwaterZone } from "@/lib/types";
import { ErrorBanner } from "@/components/StaleBanner";

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
      setZoneId(res.data[0].zone_id);
      await loadAssessment(res.data[0].zone_id, 1);
    })();
  }, []);

  return (
    <div className="workspace-page">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">RESOURCE STEWARDSHIP / 02</p>
          <h1>Groundwater outlook</h1>
          <p>Compare CGWB baseline records against transparent extraction scenarios for Tiruppur FIRKAs.</p>
        </div>
      </header>
      {error && <ErrorBanner message={`Groundwater service: ${error}`} />}
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

