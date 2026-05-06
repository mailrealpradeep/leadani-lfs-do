// Pure-helper unit tests for the Saila Intake engine.
// Run with: npx tsx server/saila-intake-engine.test.ts (or via vitest if configured).

import {
  normalizeText,
  keywordMatches,
  isCancelMessage,
  flowAppliesToBusinessNumber,
  shouldStartNewSession,
  renderFallbackPrompt,
  decideFallbackTick,
  findNextUnansweredIndex,
  pickMatchingTrigger,
} from "./saila-intake-engine";

let passed = 0;
let failed = 0;

function eq<T>(label: string, actual: T, expected: T) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label} — expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
  }
}

console.log("\n[normalizeText]");
eq("trims+lowercases+collapses whitespace", normalizeText("  Hello   WORLD\t"), "hello world");

console.log("\n[keywordMatches]");
eq("contains: substring match (case-insensitive)", keywordMatches("Hi I want a PROPERTY in Mumbai", "property", "contains"), true);
eq("contains: no match", keywordMatches("Hello there", "property", "contains"), false);
eq("exact: exact-only", keywordMatches("Property", "property", "exact"), true);
eq("exact: substring fails", keywordMatches("a property", "property", "exact"), false);
eq("empty keyword never matches", keywordMatches("hi", "", "contains"), false);

console.log("\n[isCancelMessage]");
eq("matches cancel keyword anywhere", isCancelMessage("please STOP messaging me", ["stop", "cancel"]), true);
eq("no cancel keyword", isCancelMessage("yes please continue", ["stop", "cancel"]), false);
eq("empty cancel list", isCancelMessage("stop", []), false);

console.log("\n[flowAppliesToBusinessNumber]");
eq("empty list = applies to all", flowAppliesToBusinessNumber({ applied_business_numbers: [] } as any, "919999999999"), true);
eq("explicit match", flowAppliesToBusinessNumber({ applied_business_numbers: ["919999999999"] } as any, "919999999999"), true);
eq("explicit miss", flowAppliesToBusinessNumber({ applied_business_numbers: ["919999999999"] } as any, "918888888888"), false);

console.log("\n[shouldStartNewSession]");
eq("no existing → start", shouldStartNewSession(undefined, "flow-A"), true);
eq("completed existing → start", shouldStartNewSession({ status: "completed", flow_id: "flow-A" } as any, "flow-A"), true);
eq("abandoned existing → start", shouldStartNewSession({ status: "abandoned", flow_id: "flow-A" } as any, "flow-A"), true);
eq("active same-flow → DO NOT restart", shouldStartNewSession({ status: "active", flow_id: "flow-A" } as any, "flow-A"), false);
eq("active different-flow → start (new keyword overrides)", shouldStartNewSession({ status: "active", flow_id: "flow-A" } as any, "flow-B"), true);
eq("paused existing → start/resume eligible", shouldStartNewSession({ status: "paused", flow_id: "flow-A" } as any, "flow-A"), true);

console.log("\n[findNextUnansweredIndex]");
const qs = [
  { target_field: "name" } as any,
  { target_field: "budget" } as any,
  { target_field: "city" } as any,
];
eq("no fields answered → 0", findNextUnansweredIndex(qs, {}), 0);
eq("first answered → 1", findNextUnansweredIndex(qs, { name: "John" }), 1);
eq("first+second answered → 2", findNextUnansweredIndex(qs, { name: "John", budget: "50L" }), 2);
eq("all answered → length (signals done)", findNextUnansweredIndex(qs, { name: "J", budget: "5", city: "Mum" }), 3);
eq("middle gap still resumes at first gap (idempotent fill)", findNextUnansweredIndex(qs, { name: "J", city: "Mum" }), 1);
eq("empty-string treated as unanswered", findNextUnansweredIndex(qs, { name: "  " }), 0);

console.log("\n[pickMatchingTrigger]");
const trigA = { keyword: "buy", match_mode: "contains", flow: { enabled: true, applied_business_numbers: [], priority: 0 } } as any;
const trigB = { keyword: "sell property", match_mode: "contains", flow: { enabled: true, applied_business_numbers: [], priority: 5 } } as any;
const trigDisabled = { keyword: "rent", match_mode: "contains", flow: { enabled: false, applied_business_numbers: [], priority: 10 } } as any;
const trigOtherNumber = { keyword: "lease", match_mode: "contains", flow: { enabled: true, applied_business_numbers: ["919999999999"], priority: 10 } } as any;
eq("matches first applicable trigger", pickMatchingTrigger([trigB, trigA], "i want to BUY a flat", "918888")?.keyword, "buy");
eq("ignores disabled flows", pickMatchingTrigger([trigDisabled], "I want to rent a place", "918888"), null);
eq("ignores trigger when business number not in allowlist", pickMatchingTrigger([trigOtherNumber], "lease please", "918888"), null);
eq("respects allowlist on match", pickMatchingTrigger([trigOtherNumber], "lease please", "919999999999")?.keyword, "lease");
eq("no match → null", pickMatchingTrigger([trigA, trigB], "hello there", "918888"), null);

console.log("\n[renderFallbackPrompt]");
eq("substitutes {question} placeholder",
  renderFallbackPrompt("Hi! Just checking: {question}", "What is your budget?"),
  "Hi! Just checking: What is your budget?");
eq("template without placeholder returns template unchanged",
  renderFallbackPrompt("Are you still there?", "What is your budget?"),
  "Are you still there?");
eq("empty template falls back to question",
  renderFallbackPrompt("", "What is your budget?"),
  "What is your budget?");

console.log("\n[decideFallbackTick]");
const baseLast = new Date("2026-01-01T00:00:00Z");
const ten_min_later = new Date("2026-01-01T00:10:00Z");
const day_later = new Date("2026-01-02T00:00:00Z");

eq("not yet timed out → noop",
  decideFallbackTick({ lastActivityAt: baseLast, silenceTimeoutSeconds: 86400, fallbackAttempts: 0, maxFallbackAttempts: 2, now: ten_min_later }),
  { action: "noop", newAttempts: 0 });
eq("timed out, attempts under cap → send fallback",
  decideFallbackTick({ lastActivityAt: baseLast, silenceTimeoutSeconds: 600, fallbackAttempts: 0, maxFallbackAttempts: 2, now: ten_min_later }),
  { action: "send_fallback", newAttempts: 1 });
eq("timed out, attempts at cap → abandon",
  decideFallbackTick({ lastActivityAt: baseLast, silenceTimeoutSeconds: 600, fallbackAttempts: 2, maxFallbackAttempts: 2, now: ten_min_later }),
  { action: "abandon", newAttempts: 2 });
eq("default 24h timeout, 1 day later → send fallback",
  decideFallbackTick({ lastActivityAt: baseLast, silenceTimeoutSeconds: 86400, fallbackAttempts: 0, maxFallbackAttempts: 2, now: day_later }),
  { action: "send_fallback", newAttempts: 1 });

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
