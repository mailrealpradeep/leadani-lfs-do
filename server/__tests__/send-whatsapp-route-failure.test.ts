import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { AddressInfo } from "node:net";

// Use MemStorage (no DB connection)
delete process.env.DATABASE_URL;
process.env.JWT_SECRET = "test-jwt-secret";
// Silence the noisy seed-time logs that fire inside registerRoutes.
const origLog = console.log;
const origErr = console.error;

let baseUrl = "";
let server: import("http").Server;
let companyId = "";
let userId = "";
let leadId = "";
let token = "";
const realFetch = global.fetch;
let lastFetchUrl = "";

before(async () => {
  console.log = () => {};
  console.error = () => {};

  const { default: express } = await import("express");
  const { storage } = await import("../storage");
  const { generateToken } = await import("../middleware/auth");
  const { registerRoutes } = await import("../routes");

  // Patch in just the WhatsApp-flavoured methods MemStorage stubs out
  // (it throws "WhatsApp not implemented in MemStorage"), so the real
  // route handler can run end-to-end against in-memory state.
  const wamLogs: any[] = [];
  (storage as any).getSailaPhoneSettingByNumber = async () => ({
    id: "ps-1",
    company_id: companyId,
    display_phone_number: "919999999999",
    access_token: "tok_will_expire",
    waba_phone_number_id: "12345",
  });
  (storage as any).getWhatsAppAllocations = async () => [
    { id: "alloc-1", company_id: companyId, display_phone_number: "919999999999", enabled: true },
  ];
  (storage as any).getWhatsAppMessageTemplates = async () => [
    {
      id: "tpl-1",
      company_id: companyId,
      call_response: "discussed",
      template_type: "approved",
      body_text: "",
      approved_template_name: "welcome_v1",
      approved_template_language: "en_US",
      approved_template_variables: [],
      enabled: true,
    },
  ];
  (storage as any).getSailaConfig = async () => ({
    company_id: companyId,
    wauper_domain: "https://crmapi.wauper.com",
    wauper_api_version: "v1",
  });
  (storage as any).createWhatsAppMessageLog = async (log: any) => {
    wamLogs.push(log);
    return { ...log, id: "log-" + wamLogs.length };
  };
  (storage as any).__wamLogs = wamLogs;

  // Seed company + admin user + sheet + lead with phone
  const company = await storage.createCompany({ name: "Acme" } as any);
  companyId = company.id;
  const admin = await storage.createUser({
    email: "exec@acme.test",
    name: "Exec",
    password_hash: "x",
    role: "company_admin",
    company_id: companyId,
  } as any);
  userId = admin.id;
  const sheet = await storage.createSheet({
    name: "Leads",
    company_id: companyId,
    owner_id: userId,
    visibility: "company",
    is_personal: false,
    custom_columns: [],
  } as any);
  const lead = await storage.createLead({
    sheet_id: sheet.id,
    owner_user_id: userId,
    custom_fields: { full_name: "Asha", mobile_no: "9876543210" },
  } as any);
  leadId = lead.id;
  token = generateToken(userId, "company_admin", companyId);

  const app = express();
  app.use(express.json());
  await registerRoutes(app);
  server = app.listen(0);
  await new Promise<void>((r) => server.once("listening", () => r()));
  const addr = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  global.fetch = realFetch;
  await new Promise<void>((r) => server.close(() => r()));
  console.log = origLog;
  console.error = origErr;
});

