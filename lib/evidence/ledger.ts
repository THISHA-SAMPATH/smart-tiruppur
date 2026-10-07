import { createHash } from "crypto";
import { Alert } from "./types";
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function chainAlert(alert: Omit<Alert, "hash" | "prevHash">, prevHash: string | null): Alert { const payload = { ...alert, prevHash }; return { ...payload, hash: digest(payload) }; }
export function verifyChain(alerts: Alert[]) { let previous: string | null = null; for (const alert of alerts) { const { hash, ...payload } = alert; if (alert.prevHash !== previous || digest(payload) !== hash) return false; previous = hash; } return true; }
