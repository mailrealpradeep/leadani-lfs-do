import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deriveRecipientOutcome } from "../saila-broadcast-engine";
import {
  resolveRecipientsPure,
  throttleDelayMs,
} from "../saila-broadcast-storage";
import type {
  RawIncomingRow,
  RawOutgoingBroadcastRow,
} from "../saila-broadcast-storage";

const NOW = new Date("2026-05-14T12:00:00Z");
function hoursAgo(h: number): Date {
  return new Date(NOW.getTime() - h * 60 * 60 * 1000);
}

function inc(p: Partial<RawIncomingRow>): RawIncomingRow {
  return {
    sender_phone: p.sender_phone ?? "9438743969",
    sender_name: p.sender_name ?? null,
    lead_id: p.lead_id ?? null,
    processed_at: p.processed_at ?? hoursAgo(1),
  };
}
function out(p: Partial<RawOutgoingBroadcastRow>): RawOutgoingBroadcastRow {
  return {
    sender_phone: p.sender_phone ?? "9438743969",
    processed_at: p.processed_at ?? hoursAgo(1),
  };
}

describe("resolveRecipientsPure — session-open base set", () => {
  it("includes contacts whose latest incoming is < 24h", () => {
    const r = resolveRecipientsPure({
      incoming: [
        inc({ sender_phone: "9111111111", processed_at: hoursAgo(0.5), sender_name: "A" }),
        inc({ sender_phone: "9222222222", processed_at: hoursAgo(23), sender_name: "B" }),
      ],
      outgoingBroadcasts: [],
      cooldownHours: null,
      now: NOW,
    });
    assert.equal(r.sessionOpenCount, 2);
    assert.equal(r.recipients.length, 2);
    assert.equal(r.suppressedCount, 0);
  });

  it("excludes contacts whose latest incoming is >= 24h", () => {
    const r = resolveRecipientsPure({
      incoming: [
        inc({ sender_phone: "9111111111", processed_at: hoursAgo(24.01) }),
        inc({ sender_phone: "9222222222", processed_at: hoursAgo(48) }),
        inc({ sender_phone: "9333333333", processed_at: hoursAgo(2) }),
      ],
      outgoingBroadcasts: [],
      cooldownHours: null,
      now: NOW,
    });
    assert.deepEqual(r.recipients.map((x) => x.recipient_phone), ["9333333333"]);
  });

  it("dedupes multiple inbound rows per contact, keeping latest timestamp", () => {
    const r = resolveRecipientsPure({
      incoming: [
        inc({ sender_phone: "9111111111", processed_at: hoursAgo(10), sender_name: "Old" }),
        inc({ sender_phone: "9111111111", processed_at: hoursAgo(2), sender_name: "Recent" }),
        inc({ sender_phone: "9111111111", processed_at: hoursAgo(5), sender_name: "Mid" }),
      ],
      outgoingBroadcasts: [],
      cooldownHours: null,
      now: NOW,
    });
    assert.equal(r.recipients.length, 1);
    assert.equal(r.recipients[0].display_name, "Recent");
  });

  it("strips non-digits and uses last-10 for dedupe", () => {
    const r = resolveRecipientsPure({
      incoming: [
        inc({ sender_phone: "+91 94387 43969", processed_at: hoursAgo(1) }),
        inc({ sender_phone: "919438743969", processed_at: hoursAgo(2) }),
      ],
      outgoingBroadcasts: [],
      cooldownHours: null,
      now: NOW,
    });
    assert.equal(r.recipients.length, 1);
    assert.equal(r.recipients[0].recipient_phone, "9438743969");
  });

  it("drops contacts whose phone has fewer than 10 digits", () => {
    const r = resolveRecipientsPure({
      incoming: [
        inc({ sender_phone: "12345", processed_at: hoursAgo(1) }),
        inc({ sender_phone: "9111111111", processed_at: hoursAgo(1) }),
      ],
      outgoingBroadcasts: [],
      cooldownHours: null,
      now: NOW,
    });
    assert.equal(r.recipients.length, 1);
  });
});

