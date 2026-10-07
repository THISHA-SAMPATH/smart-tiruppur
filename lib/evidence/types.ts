export type EvidenceGrade = "A_MEASURED" | "B_MODELLED" | "C_SIMULATED";
export type EvidenceInput = { sourceType: "MEASURED" | "MODELLED" | "SIMULATED" | "HISTORICAL"; observedAt?: string; missing?: boolean };
export interface Alert { id: string; entityId: string; severity: string; grade: EvidenceGrade; sources: EvidenceInput[]; confidence: number; createdAt: string; hash: string; prevHash: string | null; }
