import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveExecutiveBusinessPhone } from "../whatsapp-executive-phone";
import type { WhatsAppAllocationRecord, WhatsAppAllocationSplit } from "@shared/schema";

function alloc(partial: Partial<WhatsAppAllocationRecord>): WhatsAppAllocationRecord {
  return {
    id: partial.id ?? "alloc-id",
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
    id: partial.id ?? "split-id",
    company_id: "co",
    display_phone_number: partial.display_phone_number ?? "919777219901",
    user_id: partial.user_id ?? "u-ankita",
    sheet_id: partial.sheet_id ?? "sheet-shared",
    percentage: partial.percentage ?? 50,
    created_at: new Date(),
  };
}

describe("resolveExecutiveBusinessPhone — {executive_mobno} resolution rules", () => {
  it("returns '' when ownerUserId is null/undefined", () => {
    assert.equal(
      resolveExecutiveBusinessPhone({
        ownerUserId: null,
        leadSheetId: "sheet-ankita",
        allocations: [alloc({})],
        splitsByPhone: {},
      }),
      "",
    );
  });

  it("Rule 1: prefers single-user allocation matching (user, lead.sheet)", () => {
    const allocations = [
      alloc({ display_phone_number: "918249344757", user_id: "u-ankita", sheet_id: "sheet-ankita" }),
      alloc({ display_phone_number: "919999999999", user_id: "u-ankita", sheet_id: "sheet-other" }),
    ];
    assert.equal(
      resolveExecutiveBusinessPhone({
        ownerUserId: "u-ankita",
        leadSheetId: "sheet-ankita",
        allocations,
        splitsByPhone: {},
      }),
      "918249344757",
    );
  });

  it("Rule 2: falls back to single-user allocation on any sheet (lowest phone wins)", () => {
    const allocations = [
      alloc({ display_phone_number: "919999999999", user_id: "u-ankita", sheet_id: "sheet-other" }),
      alloc({ display_phone_number: "918888888888", user_id: "u-ankita", sheet_id: "sheet-third" }),
    ];
    assert.equal(
      resolveExecutiveBusinessPhone({
        ownerUserId: "u-ankita",
        leadSheetId: "sheet-ankita", // no exact match
        allocations,
        splitsByPhone: {},
      }),
      "918888888888",
    );
  });

  it("skips disabled single-user allocations", () => {
    const allocations = [
      alloc({ display_phone_number: "918249344757", user_id: "u-ankita", sheet_id: "sheet-ankita", enabled: false }),
    ];
    assert.equal(
      resolveExecutiveBusinessPhone({
        ownerUserId: "u-ankita",
        leadSheetId: "sheet-ankita",
        allocations,
        splitsByPhone: {},
      }),
      "",
    );
  });

  it("skips single-user allocations whose phone is in split mode (treats them as split)", () => {
    // Phone 919777219901 has split entries — its whatsapp_allocations row's user_id
    // is meaningless for {executive_mobno} resolution. We must use the splits table.
    const allocations = [
      alloc({ display_phone_number: "919777219901", user_id: "u-ankita", sheet_id: "sheet-shared" }),
    ];
    const splitsByPhone = {
      "919777219901": [
        split({ display_phone_number: "919777219901", user_id: "u-other", percentage: 60, sheet_id: "sheet-shared" }),
        split({ display_phone_number: "919777219901", user_id: "u-ankita", percentage: 40, sheet_id: "sheet-shared" }),
      ],
    };
    // Lead is on sheet-shared, owner = u-ankita. No single-user-only match exists,
    // so fall through to splits, which correctly returns 919777219901.
    assert.equal(
      resolveExecutiveBusinessPhone({
        ownerUserId: "u-ankita",
        leadSheetId: "sheet-shared",
        allocations,
        splitsByPhone,
      }),
      "919777219901",
    );
  });

  it("Rule 3: split allocation matching lead's sheet, highest percentage wins", () => {
    const allocations = [
      alloc({ display_phone_number: "919777219901", user_id: "u-other", sheet_id: "sheet-shared" }),
      alloc({ display_phone_number: "919437986561", user_id: "u-other", sheet_id: "sheet-shared" }),
    ];
    const splitsByPhone = {
      "919777219901": [
        split({ display_phone_number: "919777219901", user_id: "u-ankita", percentage: 60, sheet_id: "sheet-shared" }),
        split({ display_phone_number: "919777219901", user_id: "u-other", percentage: 40, sheet_id: "sheet-shared" }),
      ],
      "919437986561": [
        split({ display_phone_number: "919437986561", user_id: "u-ankita", percentage: 50, sheet_id: "sheet-shared" }),
        split({ display_phone_number: "919437986561", user_id: "u-other", percentage: 50, sheet_id: "sheet-shared" }),
      ],
    };
    assert.equal(
      resolveExecutiveBusinessPhone({
        ownerUserId: "u-ankita",
        leadSheetId: "sheet-shared",
        allocations,
        splitsByPhone,
      }),
      "919777219901", // 60% > 50%
    );
  });

  it("Rule 4: split on any sheet when no sheet-match", () => {
    const allocations = [
      alloc({ display_phone_number: "919777219901", user_id: "u-other", sheet_id: "sheet-other" }),
    ];
    const splitsByPhone = {
      "919777219901": [
        split({ display_phone_number: "919777219901", user_id: "u-ankita", percentage: 60, sheet_id: "sheet-other" }),
        split({ display_phone_number: "919777219901", user_id: "u-other", percentage: 40, sheet_id: "sheet-other" }),
      ],
    };
    assert.equal(
      resolveExecutiveBusinessPhone({
        ownerUserId: "u-ankita",
        leadSheetId: "sheet-ankita", // no sheet match
        allocations,
        splitsByPhone,
      }),
      "919777219901",
    );
  });

  it("skips splits whose parent allocation row is disabled", () => {
    const allocations = [
      alloc({ display_phone_number: "919777219901", user_id: "u-other", sheet_id: "sheet-shared", enabled: false }),
    ];
    const splitsByPhone = {
      "919777219901": [
        split({ display_phone_number: "919777219901", user_id: "u-ankita", percentage: 60, sheet_id: "sheet-shared" }),
      ],
    };
    assert.equal(
      resolveExecutiveBusinessPhone({
        ownerUserId: "u-ankita",
        leadSheetId: "sheet-shared",
        allocations,
        splitsByPhone,
      }),
      "",
    );
  });

  it("Rule 5: returns '' when no allocation references the executive at all", () => {
    const allocations = [
      alloc({ display_phone_number: "917978849875", user_id: "u-sasmita", sheet_id: "sheet-sasmita" }),
    ];
    assert.equal(
      resolveExecutiveBusinessPhone({
        ownerUserId: "u-ankita",
        leadSheetId: "sheet-ankita",
        allocations,
        splitsByPhone: {},
      }),
      "",
    );
  });

  it("UltraEasy Construction screenshot scenario: lead owned by Ankita on Ankita Leads sheet → her single-user line", () => {
    const allocations = [
      alloc({ display_phone_number: "919777219901", user_id: "u-x", sheet_id: "s-shared", enabled: true }), // split-mode parent
      alloc({ display_phone_number: "919437986561", user_id: "u-x", sheet_id: "s-shared", enabled: true }), // split-mode parent
      alloc({ display_phone_number: "917978849875", user_id: "u-sasmita", sheet_id: "s-sasmita", enabled: true }),
      alloc({ display_phone_number: "918249344757", user_id: "u-ankita", sheet_id: "s-ankita-leads", enabled: true }),
    ];
    const splitsByPhone = {
      "919777219901": [
        split({ display_phone_number: "919777219901", user_id: "u-ankita", percentage: 60, sheet_id: "s-shared" }),
        split({ display_phone_number: "919777219901", user_id: "u-subhasmita", percentage: 40, sheet_id: "s-shared" }),
      ],
      "919437986561": [
        split({ display_phone_number: "919437986561", user_id: "u-subhasmita", percentage: 50, sheet_id: "s-shared" }),
        split({ display_phone_number: "919437986561", user_id: "u-ankita", percentage: 50, sheet_id: "s-shared" }),
      ],
    };
    assert.equal(
      resolveExecutiveBusinessPhone({
        ownerUserId: "u-ankita",
        leadSheetId: "s-ankita-leads",
        allocations,
        splitsByPhone,
      }),
      "918249344757",
    );
  });
});
