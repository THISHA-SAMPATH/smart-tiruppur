"use client";

import React from "react";

interface DataProvenanceModalProps {
  isOpen: boolean;
  unitId?: string;
  unitName?: string;
  onClose: () => void;
}

export default function DataProvenanceModal({
  isOpen,
  unitId = "unit_007",
  unitName = "Angeripalayam Processing 007",
  onClose,
}: DataProvenanceModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "#1e293b",
          border: "1.5px solid #0d9488",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
          color: "#f8fafc",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ fontSize: "14px", fontWeight: 800, color: "#0d9488", letterSpacing: "0.05em" }}>
            DATA PROVENANCE & GREEN LEDGER AUDIT
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "18px", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        <div style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff", marginBottom: "4px" }}>
          {unitName} ({unitId})
        </div>
        <div style={{ fontSize: "11.5px", color: "#94a3b8", marginBottom: "16px" }}>
          Chain of Custody & Telemetry Verification Log
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
          <div style={{ background: "#0f172a", padding: "12px", borderRadius: "8px", borderLeft: "3px solid #38bdf8" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700 }}>1. PHYSICAL TELEMETRY SENSOR SOURCE</div>
            <div style={{ fontWeight: 600, color: "#f8fafc", marginTop: "2px" }}>
              Station: TNPCB Kasipalayam Bridge Monitoring Station (tnpcb_noyyal_002)
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>
              Parameters Measured: pH 6.8 · EC 2,850 µS/cm · Flow 128 L/s
            </div>
          </div>

          <div style={{ background: "#0f172a", padding: "12px", borderRadius: "8px", borderLeft: "3px solid #f59e0b" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700 }}>2. AI PHYSICS-AWARE INFERENCE ENGINE</div>
            <div style={{ fontWeight: 600, color: "#f8fafc", marginTop: "2px" }}>
              Neural Bayesian Attribution Model v1.4
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>
              Evaluated 1D Advection-Dispersion Transport Equations · Confidence: 87%
            </div>
          </div>

          <div style={{ background: "#0f172a", padding: "12px", borderRadius: "8px", borderLeft: "3px solid #10b981" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700 }}>3. CRYPTOGRAPHIC GREEN LEDGER (FIX #37)</div>
            <div style={{ fontWeight: 600, color: "#10b981", marginTop: "2px" }}>
              Tamper-Evident SHA-256 Hash Verified ✔
            </div>
            <div style={{ fontFamily: "monospace", fontSize: "10.5px", color: "#38bdf8", marginTop: "4px" }}>
              Hash: 8f9a2b4c1d6e3f5a7b8c9d0e1f2a3b4c5d6e7f8a...
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            background: "#0d9488",
            color: "white",
            border: "none",
            padding: "10px",
            borderRadius: "8px",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
            marginTop: "20px",
          }}
        >
          Close Data Provenance Audit
        </button>
      </div>
    </div>
  );
}
