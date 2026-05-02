import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildSendFromOptions } from "../whatsapp-send-from-options";
import type { WhatsAppAllocationRecord, WhatsAppAllocationSplit } from "@shared/schema";

function alloc(partial: Partial<WhatsAppAllocationRecord>): WhatsAppAllocationRecord {
  return {
    id: partial.id ?? "alloc-" + Math.random().toString(36).slice(2, 8),
    company_id: "co",
    display_phone_number: partial.display_phone_number ?? "918249344757",
    user_id: partial.user_id ?? "u-ankita",
    sheet_id: partial.sheet_id ?? "sheet-ankita",
    enabled: partial.enabled ?? true,
    catch_all_enabled: partial.catch_all_enabled ?? false,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

function split(partial: Partial<WhatsAppAllocationSplit>): WhatsAppAllocationSplit {
  return {
    id: partial.id ?? "split-" + Math.random().toString(36).slice(2, 8),
    company_id: "co",
    display_phone_number: partial.display_phone_number ?? "919777219901",
    user_id: partial.user_id ?? "u-ankita",
    sheet_id: partial.sheet_id ?? "sheet-shared",
    percentage: partial.percentage ?? 50,
    created_at: new Date(),
  };
}

const NAMES = new Map<string, string | null>([
  ["u-ankita", "Ankita Swain"],
  ["u-subhasmita", "Subhasmita Rout"],
  ["u-sasmita", "Sasmita Patra"],
  ["u-pradeep", "Pradeep Behera"],
]);

describe("buildSendFromOptions — Send From dropdown rows", () => {
  it("single-user phone: uses parent row's user_name and applies (Lead Owner) when matches", () => {
    const result = buildSendFromOptions({
      ownerUserId: "u-sasmita",
      allocations: [alloc({ display_phone_number: "917978849875", user_id: "u-sasmita", sheet_id: "s-sasmita" })],
      splitsByPhone: {},
      connectedPhones: new Set(["917978849875"]),
      userNamesById: NAMES,
    });
    assert.deepEqual(result, [
      {
        display_phone_number: "917978849875",
        user_id: "u-sasmita",
        user_name: "Sasmita Patra",
        is_lead_owner: true,
      },
    ]);
  });

  it("single-user phone: skips disabled allocations", () => {
    const result = buildSendFromOptions({
      ownerUserId: "u-sasmita",
      allocations: [alloc({ display_phone_number: "917978849875", user_id: "u-sasmita", enabled: false })],
      splitsByPhone: {},
      connectedPhones: new Set(["917978849875"]),
      userNamesById: NAMES,
    });
    assert.deepEqual(result, []);
  });

  it("single-user phone: skips phones not in the connected set (no Saila phone settings)", () => {
    const result = buildSendFromOptions({
      ownerUserId: "u-sasmita",
      allocations: [alloc({ display_phone_number: "917978849875", user_id: "u-sasmita" })],
      splitsByPhone: {},
      connectedPhones: new Set(),
      userNamesById: NAMES,
    });
    assert.deepEqual(result, []);
  });

  it("single-user phone with multiple rows on different sheets: prefers lead-owner row", () => {
    const result = buildSendFromOptions({
      ownerUserId: "u-sasmita",
      allocations: [
        alloc({ display_phone_number: "917978849875", user_id: "u-pradeep", sheet_id: "s-other" }),
        alloc({ display_phone_number: "917978849875", user_id: "u-sasmita", sheet_id: "s-sasmita" }),
      ],
      splitsByPhone: {},
      connectedPhones: new Set(["917978849875"]),
      userNamesById: NAMES,
    });
    assert.equal(result.length, 1);
    assert.equal(result[0].user_id, "u-sasmita");
    assert.equal(result[0].is_lead_owner, true);
  });

  it("split-mode phone with stale parent row matching the lead owner: NO (Lead Owner) badge, label uses splits", () => {
    // Reproduces the All India Marine bug: 919437986561's parent row points to
    // Sasmita (lead owner) but the phone is 50/50 Ankita + Subhasmita.
    const result = buildSendFromOptions({
      ownerUserId: "u-sasmita",
      allocations: [
        alloc({ display_phone_number: "919437986561", user_id: "u-sasmita", sheet_id: "s-sasmita" }),
      ],
      splitsByPhone: {
        "919437986561": [
          split({ display_phone_number: "919437986561", user_id: "u-ankita", percentage: 50 }),
          split({ display_phone_number: "919437986561", user_id: "u-subhasmita", percentage: 50 }),
        ],
      },
      connectedPhones: new Set(["919437986561"]),
      userNamesById: NAMES,
    });
    assert.equal(result.length, 1);
    assert.equal(result[0].is_lead_owner, false, "stale parent user must not trigger Lead Owner badge");
    assert.equal(
      result[0].user_name,
      "Split: Ankita Swain 50% / Subhasmita Rout 50%",
      "label must list contributors (sorted by % desc, then user_id asc)",
    );
  });

  it("split-mode phone where lead owner IS a contributor: applies (Lead Owner) badge", () => {
    const result = buildSendFromOptions({
      ownerUserId: "u-ankita",
      allocations: [
        alloc({ display_phone_number: "919437986561", user_id: "u-ankita", sheet_id: "s-shared" }),
      ],
      splitsByPhone: {
        "919437986561": [
          split({ display_phone_number: "919437986561", user_id: "u-subhasmita", percentage: 60 }),
          split({ display_phone_number: "919437986561", user_id: "u-ankita", percentage: 40 }),
        ],
      },
      connectedPhones: new Set(["919437986561"]),
      userNamesById: NAMES,
    });
    assert.equal(result.length, 1);
    assert.equal(result[0].is_lead_owner, true);
    assert.equal(
      result[0].user_name,
      "Split: Subhasmita Rout 60% / Ankita Swain 40%",
      "highest percentage listed first",
    );
  });

  it("split label sorts by percentage desc, ties broken by user_id asc", () => {
    const result = buildSendFromOptions({
      ownerUserId: null,
      allocations: [alloc({ display_phone_number: "919437986561" })],
      splitsByPhone: {
        "919437986561": [
          split({ display_phone_number: "919437986561", user_id: "u-subhasmita", percentage: 50 }),
          split({ display_phone_number: "919437986561", user_id: "u-ankita", percentage: 50 }),
        ],
      },
      connectedPhones: new Set(["919437986561"]),
      userNamesById: NAMES,
    });
    assert.equal(
      result[0].user_name,
      "Split: Ankita Swain 50% / Subhasmita Rout 50%",
      "equal percentages tie-broken by user_id asc → 'u-ankita' before 'u-subhasmita'",
    );
  });

  it("split-mode phone whose parent allocation is disabled is skipped entirely", () => {
    const result = buildSendFromOptions({
      ownerUserId: "u-ankita",
      allocations: [
        alloc({ display_phone_number: "919437986561", user_id: "u-x", enabled: false }),
      ],
      splitsByPhone: {
        "919437986561": [
          split({ display_phone_number: "919437986561", user_id: "u-ankita", percentage: 100 }),
        ],
      },
      connectedPhones: new Set(["919437986561"]),
      userNamesById: NAMES,
    });
    assert.deepEqual(result, []);
  });

  it("sorted output: lead-owner phones first, then by phone ascending", () => {
    const result = buildSendFromOptions({
      ownerUserId: "u-sasmita",
      allocations: [
        alloc({ display_phone_number: "919999999999", user_id: "u-pradeep" }),
        alloc({ display_phone_number: "917978849875", user_id: "u-sasmita" }), // owner
        alloc({ display_phone_number: "918888888888", user_id: "u-pradeep" }),
      ],
      splitsByPhone: {},
      connectedPhones: new Set(["919999999999", "917978849875", "918888888888"]),
      userNamesById: NAMES,
    });
    assert.deepEqual(
      result.map((r) => r.display_phone_number),
      ["917978849875", "918888888888", "919999999999"],
    );
    assert.deepEqual(
      result.map((r) => r.is_lead_owner),
      [true, false, false],
    );
  });

  it("split contributor missing from userNamesById falls back to 'Unknown'", () => {
    const result = buildSendFromOptions({
      ownerUserId: null,
      allocations: [alloc({ display_phone_number: "919437986561" })],
      splitsByPhone: {
        "919437986561": [
          split({ display_phone_number: "919437986561", user_id: "u-ankita", percentage: 50 }),
          split({ display_phone_number: "919437986561", user_id: "u-deleted-user", percentage: 50 }),
        ],
      },
      connectedPhones: new Set(["919437986561"]),
      userNamesById: NAMES, // u-deleted-user is not in NAMES
    });
    assert.equal(
      result[0].user_name,
      "Split: Ankita Swain 50% / Unknown 50%",
    );
  });

  it("long split label gets truncated with ellipsis", () => {
    const splits = Array.from({ length: 8 }, (_, i) =>
      split({
        display_phone_number: "919437986561",
        user_id: `u-contributor-${i}`,
        percentage: Math.floor(100 / 8),
      }),
    );
    const names = new Map<string, string | null>(
      splits.map((s) => [s.user_id, `Contributor Number ${s.user_id.slice(-1)}`]),
    );
    const result = buildSendFromOptions({
      ownerUserId: null,
      allocations: [alloc({ display_phone_number: "919437986561" })],
      splitsByPhone: { "919437986561": splits },
      connectedPhones: new Set(["919437986561"]),
      userNamesById: names,
    });
    assert.ok(result[0].user_name!.length <= 80, "label is truncated to ≤80 chars");
    assert.ok(result[0].user_name!.endsWith("…"), "truncated label ends with ellipsis");
  });
});
