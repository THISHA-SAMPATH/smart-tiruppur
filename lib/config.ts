// Base URLs for the two backend services this dashboard integrates.
// Override via .env.local (see .env.local.example) when ports differ,
// e.g. when running Haripriya's or Vamika's service on another machine.

export const LEDGER_BASE_URL =
  process.env.NEXT_PUBLIC_LEDGER_BASE_URL || "http://localhost:8000";

export const INFERENCE_BASE_URL =
  process.env.NEXT_PUBLIC_INFERENCE_BASE_URL || "http://localhost:8001";

/**
 * Vamika's ledger returns some URLs (e.g. qr_url) as paths relative to her
 * own service, like "/units/unit_002/qr". Dropped straight into an <img src>,
 * a relative path resolves against *this* app's domain instead of hers and
 * 404s silently. This makes sure any such field is always absolute.
 */
export function resolveLedgerUrl(maybeRelative: string): string {
  if (/^https?:\/\//i.test(maybeRelative)) return maybeRelative;
  return `${LEDGER_BASE_URL}${maybeRelative.startsWith("/") ? "" : "/"}${maybeRelative}`;
}