async function postSend(body: any): Promise<{ status: number; json: any }> {
  // Use real fetch to talk to the express server (we only mock outbound to Wauper)
  const res = await realFetch(`${baseUrl}/api/leads/${leadId}/send-whatsapp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function mockOutboundFetch(handler: (url: string, init: RequestInit) => Response) {
  global.fetch = (async (url: any, init: any) => {
    const u = String(url);
    // Only intercept calls to Wauper; let test->express round-trips use real fetch.
    if (u.includes("/api/meta/")) {
      lastFetchUrl = u;
      return handler(u, init as RequestInit);
    }
    return realFetch(url, init);
  }) as unknown as typeof fetch;
}

describe("POST /api/leads/:leadId/send-whatsapp — failure paths (behavioral)", () => {
  it("returns 502 on Wauper 401 and does NOT create a lead_updates row", async () => {
    const { storage } = await import("../storage");
    mockOutboundFetch(() =>
      new Response(
        JSON.stringify({ error: { message: "Session has expired" } }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    );

    const before = (await storage.getLeadUpdates(leadId)).length;
    const res = await postSend({
      call_response: "discussed",
      send_from_phone: "919999999999",
      recipient_phone: "9876543210",
    });
    const after = (await storage.getLeadUpdates(leadId)).length;

    assert.equal(res.status, 502);
    assert.match(String(res.json.error), /401/);
    assert.match(String(res.json.error), /Session has expired/);
    assert.equal(after, before, "lead_updates row must NOT be created on Wauper failure");
    // The failed attempt is still recorded in the message log for audit
    const wamLogs = (storage as any).__wamLogs as any[];
    const last = wamLogs[wamLogs.length - 1];
    assert.equal(last.outcome, "send_failed");
  });

  it("returns 400 when approved template name is missing, no Wauper call, no lead_updates row", async () => {
    const { storage } = await import("../storage");
    let outboundCalls = 0;
    mockOutboundFetch(() => {
      outboundCalls++;
      return new Response("{}", { status: 200 });
    });
    // Swap the template list to expose a misconfigured (blank-name) approved template.
    const prev = (storage as any).getWhatsAppMessageTemplates;
    (storage as any).getWhatsAppMessageTemplates = async () => [
      {
        id: "tpl-bad",
        company_id: companyId,
        call_response: "discussed",
        template_type: "approved",
        body_text: "",
        approved_template_name: "   ",
        approved_template_language: "en_US",
        approved_template_variables: [],
        enabled: true,
      },
    ];
    try {
      const before = (await storage.getLeadUpdates(leadId)).length;
      const res = await postSend({
        call_response: "discussed",
        send_from_phone: "919999999999",
        recipient_phone: "9876543210",
      });
      const after = (await storage.getLeadUpdates(leadId)).length;

      assert.equal(res.status, 400);
      assert.match(String(res.json.error), /Approved template name is not configured/);
      assert.equal(outboundCalls, 0, "Wauper must NOT be contacted when config is invalid");
      assert.equal(after, before, "lead_updates row must NOT be created");
    } finally {
      (storage as any).getWhatsAppMessageTemplates = prev;
    }
  });

  it("returns 502 on Wauper 400 (mismatched language) and does NOT create a lead_updates row", async () => {
    const { storage } = await import("../storage");
    // Configure the template with a language Meta will reject.
    const prev = (storage as any).getWhatsAppMessageTemplates;
    (storage as any).getWhatsAppMessageTemplates = async () => [
      {
        id: "tpl-lang",
        company_id: companyId,
        call_response: "discussed",
        template_type: "approved",
        body_text: "",
        approved_template_name: "welcome_v1",
        approved_template_language: "fr_FR",
        approved_template_variables: [],
        enabled: true,
      },
    ];
    let sentLanguage = "";
    mockOutboundFetch((_url, init) => {
      try {
        const body = JSON.parse(String(init.body));
        sentLanguage = body?.template?.language?.code ?? "";
      } catch {}
      return new Response(
        JSON.stringify({ error: { message: "Template name does not exist in the translation" } }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    });
    try {
      const before = (await storage.getLeadUpdates(leadId)).length;
      const res = await postSend({
        call_response: "discussed",
        send_from_phone: "919999999999",
        recipient_phone: "9876543210",
      });
      const after = (await storage.getLeadUpdates(leadId)).length;

      assert.equal(res.status, 502);
      assert.match(String(res.json.error), /400/);
      assert.match(String(res.json.error), /Template name does not exist/);
      assert.equal(sentLanguage, "fr_FR", "Configured language must be forwarded to Wauper");
      assert.equal(after, before, "lead_updates row must NOT be created on Wauper failure");
    } finally {
      (storage as any).getWhatsAppMessageTemplates = prev;
    }
  });
});
