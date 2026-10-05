// ---------------------------------------------------------------------------
// ACTION RECOMMENDATION ENGINE — DOMAIN TYPES & SCHEMAS
// Prioritized municipal interventions for Tiruppur district.
// ---------------------------------------------------------------------------

export type ActionStatus =
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "VERIFIED"
  | "RESOLVED"
  | "REJECTED";

export type DepartmentRole =
  | "Municipal Engineering"
  | "Tamil Nadu Pollution Control Board (TNPCB)"
  | "Central Ground Water Board (CGWB)"
  | "Public Works Department (PWD)"
  | "Civic Response Squad";

export interface PriorityFactors {
  riskSeverity: number;        // 0-100
  exposure: number;            // 0-100
  urgency: number;             // 0-100
  modelConfidence: number;     // 0-100
  populationImpact: number;    // 0-100
}

export interface ActionRecommendation {
  id: string;
  sourceIncidentId: string;    // Linked event/incident (e.g. "evt_E1028", "firka_south")
  title: string;               // e.g. "Inspect Drain Segment D-183"
  recommendedAction: string;   // Structured action description
  responsibleDepartment: DepartmentRole;
  urgency: string;             // e.g. "Within 24 hours", "Immediate (6 Hours)"
  
  // Priority Scoring
  riskScore: number;           // 0.00 to 1.00
  priorityScore: number;       // 0 to 100
  priorityFactors: PriorityFactors;
  reason: string;              // Structured cause/factor explanation
  
  // Status & Verification
  status: ActionStatus;
  timestamp: string;
  evidenceReferences: string[]; // Ledger hashes or telemetry station IDs
  verificationStatus: string;  // e.g. "SHA-256 Cryptographic Ledger Verified"
  assignedTo?: string;
  actionNotes?: string;
}
