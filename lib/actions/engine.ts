import { ActionRecommendation, PriorityFactors } from "./types";

/**
 * Calculates the Action Priority Score (0 - 100) using multi-criteria weighted factors.
 */
export function calculatePriorityScore(factors: PriorityFactors): number {
  const score =
    0.30 * factors.riskSeverity +
    0.20 * factors.exposure +
    0.20 * factors.urgency +
    0.15 * factors.modelConfidence +
    0.15 * factors.populationImpact;

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Baseline Seeded Municipal Action Interventions for Tiruppur.
 */
export function getInitialRecommendations(): ActionRecommendation[] {
  return [
    {
      id: "rec_act_001",
      sourceIncidentId: "kasipalayam_drain_183",
      title: "Inspect Drain Segment D-183",
      recommendedAction: "Despatch municipal engineering crew to clear culvert choke points and verify stormwater flow along Segment D-183.",
      responsibleDepartment: "Municipal Engineering",
      urgency: "Within 24 hours",
      riskScore: 0.82,
      priorityFactors: {
        riskSeverity: 88,
        exposure: 92,
        urgency: 95,
        modelConfidence: 90,
        populationImpact: 94,
      },
      priorityScore: 92,
      reason: "High monsoon rainfall + low urban elevation + repeated nearby citizen complaints + drainage blockage indicators",
      status: "OPEN",
      timestamp: new Date().toISOString(),
      evidenceReferences: [
        "Kasipalayam Telemetry Station 002 (EC 2850 µS/cm)",
        "Citizen Report #CR-2026-089 (Waterlogging)",
      ],
      verificationStatus: "SHA-256 Tamper-Evident Ledger Verified",
    },
    {
      id: "rec_act_002",
      sourceIncidentId: "evt_E1028_unit_007",
      title: "Despatch Sampling Squad to Unit 007 Sector",
      recommendedAction: "Deploy TNPCB mobile inspection team to collect effluent samples and audit OCEMS calibration logs near Angeripalayam Unit 007.",
      responsibleDepartment: "Tamil Nadu Pollution Control Board (TNPCB)",
      urgency: "Immediate (6 Hours)",
      riskScore: 0.87,
      priorityFactors: {
        riskSeverity: 90,
        exposure: 82,
        urgency: 92,
        modelConfidence: 87,
        populationImpact: 85,
      },
      priorityScore: 87,
      reason: "Bayesian anomaly attribution flagged 87% posterior probability for effluent release + Kasipalayam downstream EC spike",
      status: "ASSIGNED",
      assignedTo: "TNPCB Regional Officer (Zone 2)",
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      evidenceReferences: [
        "Ledger Event Hash: 0x8a7f9b...e412",
        "Bayesian Inference Model v2.1 Output",
      ],
      verificationStatus: "Green Ledger Certificate Verified",
    },
    {
      id: "rec_act_003",
      sourceIncidentId: "firka_south_gw_draft",
      title: "Conduct Borewell Abstraction Audit in Tiruppur South",
      recommendedAction: "Mandate commercial groundwater extraction audit and inspect artificial recharge injection wells in Tiruppur South FIRKA.",
      responsibleDepartment: "Central Ground Water Board (CGWB)",
      urgency: "Within 72 hours",
      riskScore: 0.76,
      priorityFactors: {
        riskSeverity: 82,
        exposure: 75,
        urgency: 70,
        modelConfidence: 94,
        populationImpact: 88,
      },
      priorityScore: 81,
      reason: "CGWB 2024 Stage of Extraction exceeds 112% (Over-Exploited) + piezometer drawdown trend",
      status: "IN_PROGRESS",
      assignedTo: "CGWB Hydrogeology Field Team",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      evidenceReferences: [
        "CGWB Dynamic Assessment 2024 (112.4% Draft)",
        "Piezometer Well #TN-TPR-08 Logs",
      ],
      verificationStatus: "CGWB Official Registry Verified",
    },
    {
      id: "rec_act_004",
      sourceIncidentId: "arulpuram_cetp_zld",
      title: "Verify CETP Recycled Water Reuse Ratio at Arulpuram",
      recommendedAction: "Perform routine compliance audit on Arulpuram CETP member unit reuse ratios and energy recovery logs.",
      responsibleDepartment: "Tamil Nadu Pollution Control Board (TNPCB)",
      urgency: "Routine (7 Days)",
      riskScore: 0.42,
      priorityFactors: {
        riskSeverity: 45,
        exposure: 50,
        urgency: 40,
        modelConfidence: 95,
        populationImpact: 60,
      },
      priorityScore: 47,
      reason: "Routine Digital Product Passport (DPP) verification for ZLD compliance maintenance",
      status: "VERIFIED",
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      evidenceReferences: [
        "DPP Verification ID: DPP-2026-U001",
        "SHA-256 Ledger Block #4812",
      ],
      verificationStatus: "Cryptographic SHA-256 Verified",
    },
  ];
}
