import { EvidenceGrade, EvidenceInput } from "./types";
const rank = { A_MEASURED: 0, B_MODELLED: 1, C_SIMULATED: 2 } as const;
export function gradeEvidence(inputs: EvidenceInput[], now = new Date()): { grade: EvidenceGrade; confidence: number } {
  if (!inputs.length) return { grade: "C_SIMULATED", confidence: 0 };
  const grades = inputs.map((input) => input.sourceType === "MEASURED" ? "A_MEASURED" : input.sourceType === "MODELLED" || input.sourceType === "HISTORICAL" ? "B_MODELLED" : "C_SIMULATED" as EvidenceGrade);
  const grade = grades.sort((a, b) => rank[b] - rank[a])[0];
  const missing = inputs.filter((input) => input.missing).length / inputs.length;
  const ageHours = Math.max(0, ...inputs.map((input) => input.observedAt ? (now.getTime() - new Date(input.observedAt).getTime()) / 36e5 : 24));
  return { grade, confidence: Math.max(0, Math.min(1, (1 - missing) * Math.exp(-ageHours / 168))) };
}
