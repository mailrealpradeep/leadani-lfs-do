import { test, expect, type Page, type Route } from "@playwright/test";
import { Client } from "pg";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

// E2E coverage for the WhatsApp inline composer optimistic bubble flow that
// was added to the lead drawer in `client/src/components/lead-detail-drawer.tsx`
// and `client/src/components/whatsapp-inline-composer.tsx`.
//
// The test seeds a real company + user (so the JWT auth middleware accepts
// requests) and then stubs all WhatsApp / hot-leads / lead-detail endpoints
// with Playwright route handlers. This lets us exercise the optimistic UI
// without depending on Wauper / Meta.

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:5000";
const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required to run e2e");

const SUFFIX = randomUUID().slice(0, 8);
const COMPANY_ID = randomUUID();
const USER_ID = randomUUID();
const SHEET_ID = randomUUID();
const LEAD_ID = randomUUID();
const USER_EMAIL = `wa-bubble-e2e-${SUFFIX}@example.test`;
const USER_PASSWORD = "Password123!";
const RECIPIENT = "9198765" + SUFFIX.slice(0, 5);
const SENDER = "9111111" + SUFFIX.slice(0, 5);

let token: string;
let db: Client;

test.beforeAll(async () => {
  db = new Client({ connectionString: DATABASE_URL });
  await db.connect();

  const passwordHash = await bcrypt.hash(USER_PASSWORD, 10);

  await db.query(
    `INSERT INTO companies (id, name, slug, settings, status)
     VALUES ($1, $2, $3, $4::json, 'active')`,
    [COMPANY_ID, `WA Bubble Co ${SUFFIX}`, `wa-bubble-${SUFFIX}`, JSON.stringify({})]
  );

  await db.query(
    `INSERT INTO users (id, company_id, name, email, password_hash, role, is_active)
     VALUES ($1, $2, $3, $4, $5, 'company_admin', true)`,
    [USER_ID, COMPANY_ID, `Bubble Tester ${SUFFIX}`, USER_EMAIL, passwordHash]
  );

  await db.query(
    `INSERT INTO sheets (id, company_id, name, owner_id, is_personal, visibility, settings)
     VALUES ($1, $2, $3, $4, false, 'company', $5::json)`,
    [SHEET_ID, COMPANY_ID, `WA Sheet ${SUFFIX}`, USER_ID, JSON.stringify({})]
  );

  // Log in via the real auth route to obtain a valid JWT.
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: USER_EMAIL, password: USER_PASSWORD }),
  });
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
  }
  const loginJson = (await loginRes.json()) as { token: string };
  token = loginJson.token;
});

test.afterAll(async () => {
  if (db) {
    // Cascade through company -> users / sheets / leads.
    await db.query(`DELETE FROM companies WHERE id = $1`, [COMPANY_ID]);
    await db.end();
  }
});

// Mutable mock state, reset per test.
type SendOutcome = { ok: boolean; status?: number; error?: string; delayMs?: number };

interface MockWhatsAppMessage {
  id: string;
  lead_id: string;
  direction: "inbound" | "outbound" | "incoming" | "outgoing";
  message_type: "text" | "template";
  body_text: string;
  status: "sent" | "delivered" | "read" | "failed";
  from_phone: string;
  to_phone: string;
  created_at: string;
}

let nextSendOutcome: SendOutcome;
let waMessages: MockWhatsAppMessage[];