describe("resolveRecipientsPure — cooldown filter", () => {
  const baseIncoming: RawIncomingRow[] = [
    inc({ sender_phone: "9111111111", processed_at: hoursAgo(1), sender_name: "Ann" }),
    inc({ sender_phone: "9222222222", processed_at: hoursAgo(2), sender_name: "Bob" }),
    inc({ sender_phone: "9333333333", processed_at: hoursAgo(3), sender_name: "Cat" }),
  ];

  for (const cooldown of [24, 48, 72, 168]) {
    it(`cooldown=${cooldown}h suppresses contacts with broadcast just inside window, keeps just outside`, () => {
      const r = resolveRecipientsPure({
        incoming: baseIncoming,
        outgoingBroadcasts: [
          out({ sender_phone: "9111111111", processed_at: hoursAgo(cooldown - 0.5) }), // inside → suppress
          out({ sender_phone: "9222222222", processed_at: hoursAgo(cooldown + 0.5) }), // outside → keep
        ],
        cooldownHours: cooldown,
        now: NOW,
      });
      const phones = new Set(r.recipients.map((x) => x.recipient_phone));
      assert.ok(!phones.has("9111111111"), `${cooldown}h: 9111... should be suppressed`);
      assert.ok(phones.has("9222222222"), `${cooldown}h: 9222... should be kept`);
      assert.ok(phones.has("9333333333"), `${cooldown}h: 9333... (no prior) should be kept`);
      assert.equal(r.sessionOpenCount, 3);
      assert.equal(r.suppressedCount, 1);
      assert.equal(r.recipients.length, 2);
    });
  }

  it("cooldown=null returns all session-open contacts, no suppression", () => {
    const r = resolveRecipientsPure({
      incoming: baseIncoming,
      outgoingBroadcasts: [
        out({ sender_phone: "9111111111", processed_at: hoursAgo(1) }),
      ],
      cooldownHours: null,
      now: NOW,
    });
    assert.equal(r.recipients.length, 3);
    assert.equal(r.suppressedCount, 0);
  });

  it("per-lead human sends (broadcast_id NULL) are passed in as zero outgoingBroadcasts and must NOT suppress", () => {
    // The DB query already filters to broadcast_id IS NOT NULL; the pure
    // helper just receives that pre-filtered list. So a contact whose only
    // prior outgoing was a per-lead human send (excluded upstream) is kept.
    const r = resolveRecipientsPure({
      incoming: baseIncoming,
      outgoingBroadcasts: [], // per-lead human sends already filtered out
      cooldownHours: 72,
      now: NOW,
    });
    assert.equal(r.recipients.length, 3);
    assert.equal(r.suppressedCount, 0);
  });
});

describe("throttleDelayMs — pacing math", () => {
  it("first message sends immediately", () => {
    assert.equal(throttleDelayMs({ index: 0, ratePerSec: 5, startedAt: 1000, now: 1000 }), 0);
  });

  it("at 5 msg/sec, message #5 expects 1000ms after start", () => {
    assert.equal(throttleDelayMs({ index: 5, ratePerSec: 5, startedAt: 1000, now: 1000 }), 1000);
  });

  it("if we are already late, returns 0 (no negative wait)", () => {
    assert.equal(throttleDelayMs({ index: 2, ratePerSec: 5, startedAt: 1000, now: 5000 }), 0);
  });

  it("ratePerSec=0 returns 0 (no throttle)", () => {
    assert.equal(throttleDelayMs({ index: 100, ratePerSec: 0, startedAt: 0, now: 0 }), 0);
  });

  it("at 5 msg/sec, message #25 should expect 5000ms after start", () => {
    assert.equal(throttleDelayMs({ index: 25, ratePerSec: 5, startedAt: 0, now: 0 }), 5000);
  });
});

describe("deriveRecipientOutcome — counter accumulation under partial failure", () => {
  // Both sides ok → sent. Both sides bad → failed. Either side bad → failed.
  // The "log-write failure demotes a successful WA send" path matters for
  // cooldown correctness — covered explicitly here.

  it("send ok + log ok → sent", () => {
    assert.deepEqual(deriveRecipientOutcome(true, true), { isSuccess: true, counter: "sent" });
  });

  it("send failed + log ok → failed (we still wrote a send_failed log row)", () => {
    assert.deepEqual(deriveRecipientOutcome(false, true), { isSuccess: false, counter: "failed" });
  });

  it("send ok BUT log write failed → demoted to failed (cooldown safety)", () => {
    assert.deepEqual(deriveRecipientOutcome(true, false), { isSuccess: false, counter: "failed" });
  });

  it("send failed AND log write failed → failed", () => {
    assert.deepEqual(deriveRecipientOutcome(false, false), { isSuccess: false, counter: "failed" });
  });

  it("simulated mixed batch: 5 sent, 2 transient send fails, 1 log-write fail → 5/3", () => {
    const batch: Array<[boolean, boolean]> = [
      [true, true], [true, true], [true, true], [true, true], [true, true],
      [false, true], [false, true],
      [true, false],
    ];
    let sent = 0, failed = 0;
    for (const [s, l] of batch) {
      const { counter } = deriveRecipientOutcome(s, l);
      if (counter === "sent") sent++; else failed++;
    }
    assert.equal(sent, 5);
    assert.equal(failed, 3);
    assert.equal(sent + failed, batch.length);
  });
});
