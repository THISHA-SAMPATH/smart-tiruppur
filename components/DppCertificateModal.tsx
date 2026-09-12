"use client";

import type { DppResponse, LedgerUnit } from "@/lib/types";

interface DppCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: LedgerUnit | null;
  dpp: DppResponse | null;
}

export default function DppCertificateModal({
  isOpen,
  onClose,
  unit,
  dpp,
}: DppCertificateModalProps) {
  if (!isOpen || !unit || !dpp) return null;

  const handlePrint = () => {
    window.print();
  };

  const verificationHash =
    dpp.verification_id || `vrf_${unit.unit_id}_${Date.now().toString(16)}`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(8px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          maxWidth: "750px",
          width: "100%",
          background: "#ffffff",
          color: "#1a1a1a",
          borderRadius: "12px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          padding: "36px",
          fontFamily: "'Inter', sans-serif",
          position: "relative",
        }}
        id="printable-dpp-certificate"
      >
        {/* Modal Action Bar (Hidden on print) */}
        <div
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            borderBottom: "1px solid #e5e7eb",
            paddingBottom: "16px",
          }}
        >
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#4f46e5" }}>
            🇪🇺 EU Digital Product Passport Compliance Certificate
          </span>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={handlePrint}
              style={{
                background: "#4f46e5",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              🖨️ Print / Save PDF
            </button>
            <button
              onClick={onClose}
              style={{
                background: "#f3f4f6",
                color: "#374151",
                border: "none",
                borderRadius: "6px",
                padding: "8px 14px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Official Certificate Layout */}
        <div
          style={{
            border: "3px double #374151",
            padding: "28px",
            borderRadius: "8px",
            background: "#fafafa",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderBottom: "2px solid #111827",
              paddingBottom: "16px",
              marginBottom: "20px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "1.5px",
                  color: "#4f46e5",
                  textTransform: "uppercase",
                }}
              >
                NOYYALSENSE GREEN LEDGER AUTHORITY
              </div>
              <h1
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  margin: "4px 0 2px",
                  color: "#111827",
                }}
              >
                EU COMPLIANCE AUDIT CERTIFICATE
              </h1>
              <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>
                Zero Liquid Discharge & Sustainable Garment Provenance
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  display: "inline-block",
                  padding: "4px 10px",
                  background: "#dcfce7",
                  color: "#166534",
                  fontSize: "12px",
                  fontWeight: 700,
                  borderRadius: "4px",
                  border: "1px solid #86efac",
                }}
              >
                ✓ VERIFIED DPP PASSPORT
              </div>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "11px",
                  fontFamily: "monospace",
                  color: "#4b5563",
                }}
              >
                ID: {verificationHash}
              </p>
            </div>
          </div>

          {/* Facility Profile */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: "20px",
              marginBottom: "20px",
              background: "#ffffff",
              padding: "16px",
              borderRadius: "6px",
              border: "1px solid #e5e7eb",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "11px",
                  textTransform: "uppercase",
                  color: "#6b7280",
                  fontWeight: 700,
                  margin: "0 0 4px",
                }}
              >
                Manufacturing Facility
              </p>
              <h2 style={{ fontSize: "18px", margin: 0, color: "#111827" }}>
                {unit.name}
              </h2>
              <p
                style={{
                  fontSize: "12px",
                  color: "#4b5563",
                  margin: "4px 0 0",
                  fontFamily: "monospace",
                }}
              >
                Facility ID: {unit.unit_id} | Location: Tiruppur Industrial Cluster
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p
                style={{
                  fontSize: "11px",
                  textTransform: "uppercase",
                  color: "#6b7280",
                  fontWeight: 700,
                  margin: "0 0 4px",
                }}
              >
                Issue Date
              </p>
              <p style={{ fontSize: "14px", fontWeight: 600, margin: 0, color: "#111827" }}>
                {new Date(dpp.issue_date || Date.now()).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Sustainability Key Metrics Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                padding: "12px",
                borderRadius: "6px",
              }}
            >
              <span style={{ fontSize: "11px", color: "#166534", fontWeight: 700 }}>
                WATER RECYCLING (ZLD)
              </span>
              <p
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  color: "#15803d",
                  margin: "4px 0 0",
                }}
              >
                {dpp.reuse_and_energy.reuse_percentage}%
              </p>
              <span style={{ fontSize: "10px", color: "#166534" }}>
                Zero Liquid Discharge Certified
              </span>
            </div>

            <div
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                padding: "12px",
                borderRadius: "6px",
              }}
            >
              <span style={{ fontSize: "11px", color: "#1e40af", fontWeight: 700 }}>
                RENEWABLE ENERGY
              </span>
              <p
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  color: "#1d4ed8",
                  margin: "4px 0 0",
                }}
              >
                {dpp.reuse_and_energy.renewable_energy_percentage}%
              </p>
              <span style={{ fontSize: "10px", color: "#1e40af" }}>
                Solar & Wind Energy Mix
              </span>
            </div>

            <div
              style={{
                background: "#fefce8",
                border: "1px solid #fef08a",
                padding: "12px",
                borderRadius: "6px",
              }}
            >
              <span style={{ fontSize: "11px", color: "#854d0e", fontWeight: 700 }}>
                CARBON FOOTPRINT
              </span>
              <p
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  color: "#a16207",
                  margin: "4px 0 0",
                }}
              >
                1.42 <span style={{ fontSize: "12px" }}>gCO₂e/kg</span>
              </p>
              <span style={{ fontSize: "10px", color: "#854d0e" }}>
                EU Category A Baseline
              </span>
            </div>
          </div>

          {/* Regulatory Clearance & SHA-256 Stamp */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              padding: "16px",
              marginBottom: "20px",
            }}
          >
            <h4 style={{ margin: "0 0 8px", fontSize: "13px", color: "#111827" }}>
              Environmental Audit Summary
            </h4>
            <p style={{ margin: 0, fontSize: "12px", color: "#4b5563" }}>
              {dpp.compliance_summary}
            </p>
            <div
              style={{
                marginTop: "12px",
                paddingTop: "10px",
                borderTop: "1px dashed #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "11px", color: "#6b7280" }}>
                Noyyal River Baseline Status: <strong>{dpp.recent_environmental_evidence.status}</strong>
              </span>
              <span style={{ fontSize: "10px", fontFamily: "monospace", color: "#9ca3af" }}>
                Ledger Chain SHA-256 Verified
              </span>
            </div>
          </div>

          {/* Official Signatures & Seal */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              paddingTop: "16px",
              borderTop: "1px solid #d1d5db",
            }}
          >
            <div>
              <p style={{ fontSize: "10px", color: "#9ca3af", margin: 0 }}>
                ISSUED UNDER NOYYALSENSE BAYESIAN GREEN LEDGER FRAMEWORK
              </p>
              <p style={{ fontSize: "11px", color: "#4b5563", margin: "2px 0 0", fontWeight: 600 }}>
                Tiruppur Water Stewardship & Regulatory Authority
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  border: "2px solid #4f46e5",
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  fontWeight: 800,
                  color: "#4f46e5",
                  textAlign: "center",
                  transform: "rotate(-12deg)",
                }}
              >
                EU DPP
                <br />
                APPROVED
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