function makeLeadResponse() {
  return {
    id: LEAD_ID,
    sheet_id: SHEET_ID,
    sheet_name: `WA Sheet ${SUFFIX}`,
    owner_user_id: USER_ID,
    custom_fields: {
      "Customer Name": "Acme Corp Lead",
      Mobile: RECIPIENT,
    },
    meta: {},
    deleted_at: null,
    deleted_by_user_id: null,
    attended_at: null,
    attended_by_user_id: null,
    ai_rating: "Hot",
    ai_rating_score: 5,
    ai_rating_summary: "Test hot lead",
    ai_rating_details: null,
    ai_rating_updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function makeOptionsResponse() {
  return {
    options: [
      {
        display_phone_number: SENDER,
        phone_number_id: "PNID-1",
        user_id: USER_ID,
        user_name: "Bubble Tester",
        is_lead_owner: true,
        last_incoming_at: new Date(Date.now() - 60_000).toISOString(),
      },
    ],
    templates: [
      {
        call_response: "freeform_reply",
        label: "Freeform reply",
        template_type: "freeform" as const,
        enabled: true,
        body_text: "Hi {{customer_name}}, this is {{executive_name}} from {{company_name}}.",
      },
    ],
    context: {
      executive_name: "Bubble Tester",
      company_name: `WA Bubble Co ${SUFFIX}`,
      lead_id: LEAD_ID,
    },
    session_lookup_status: "ok",
  };
}

async function installRouteMocks(page: Page) {
  // Hot-leads listing — make our seeded lead show up there even though
  // there is no hot-lead config in the DB.
  await page.route("**/api/hot-leads*", (route: Route) => {
    if (route.request().method() !== "GET") return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        leads: [makeLeadResponse()],
        count: 1,
        config: { id: "cfg", is_active: true, conditions: [{}], logical_operator: "AND" },
      }),
    });
  });
  await page.route("**/api/hot-leads/count*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ count: 1 }) })
  );

  // Lead detail endpoints used by the drawer.
  await page.route(`**/api/leads/${LEAD_ID}`, (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(makeLeadResponse()),
    });
  });
  await page.route(`**/api/leads/${LEAD_ID}/updates*`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );
  await page.route(`**/api/sheets/${SHEET_ID}/columns*`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );

  // The three composer endpoints under test.
  await page.route(`**/api/leads/${LEAD_ID}/send-whatsapp/options*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(makeOptionsResponse()),
    })
  );

  await page.route(`**/api/leads/${LEAD_ID}/whatsapp-messages*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(waMessages),
    })
  );

  await page.route(`**/api/leads/${LEAD_ID}/send-whatsapp`, async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const outcome = nextSendOutcome;
    if (outcome.delayMs) {
      await new Promise((r) => setTimeout(r, outcome.delayMs));
    }
    if (!outcome.ok) {
      return route.fulfill({
        status: outcome.status ?? 502,
        contentType: "application/json",
        body: JSON.stringify({ error: outcome.error ?? "Upstream failed" }),
      });
    }
    // Success: synthesize the real outgoing message that the conversation
    // refetch will surface, so the optimistic bubble can be replaced by the
    // real bubble (`wa-message-meta-{id}`).
    const post = JSON.parse(route.request().postData() || "{}");
    const realId = `real_${randomUUID()}`;
    const msg: MockWhatsAppMessage = {
      id: realId,
      lead_id: LEAD_ID,
      direction: "outbound",
      message_type: "text",
      body_text: typeof post.message_text === "string" ? post.message_text : "",
      from_phone: SENDER,
      to_phone: RECIPIENT,
      status: "sent",
      created_at: new Date().toISOString(),
    };
    waMessages = [...waMessages, msg];
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message: msg }),
    });
  });
}

async function openLeadDrawer(page: Page) {
  const row = page.getByTestId(`row-lead-${LEAD_ID}`);
  await expect(row).toBeVisible({ timeout: 30_000 });
  // Desktop grid only opens the drawer via the row's actions dropdown.
  const actionsBtn = page.getByTestId(`button-actions-${LEAD_ID}`);
  await actionsBtn.scrollIntoViewIfNeeded();
  await actionsBtn.click();
  const viewBtn = page.getByTestId(`button-view-details-${LEAD_ID}`);
  await expect(viewBtn).toBeVisible({ timeout: 15_000 });
  await viewBtn.click();
  // Drawer composer should mount within a few seconds.
  await expect(page.getByTestId("composer-whatsapp-reply")).toBeVisible({
    timeout: 20_000,
  });
}

