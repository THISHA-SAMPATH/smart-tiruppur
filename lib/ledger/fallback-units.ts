import type { LedgerUnit, DppResponse, VerifyResponse } from "@/lib/types";

export const FALLBACK_UNITS: LedgerUnit[] = [
  {
    unit_id: "unit_001",
    name: "Sirupooluvapatti Dyeing Co-Operative",
    cetp_zld_status: "Operational",
    reuse_percentage: 96.5,
    renewable_energy_percentage: 82.0,
    compliance_status: "Compliant",
    certifications: ["GOTS 6.0", "OEKO-TEX Standard 100", "ZDHC Level 3"],
  },
  {
    unit_id: "unit_002",
    name: "Mangalam Eco-Processors & Bleaching",
    cetp_zld_status: "Operational",
    reuse_percentage: 94.2,
    renewable_energy_percentage: 76.5,
    compliance_status: "Compliant",
    certifications: ["ISO 14001", "GOTS Certified", "ZDHC Level 2"],
  },
  {
    unit_id: "unit_003",
    name: "Rayapuram Bleaching Mills Private Ltd",
    cetp_zld_status: "Operational",
    reuse_percentage: 95.8,
    renewable_energy_percentage: 88.0,
    compliance_status: "Compliant",
    certifications: ["EU REACH Compliant", "OEKO-TEX", "GOTS 6.0"],
  },
  {
    unit_id: "unit_004",
    name: "Kasipalayam Sustainable Garment Washers",
    cetp_zld_status: "Operational",
    reuse_percentage: 91.0,
    renewable_energy_percentage: 68.0,
    compliance_status: "Compliant",
    certifications: ["ZDHC Level 2", "BlueSign Approved"],
  },
  {
    unit_id: "unit_005",
    name: "Chinnakarai Textile Processing Cluster",
    cetp_zld_status: "Operational",
    reuse_percentage: 97.1,
    renewable_energy_percentage: 91.5,
    compliance_status: "Compliant",
    certifications: ["GOTS 6.0", "OEKO-TEX Made in Green", "ZDHC Level 3"],
  },
  {
    unit_id: "unit_006",
    name: "Murugampalayam Knits & Dyeing Works",
    cetp_zld_status: "Operational",
    reuse_percentage: 93.6,
    renewable_energy_percentage: 74.0,
    compliance_status: "Compliant",
    certifications: ["ISO 14001", "GOTS 6.0"],
  },
];

export function getFallbackUnitDpp(unitId: string): DppResponse {
  const unit =
    FALLBACK_UNITS.find((u) => u.unit_id.toLowerCase() === unitId.toLowerCase()) ||
    FALLBACK_UNITS[0];

  const verificationHash = `vrf_${unit.unit_id}_${Math.random().toString(36).substring(2, 8)}`;

  return {
    unit_id: unit.unit_id,
    unit_profile: unit,
    compliance_summary: `CETP / ZLD: ${unit.cetp_zld_status}. Compliance: ${unit.compliance_status}. Certifications: ${unit.certifications.join(", ")}.`,
    reuse_and_energy: {
      reuse_percentage: unit.reuse_percentage,
      renewable_energy_percentage: unit.renewable_energy_percentage,
    },
    recent_environmental_evidence: {
      status: "PASS",
      last_event_id: null,
      confidence: 0.94,
    },
    issue_date: new Date().toISOString(),
    verification_id: verificationHash,
    qr_url: `/units/${unit.unit_id}/qr`,
  };
}

export function getFallbackVerify(verificationId: string): VerifyResponse {
  const cleanId = verificationId.trim();
  const lower = cleanId.toLowerCase();

  // Try to match unit ID embedded in the verification hash
  let matchedUnit = FALLBACK_UNITS[0];
  for (const u of FALLBACK_UNITS) {
    if (lower.includes(u.unit_id.toLowerCase())) {
      matchedUnit = u;
      break;
    }
  }

  return {
    verification_id: cleanId.startsWith("vrf_") ? cleanId : `vrf_${cleanId}`,
    unit_id: matchedUnit.unit_id,
    valid: true,
    issue_date: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
    compliance_status: "Verified · ZLD Compliant (EU DPP Standard)",
  };
}
