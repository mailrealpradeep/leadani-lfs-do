import { describe, it, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";

// Make sure storage.ts doesn't crash at import time without DATABASE_URL
// by routing it to the in-memory implementation.
delete process.env.DATABASE_URL;

import {
  sendWhatsAppApprovedTemplate,
  validateApprovedTemplateConfig,
  fetchApprovedTemplateMetadata,
} from "../saila-engine";
import type { SailaConfig, SailaPhoneSetting } from "@shared/schema";

const baseConfig: SailaConfig = {
  company_id: "test-company",
  wauper_domain: "https://crmapi.wauper.com",
  wauper_api_version: "v1",
} as unknown as SailaConfig;

const basePhone: SailaPhoneSetting = {
  id: "ps-1",
  company_id: "test-company",
  display_phone_number: "919999999999",
  access_token: "tok_valid",
  waba_phone_number_id: "12345",
} as unknown as SailaPhoneSetting;

type FetchArgs = { url: string; init: RequestInit };
let fetchCalls: FetchArgs[] = [];
const realFetch = global.fetch;

function mockFetch(impl: (url: string, init: RequestInit) => Promise<Response> | Response): void {
  global.fetch = (async (url: any, init: any) => {
    fetchCalls.push({ url: String(url), init: init as RequestInit });
    return impl(String(url), init as RequestInit);
  }) as unknown as typeof fetch;
}

afterEach(() => {
  fetchCalls = [];
  global.fetch = realFetch;
});

after(() => {
  global.fetch = realFetch;
});

describe("validateApprovedTemplateConfig", () => {
  it("returns null for non-approved templates", () => {
    assert.equal(
      validateApprovedTemplateConfig({ template_type: "freeform", approved_template_name: "" }),
      null,
    );
  });

  it("returns null when an approved template has a name", () => {
    assert.equal(
      validateApprovedTemplateConfig({
        template_type: "approved",
        approved_template_name: "welcome_v1",
      }),
      null,
    );
  });

  it("flags a missing approved_template_name", () => {
    const err = validateApprovedTemplateConfig({
      template_type: "approved",
      approved_template_name: "",
    });
    assert.equal(err, "Approved template name is not configured for this call response");
  });

  it("treats whitespace-only approved_template_name as missing", () => {
    const err = validateApprovedTemplateConfig({
      template_type: "approved",
      approved_template_name: "   ",
    });
    assert.equal(err, "Approved template name is not configured for this call response");
  });

  it("treats null approved_template_name as missing", () => {
    const err = validateApprovedTemplateConfig({
      template_type: "approved",
      approved_template_name: null,
    });
    assert.equal(err, "Approved template name is not configured for this call response");
  });
});

describe("sendWhatsAppApprovedTemplate", () => {
  it("returns failure (no fetch call) when access_token is missing", async () => {
    let called = false;
    mockFetch(() => {
      called = true;
      return new Response("{}", { status: 200 });
    });
    const result = await sendWhatsAppApprovedTemplate(
      baseConfig,
      { ...basePhone, access_token: "" } as SailaPhoneSetting,
      "+919876543210",
      "welcome_v1",
      "en_US",
      [],
    );
    assert.equal(result.success, false);
    assert.match(String(result.error), /No access token/);
    assert.equal(called, false, "fetch must not be called when token is missing");
  });

  it("returns failure (no fetch call) when waba_phone_number_id is missing", async () => {
    let called = false;
    mockFetch(() => {
      called = true;
      return new Response("{}", { status: 200 });
    });
    const result = await sendWhatsAppApprovedTemplate(
      baseConfig,
      { ...basePhone, waba_phone_number_id: "" } as SailaPhoneSetting,
      "+919876543210",
      "welcome_v1",
      "en_US",
      [],
    );
    assert.equal(result.success, false);
    assert.match(String(result.error), /phone number ID/i);
    assert.equal(called, false);
  });

  it("returns success with messageId on a 200 response", async () => {
    mockFetch(() =>
      new Response(
        JSON.stringify({ messages: [{ id: "wamid.ABC123" }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const result = await sendWhatsAppApprovedTemplate(
      baseConfig,
      basePhone,
      "+91 98765 43210",
      "welcome_v1",
      "en_US",
      ["Asha"],
    );
    assert.equal(result.success, true);
    assert.equal(result.messageId, "wamid.ABC123");
    assert.equal(fetchCalls.length, 1);
    // Recipient digits cleaned
    const sent = JSON.parse(String(fetchCalls[0].init.body));
    assert.equal(sent.to, "919876543210");
    assert.equal(sent.template.name, "welcome_v1");
    assert.equal(sent.template.language.code, "en_US");
    assert.deepEqual(sent.template.components, [
      { type: "body", parameters: [{ type: "text", text: "Asha" }] },
    ]);
    // Authorization header set with bearer token
    const headers = (fetchCalls[0].init.headers ?? {}) as Record<string, string>;
    assert.equal(headers["Authorization"], "Bearer tok_valid");
  });

  it("propagates a Wauper / Meta 400 (e.g. template name typo or language mismatch)", async () => {
    mockFetch(() =>
      new Response(
        JSON.stringify({
          error: {
            code: 132001,
            message: "Template name does not exist in the translation",
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    );
    const result = await sendWhatsAppApprovedTemplate(
      baseConfig,
      basePhone,
      "+919876543210",
      "wrong_name",
      "fr_FR", // mismatched language vs. template's approved en_US
      [],
    );
    assert.equal(result.success, false);
    assert.match(String(result.error), /Wauper API error: 400/);
    assert.match(String(result.error), /Template name does not exist/);
    // Language code is forwarded so Meta is the one rejecting it
    const sent = JSON.parse(String(fetchCalls[0].init.body));
    assert.equal(sent.template.language.code, "fr_FR");
  });

  it("propagates a Wauper / Meta 401 (expired access token)", async () => {
    mockFetch(() =>
      new Response(
        JSON.stringify({ error: { message: "Session has expired" } }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    );
    const result = await sendWhatsAppApprovedTemplate(
      baseConfig,
      basePhone,
      "+919876543210",
      "welcome_v1",
      "en_US",
      [],
    );
    assert.equal(result.success, false);
    assert.match(String(result.error), /Wauper API error: 401/);
    assert.match(String(result.error), /Session has expired/);
  });

  it("returns failure when Wauper returns 200 but body has success: false", async () => {
    mockFetch(() =>
      new Response(
        JSON.stringify({ success: false, error: "rate limit" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const result = await sendWhatsAppApprovedTemplate(
      baseConfig,
      basePhone,
      "+919876543210",
      "welcome_v1",
      "en_US",
      [],
    );
    assert.equal(result.success, false);
    assert.match(String(result.error), /Wauper error: rate limit/);
  });

  it("returns failure when fetch itself throws (network error)", async () => {
    global.fetch = (async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    const result = await sendWhatsAppApprovedTemplate(
      baseConfig,
      basePhone,
      "+919876543210",
      "welcome_v1",
      "en_US",
      [],
    );
    assert.equal(result.success, false);
    assert.match(String(result.error), /ECONNREFUSED/);
  });
});

describe("fetchApprovedTemplateMetadata", () => {
  it("returns no_access_token when token is empty", async () => {
    const result = await fetchApprovedTemplateMetadata(baseConfig, "", "WABA1", "welcome_v1", "en_US");
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "no_access_token");
  });

  it("returns no_waba_id when waba_id is missing", async () => {
    const result = await fetchApprovedTemplateMetadata(baseConfig, "tok", "", "welcome_v1", "en_US");
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "no_waba_id");
  });

  it("counts {{N}} placeholders in BODY component for a matching language", async () => {
    mockFetch(() =>
      new Response(
        JSON.stringify({
          data: [
            {
              name: "welcome_v1",
              language: "en_US",
              components: [
                { type: "BODY", text: "Hi {{1}}, your code is {{2}} from {{3}}." },
              ],
            },
            {
              name: "welcome_v1",
              language: "hi",
              components: [{ type: "BODY", text: "Namaste {{1}}." }],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const result = await fetchApprovedTemplateMetadata(baseConfig, "tok", "WABA1", "welcome_v1", "en_US");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.expectedVariableCount, 3);
      assert.equal(result.matchedLanguage, "en_US");
    }
    const url = String(fetchCalls[0].url);
    assert.match(url, /\/WABA1\/message_templates\?name=welcome_v1/);
    assert.equal((fetchCalls[0].init.headers as any).Authorization, "Bearer tok");
  });

  it("returns not_found when the template name doesn't appear in Meta's response", async () => {
    mockFetch(() =>
      new Response(
        JSON.stringify({ data: [{ name: "other_template", language: "en_US", components: [] }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const result = await fetchApprovedTemplateMetadata(baseConfig, "tok", "WABA1", "welcome_v1", "en_US");
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "not_found");
  });

  it("returns not_found on HTTP 404", async () => {
    mockFetch(() => new Response("not found", { status: 404 }));
    const result = await fetchApprovedTemplateMetadata(baseConfig, "tok", "WABA1", "welcome_v1", "en_US");
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "not_found");
  });

  it("uses example.body_text when it exceeds the placeholder count", async () => {
    mockFetch(() =>
      new Response(
        JSON.stringify({
          data: [
            {
              name: "promo_v2",
              language: "en_US",
              components: [
                {
                  type: "BODY",
                  text: "Static greeting with no placeholders.",
                  example: { body_text: [["Alice", "10%", "April"]] },
                },
              ],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const result = await fetchApprovedTemplateMetadata(baseConfig, "tok", "WABA1", "promo_v2", "en_US");
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.expectedVariableCount, 3);
  });

  it("falls back to first match when language doesn't match exactly", async () => {
    mockFetch(() =>
      new Response(
        JSON.stringify({
          data: [
            {
              name: "welcome_v1",
              language: "hi",
              components: [{ type: "BODY", text: "Namaste {{1}}, welcome {{2}}." }],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const result = await fetchApprovedTemplateMetadata(baseConfig, "tok", "WABA1", "welcome_v1", "en_US");
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.expectedVariableCount, 2);
  });

  it("omits components when sendWhatsAppApprovedTemplate is called with no body parameters", async () => {
    mockFetch(() =>
      new Response(
        JSON.stringify({ messages: [{ id: "wamid.NOPARAMS" }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const result = await sendWhatsAppApprovedTemplate(
      baseConfig,
      basePhone,
      "+919876543210",
      "welcome_v1",
      "en_US",
      [],
    );
    assert.equal(result.success, true);
    const sent = JSON.parse(String(fetchCalls[0].init.body));
    assert.equal(sent.template.components, undefined);
  });
});
