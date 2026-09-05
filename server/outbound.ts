// Egress guard for non-production deployments.
//
// The migration plan runs a staging deployment on a separate domain against a
// restore of the production database. That database carries live third-party
// credentials, so a staging boot would otherwise message real leads over
// WhatsApp, POST to the customer's real outgoing webhooks, and rewrite the 12
// real Google Sheets backup spreadsheets.
//
// Every call that leaves the building for a third party goes through
// `outboundSuppressed()` first. When OUTBOUND_INTEGRATIONS=disabled it logs
// what would have been sent and the caller returns its normal "did not send"
// result — no throw, so nothing upstream changes shape or retries.
//
// Deliberately NOT gated: Sarvam AI (read-only inference, no side effect anyone
// can observe) and Meta/Wauper token introspection during setup.

import { OUTBOUND_ENABLED } from "./config";

export type OutboundChannel =
  | "whatsapp"
  | "webhook"
  | "google-sheets"
  | "push";

/**
 * True when this deployment must not talk to the outside world.
 *
 * Logs one line per suppressed call, prefixed `[outbound:blocked]` so a staging
 * soak can be audited with a single grep — the absence of those lines on the
 * production deployment is equally the check that the switch is off there.
 */
export function outboundSuppressed(
  channel: OutboundChannel,
  target: string,
): boolean {
  if (OUTBOUND_ENABLED) return false;
  console.warn(`[outbound:blocked] ${channel} -> ${target}`);
  return true;
}

export { OUTBOUND_ENABLED };
