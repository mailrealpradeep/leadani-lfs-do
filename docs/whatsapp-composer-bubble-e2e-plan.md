# E2E test plan: WhatsApp inline composer optimistic bubble flow

This is the Playwright `runTest()` plan that exercises the optimistic
"Sending…" / "Failed" + Retry bubble flow added to the lead-detail drawer's
inline WhatsApp composer (`client/src/components/whatsapp-inline-composer.tsx`
and `client/src/components/lead-detail-drawer.tsx`).

It is intentionally heavy on browser-side route mocks so the test does not
depend on a live Wauper/Meta connection.

## What it covers

1. The composer renders inside the drawer and prefills from the configured
   freeform template.
2. Clicking Send adds an optimistic "Sending…" bubble immediately and clears
   the textarea, before the network round-trip completes.
3. A failed send turns the bubble red with an error message and surfaces
   Retry / Discard buttons.
4. Hitting Retry re-issues the request; on success the optimistic bubble is
   replaced by the real outgoing message returned from the conversation
   refetch.
5. A fresh send going straight to success transitions Sending → real bubble.

## Notes

- The drawer also has a separate "Send WhatsApp" header button that opens its
  own modal — that is **not** what this test covers. Always interact with the
  inline composer (`data-testid="composer-whatsapp-reply"`).
- The `/api/leads/:leadId/send-whatsapp/options` endpoint is still mocked in
  this test so we can exercise the optimistic UI without coupling to the
  template/Meta lookup chain. The underlying `getWhatsAppCloudConfig` storage
  method now exists, so the endpoint itself no longer 500s in production.

## Test plan

The full plan + technical context lives in the project's
`runTest()` invocation. Re-run with the same plan from the
`testing` skill any time the bubble flow changes.

Key selectors used:

- `row-lead-{id}` — opens the drawer
- `composer-whatsapp-reply` — inline composer wrapper
- `textarea-composer-message`, `button-composer-send`
- `wa-pending-{tempId}` — optimistic bubble wrapper
- `wa-pending-status-sending-{tempId}` — Sending… state
- `wa-pending-status-failed-{tempId}` — Failed state
- `wa-pending-error-{tempId}` — error text
- `button-wa-pending-retry-{tempId}`, `button-wa-pending-discard-{tempId}`
- `wa-message-meta-{messageId}` — real outgoing bubble line
