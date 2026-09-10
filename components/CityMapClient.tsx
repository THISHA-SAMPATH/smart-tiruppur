"use client";

import dynamic from "next/dynamic";

const TiruppurMap = dynamic(() => import("@/components/TiruppurMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "560px",
        width: "100%",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--hairline)",
        background: "var(--paper-raised)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
      }}
    >
      <span className="pulse" />
      <p className="muted small">Loading Tiruppur City Base Map (OpenStreetMap)…</p>
    </div>
  ),
});

export default function CityMapClient() {
  return <TiruppurMap />;
}
