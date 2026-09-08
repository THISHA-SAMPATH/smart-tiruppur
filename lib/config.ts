// Base URLs for the two backend services this dashboard integrates.
// Override via .env.local (see .env.local.example) when ports differ,
// e.g. when running Haripriya's or Vamika's service on another machine.

export const LEDGER_BASE_URL =
  process.env.NEXT_PUBLIC_LEDGER_BASE_URL || "http://localhost:8000";

export const INFERENCE_BASE_URL =
  process.env.NEXT_PUBLIC_INFERENCE_BASE_URL || "http://localhost:8001";