async function bootAuthedSession(page: Page) {
  // Inject the JWT into localStorage *before* the React app boots so the
  // auth context picks it up on first render.
  await page.addInitScript((t) => {
    window.localStorage.setItem("auth_token", t);
  }, token);
}

test.beforeEach(async ({ page }) => {
  waMessages = [];
  nextSendOutcome = {
    ok: false,
    status: 502,
    error: "Meta upstream rejected (mocked)",
    delayMs: 800,
  };
  await bootAuthedSession(page);
  await installRouteMocks(page);
});

test("optimistic Sending → Failed → Retry → real bubble", async ({ page }) => {
  await page.goto(`${BASE_URL}/hot-leads`);

  // Click into the lead from the hot-leads grid to open the drawer.
  await openLeadDrawer(page);

  const composer = page.getByTestId("composer-whatsapp-reply");
  await expect(composer).toBeVisible();

  // The composer prefills from the freeform template body — overwrite with
  // a deterministic value.
  const textarea = page.getByTestId("textarea-composer-message");
  await expect(textarea).not.toHaveValue("");
  const userText = "Hello from the bubble e2e test";
  await textarea.fill(userText);

  const sendBtn = page.getByTestId("button-composer-send");
  await expect(sendBtn).toBeEnabled();
  await sendBtn.click();

  // 1) Sending bubble appears immediately and textarea no longer holds the
  // user's typed content (it gets cleared / reverts to the template prefill).
  const sendingBadge = page.locator('[data-testid^="wa-pending-status-sending-"]').first();
  await expect(sendingBadge).toBeVisible();
  await expect(textarea).not.toHaveValue(userText);

  const pendingBubble = page.locator('[data-testid^="wa-pending-"]').first();
  const tempId = (await pendingBubble.getAttribute("data-testid"))!.replace("wa-pending-", "");
  expect(tempId.startsWith("temp_")).toBeTruthy();

  // 2) Server returned a failure → bubble flips to Failed with Retry visible.
  await expect(page.getByTestId(`wa-pending-status-failed-${tempId}`)).toBeVisible();
  await expect(page.getByTestId(`wa-pending-error-${tempId}`)).toContainText(
    "Meta upstream rejected (mocked)"
  );
  const retryBtn = page.getByTestId(`button-wa-pending-retry-${tempId}`);
  const discardBtn = page.getByTestId(`button-wa-pending-discard-${tempId}`);
  await expect(retryBtn).toBeVisible();
  await expect(discardBtn).toBeVisible();

  // 3) Flip the mock to success and click Retry. The real outgoing message
  // should appear and the optimistic bubble should disappear.
  nextSendOutcome = { ok: true };
  await retryBtn.click();

  const realBubble = page.locator('[data-testid^="wa-message-meta-real_"]').first();
  await expect(realBubble).toBeVisible();
  await expect(page.getByTestId(`wa-pending-${tempId}`)).toHaveCount(0);
});

test("optimistic Sending → success replaces bubble with real message", async ({ page }) => {
  nextSendOutcome = { ok: true, delayMs: 800 };
  await page.goto(`${BASE_URL}/hot-leads`);

  await openLeadDrawer(page);
  await expect(page.getByTestId("composer-whatsapp-reply")).toBeVisible();

  const textarea = page.getByTestId("textarea-composer-message");
  const userText = "Straight-to-success message";
  await textarea.fill(userText);
  await page.getByTestId("button-composer-send").click();

  // Sending bubble appeared and the user's typed content was cleared.
  await expect(page.locator('[data-testid^="wa-pending-status-sending-"]').first()).toBeVisible();
  await expect(textarea).not.toHaveValue(userText);

  // Real outgoing bubble shows up; optimistic bubble is removed.
  await expect(page.locator('[data-testid^="wa-message-meta-real_"]').first()).toBeVisible();
  await expect(page.locator('[data-testid^="wa-pending-temp_"]')).toHaveCount(0);
});
