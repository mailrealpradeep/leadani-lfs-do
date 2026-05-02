import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const storagePath = resolve(__dirname, "../storage.ts");
const routesPath = resolve(__dirname, "../routes.ts");
const storageSrc = readFileSync(storagePath, "utf8");
const routesSrc = readFileSync(routesPath, "utf8");

function sliceMethod(name: string): string {
  const start = storageSrc.indexOf(`async ${name}(`);
  assert.notEqual(start, -1, `Method ${name} not found in storage.ts`);
  const next = storageSrc.indexOf("\n  async ", start + 1);
  return storageSrc.slice(start, next === -1 ? storageSrc.length : next);
}

describe("getLastIncomingWhatsAppTimestamps — legacy phone format tolerance", () => {
  const methodSrc = sliceMethod("getLastIncomingWhatsAppTimestamps");

  it("compares the trailing 10 digits of sender_phone, not strict equality", () => {
    // The original bug: strict eq(sender_phone, last10) silently failed for
    // legacy rows stored as the full international number (e.g.
    // "919438743969") even though the customer had messaged minutes ago,
    // causing the Send WhatsApp dialog to wrongly say "Session closed".
    // The fix uses RIGHT(REGEXP_REPLACE(sender_phone, '[^0-9]', '', 'g'), 10).
    assert.match(
      methodSrc,
      /RIGHT\(REGEXP_REPLACE\(\$\{[^}]*\.sender_phone\},\s*'\[\^0-9\]',\s*'',\s*'g'\),\s*10\)\s*=\s*\$\{senderPhoneLast10\}/,
      "expected the lookup to compare the trailing 10 digits via RIGHT(REGEXP_REPLACE(...))",
    );
  });

  it("must NOT use strict equality on raw sender_phone (regression guard)", () => {
    // Reverting to eq(sender_phone, last10) re-introduces the original bug.
    assert.doesNotMatch(
      methodSrc,
      /eq\([^)]*\.sender_phone,\s*senderPhoneLast10\)/,
      "strict equality on sender_phone reintroduces the legacy false-Session-closed bug",
    );
  });

  it("still scopes the query to the company, incoming direction and chosen senders", () => {
    // The fix must not weaken any of the other predicates.
    assert.match(methodSrc, /eq\([^)]*\.company_id,\s*companyId\)/);
    assert.match(methodSrc, /eq\([^)]*\.direction,\s*'incoming'\)/);
    assert.match(methodSrc, /inArray\([^)]*\.display_phone_number,\s*displayPhoneNumbers\)/);
  });

  it("returns the MAX(processed_at) per display_phone_number", () => {
    assert.match(methodSrc, /MAX\(\$\{[^}]*\.processed_at\}\)/);
    assert.match(methodSrc, /\.groupBy\([^)]*\.display_phone_number\)/);
  });
});

describe("Incoming WhatsApp webhooks — write last-10 digits to sender_phone", () => {
  it("Meta Cloud webhook normalises message.from to last 10 digits", () => {
    // The Meta Cloud webhook used to write the raw international number into
    // sender_phone, breaking the schema contract ("last 10 digits"). The fix
    // computes fromLast10 once and uses it for sender_phone while preserving
    // the raw value in sender_wa_id.
    assert.match(
      routesSrc,
      /const\s+fromRaw\s*=\s*message\.from\s*\|\|\s*""\s*;\s*const\s+fromLast10\s*=\s*String\(fromRaw\)\.replace\(\/\\D\/g,\s*""\)\.slice\(-10\)\s*;/,
    );
    assert.match(
      routesSrc,
      /sender_phone:\s*fromLast10,\s*sender_name:\s*contact\.profile\?\.name\s*\|\|\s*null,\s*sender_wa_id:\s*fromRaw/,
    );
  });

  it("Wauper alternate-format webhook normalises msg.from to last 10 digits", () => {
    // The Wauper alternate-format handler had the same bug; the fix uses the
    // fromLast10Alt local computed from msg.from || payload.from.
    assert.match(
      routesSrc,
      /const\s+fromRawAlt\s*=\s*msg\.from\s*\|\|\s*payload\.from\s*\|\|\s*""\s*;\s*const\s+fromLast10Alt\s*=\s*String\(fromRawAlt\)\.replace\(\/\\D\/g,\s*""\)\.slice\(-10\)\s*;/,
    );
    assert.match(
      routesSrc,
      /sender_phone:\s*fromLast10Alt,/,
    );
  });
});
