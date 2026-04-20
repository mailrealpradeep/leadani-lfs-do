import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const routesPath = resolve(__dirname, "../routes.ts");
const routesSrc = readFileSync(routesPath, "utf8");

function sliceRoute(name: string): string {
  const start = routesSrc.indexOf(`app.post("${name}"`);
  assert.notEqual(start, -1, `Route ${name} not found in routes.ts`);
  // Walk forward to the matching closing of the handler (next "app." or end of registerRoutes).
  const end = routesSrc.indexOf("\n  app.", start + 1);
  return routesSrc.slice(start, end === -1 ? routesSrc.length : end);
}

describe("POST /api/leads/:leadId/send-whatsapp — structural guarantees", () => {
  const routeSrc = sliceRoute("/api/leads/:leadId/send-whatsapp");

  it("uses validateApprovedTemplateConfig for missing-template-name pre-flight", () => {
    assert.match(routeSrc, /validateApprovedTemplateConfig/);
  });

  it("returns 502 with the engine error before ever touching createLeadUpdate", () => {
    const earlyReturn = routeSrc.indexOf('res.status(502)');
    const createLeadUpdate = routeSrc.indexOf('storage.createLeadUpdate(');
    assert.notEqual(earlyReturn, -1, "Expected 502 early return for failed sends");
    assert.notEqual(createLeadUpdate, -1, "Expected createLeadUpdate call");
    assert.ok(
      earlyReturn < createLeadUpdate,
      "createLeadUpdate must not be reachable when sendResult.success is false (the 502 early-return must come first)",
    );
  });

  it("returns 502 with the engine error before markLeadAttended / createAuditLog", () => {
    const earlyReturn = routeSrc.indexOf('res.status(502)');
    const markAttended = routeSrc.indexOf('storage.markLeadAttended(');
    const createAudit = routeSrc.indexOf('storage.createAuditLog(');
    assert.ok(earlyReturn < markAttended, "markLeadAttended must be unreachable on failure");
    assert.ok(earlyReturn < createAudit, "createAuditLog must be unreachable on failure");
  });

  it("forwards the configured approved_template_language to the engine", () => {
    // The handler reads tplLang from template.approved_template_language and passes it
    // as the 5th argument to sendWhatsAppApprovedTemplate. A regression that hard-coded
    // the language would break Meta's strict template-language matching.
    assert.match(
      routeSrc,
      /sendWhatsAppApprovedTemplate\(\s*config,\s*phoneSetting,\s*recipient_phone,\s*tplName,\s*tplLang,/,
    );
    assert.match(routeSrc, /tplLang\s*=\s*String\(template\.approved_template_language\b/);
  });

  it("propagates the engine's error string in the 502 response", () => {
    assert.match(
      routeSrc,
      /res\.status\(502\)\.json\(\{\s*error:\s*sendResult\.error/,
    );
  });

  it("records the failed attempt in the WhatsApp message log with outcome 'send_failed'", () => {
    // Audit trail: even on Wauper failure, an outgoing message log row is written
    // so admins can investigate from WhatsApp Lead Settings → Message Logs.
    assert.match(routeSrc, /outcome:\s*sendResult\.success\s*\?\s*"sent"\s*:\s*"send_failed"/);
  });
});
