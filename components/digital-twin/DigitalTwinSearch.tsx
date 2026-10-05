"use client";

import React, { useState } from "react";

interface SearchItem {
  id: string;
  name: string;
  type: "unit" | "sensor" | "groundwater" | "incident";
  lat: number;
  lon: number;
  subtext: string;
}

const SEARCH_DATABASE: SearchItem[] = [
  { id: "unit_007", name: "Angeripalayam Processing 007", type: "unit", lat: 11.1420, lon: 77.3310, subtext: "Fabric Processing Unit · Investigation" },
  { id: "unit_001", name: "Arulpuram CETP Dyeing Unit 001", type: "unit", lat: 11.0835, lon: 77.3210, subtext: "Dyeing & Bleaching · ZLD Compliant" },
  { id: "unit_004", name: "Kasipalayam Dyeing Unit 004", type: "unit", lat: 11.1190, lon: 77.3950, subtext: "Garment Washing · Certified" },
  { id: "tnpcb_noyyal_002", name: "Kasipalayam Bridge Telemetry Station", type: "sensor", lat: 11.11975, lon: 77.39716, subtext: "Urban Exit Telemetry Station" },
  { id: "tnpcb_noyyal_001", name: "Mangalam Telemetry Station", type: "sensor", lat: 11.10651, lon: 77.26001, subtext: "Upstream Entry Station" },
  { id: "firka_south", name: "Tiruppur South FIRKA", type: "groundwater", lat: 11.0820, lon: 77.3550, subtext: "Groundwater Zone · Over-Exploited" },
  { id: "firka_north", name: "Tiruppur North FIRKA", type: "groundwater", lat: 11.1320, lon: 77.3450, subtext: "Groundwater Zone · Critical" },
  { id: "evt_E1028", name: "Incident E-1028 Attribution", type: "incident", lat: 11.1420, lon: 77.3310, subtext: "Active Anomaly · 87% Confidence" },
];

interface DigitalTwinSearchProps {
  onSelectResult: (item: SearchItem) => void;
  onLocateMe: () => void;
}

export default function DigitalTwinSearch({
  onSelectResult,
  onLocateMe,
}: DigitalTwinSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filtered = query.trim()
    ? SEARCH_DATABASE.filter(
        (item) =>
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          item.id.toLowerCase().includes(query.toLowerCase()) ||
          item.subtext.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const handleSelect = (item: SearchItem) => {
    onSelectResult(item);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "320px" }}>
      <div style={{ display: "flex", gap: "6px" }}>
        <input
          type="text"
          placeholder="Search Tiruppur (Unit 007, Kasipalayam...)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          style={{
            flex: 1,
            background: "#1e293b",
            color: "#ffffff",
            border: "1px solid #334155",
            padding: "6px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            outline: "none",
          }}
        />

        <button
          type="button"
          onClick={onLocateMe}
          title="Locate nearest sensor & river landmark"
          style={{
            background: "#1e293b",
            color: "#38bdf8",
            border: "1px solid #334155",
            padding: "6px 10px",
            borderRadius: "6px",
            fontSize: "12px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          📍 Locate
        </button>
      </div>

      {isOpen && filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "4px",
            background: "#1e293b",
            border: "1px solid #0d9488",
            borderRadius: "8px",
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
            zIndex: 999,
            maxHeight: "220px",
            overflowY: "auto",
          }}
        >
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => handleSelect(item)}
              style={{
                padding: "8px 12px",
                borderBottom: "1px solid #334155",
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
            >
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#ffffff" }}>{item.name}</div>
              <div style={{ fontSize: "10.5px", color: "#38bdf8", marginTop: "2px" }}>{item.subtext}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
