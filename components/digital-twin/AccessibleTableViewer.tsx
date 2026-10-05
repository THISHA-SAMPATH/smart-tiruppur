"use client";

import React, { useState } from "react";
import Link from "next/link";

interface UnitTableItem {
  id: string;
  name: string;
  type: string;
  status: string;
  reuse: number;
  flow: number;
}

const TABLE_UNITS: UnitTableItem[] = [
  { id: "unit_001", name: "Arulpuram CETP Dyeing Unit 001", type: "Dyeing & Bleaching", status: "COMPLIANT", reuse: 92, flow: 145 },
  { id: "unit_002", name: "Veerapandi Dyeing Unit 002", type: "Textile Processing", status: "COMPLIANT", reuse: 89, flow: 110 },
  { id: "unit_003", name: "Mangalam Road Unit 003", type: "ZLD Dyeing Unit", status: "WARNING", reuse: 84, flow: 160 },
  { id: "unit_004", name: "Kasipalayam Dyeing Unit 004", type: "Garment Washing", status: "COMPLIANT", reuse: 94, flow: 98 },
  { id: "unit_005", name: "Rayapuram Processing Unit 005", type: "Yarn Dyeing", status: "COMPLIANT", reuse: 91, flow: 125 },
  { id: "unit_006", name: "Tiruppur North CETP Unit 006", type: "CETP Member Facility", status: "COMPLIANT", reuse: 95, flow: 210 },
  { id: "unit_007", name: "Angeripalayam Processing 007", type: "Fabric Processing", status: "INVESTIGATE", reuse: 76, flow: 185 },
  { id: "unit_008", name: "Murugampalayam Dyeing 008", type: "Textile Finishing", status: "COMPLIANT", reuse: 88, flow: 105 },
  { id: "unit_009", name: "Nallur Industrial Cluster 009", type: "Dyeing Unit", status: "COMPLIANT", reuse: 90, flow: 130 },
  { id: "unit_010", name: "Palayakkarai Hub Unit 010", type: "Textile Processing", status: "WARNING", reuse: 81, flow: 140 },
  { id: "unit_011", name: "Uthukuli Road Unit 011", type: "Bleaching & Dyeing", status: "COMPLIANT", reuse: 93, flow: 115 },
  { id: "unit_012", name: "Vijayapuram Processing 012", type: "ZLD Facility", status: "COMPLIANT", reuse: 96, flow: 175 },
];

export default function AccessibleTableViewer() {
  const [filter, setFilter] = useState("ALL");

  const filtered = filter === "ALL" ? TABLE_UNITS : TABLE_UNITS.filter((u) => u.status === filter);

  return (
    <div style={{ width: "100%", height: "100%", background: "#0f172a", color: "#f8fafc", padding: "24px", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", margin: 0 }}>
            ACCESSIBLE DATA TABLE VIEW
          </h2>
          <p style={{ fontSize: "12px", color: "#94a3b8", margin: "4px 0 0" }}>
            Structured, high-contrast HTML data grid for screen readers & civic accessibility (Fix #44).
          </p>
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          {["ALL", "COMPLIANT", "WARNING", "INVESTIGATE"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              style={{
                background: filter === status ? "#0d9488" : "#1e293b",
                color: filter === status ? "#ffffff" : "#94a3b8",
                border: "1px solid",
                borderColor: filter === status ? "#0d9488" : "#334155",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#0f172a", borderBottom: "1px solid #334155" }}>
              <th style={{ padding: "12px 16px", textTransform: "uppercase", fontSize: "11px", color: "#94a3b8" }}>Facility ID & Name</th>
              <th style={{ padding: "12px 16px", textTransform: "uppercase", fontSize: "11px", color: "#94a3b8" }}>Facility Category</th>
              <th style={{ padding: "12px 16px", textTransform: "uppercase", fontSize: "11px", color: "#94a3b8" }}>ZLD Status</th>
              <th style={{ padding: "12px 16px", textTransform: "uppercase", fontSize: "11px", color: "#94a3b8" }}>Water Reuse %</th>
              <th style={{ padding: "12px 16px", textTransform: "uppercase", fontSize: "11px", color: "#94a3b8" }}>Flow Rate (L/s)</th>
              <th style={{ padding: "12px 16px", textTransform: "uppercase", fontSize: "11px", color: "#94a3b8" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((unit) => (
              <tr key={unit.id} style={{ borderBottom: "1px solid #334155" }}>
                <td style={{ padding: "12px 16px", fontWeight: 600 }}>{unit.name} ({unit.id})</td>
                <td style={{ padding: "12px 16px", color: "#94a3b8" }}>{unit.type}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span
                    style={{
                      fontWeight: 700,
                      color: unit.status === "INVESTIGATE" ? "#ef4444" : unit.status === "WARNING" ? "#f59e0b" : "#10b981",
                    }}
                  >
                    {unit.status === "INVESTIGATE" ? "! INVESTIGATE" : unit.status === "WARNING" ? "▲ WARNING" : "● COMPLIANT"}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", color: "#10b981", fontWeight: 700 }}>{unit.reuse}%</td>
                <td style={{ padding: "12px 16px" }}>{unit.flow} L/s</td>
                <td style={{ padding: "12px 16px" }}>
                  <Link
                    href={`/units/${unit.id}`}
                    style={{
                      background: "#2563eb",
                      color: "white",
                      padding: "4px 10px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    View DPP →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
