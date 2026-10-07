import { Alert } from "./types";
export function alertDisposition(alert: Pick<Alert, "grade" | "confidence">, threshold = 0.8) { return alert.grade === "A_MEASURED" && alert.confidence >= threshold ? "Enforcement-grade" : alert.grade === "B_MODELLED" ? "Advisory" : "Demo/Scenario only"; }
