// Pure-helper unit tests for the Saila.AI keyword matcher contract (Task #127).
// Run with: npx tsx server/saila-keyword-match.test.ts
//
// These tests pin the engine's contract: each `saila_keywords.keyword` row
// MUST contain a single token. A row containing commas can never match because
// the engine compares the inbound message against the raw stored string.

let passed = 0;
let failed = 0;
function eq<T>(label: string, actual: T, expected: T) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}\n      actual=${JSON.stringify(actual)}\n      expected=${JSON.stringify(expected)}`);
    failed++;
  }
}

// Mirrors the matchKeyword loop body in server/saila-engine.ts (lines 144-167)
// without the storage call — the loop body itself is the contract under test.
function matches(stored: string, inbound: string, type: "exact" | "starts_with" | "contains"): boolean {
  const a = inbound.toLowerCase();
  const b = stored.toLowerCase();
  switch (type) {
    case "exact": return a === b;
    case "starts_with": return a.startsWith(b);
    case "contains": return a.includes(b);
  }
}

console.log("[matches — single-token rows match correctly]");
eq("exact: stored 'hi' matches inbound 'Hi'", matches("hi", "Hi", "exact"), true);
eq("exact: stored 'hi' does NOT match inbound 'Hi there'", matches("hi", "Hi there", "exact"), false);
eq("starts_with: stored 'hi' matches inbound 'Hi there'", matches("hi", "Hi there", "starts_with"), true);
eq("contains: stored 'hi' matches inbound 'oh Hi'", matches("hi", "oh Hi", "contains"), true);

console.log("\n[matches — comma-joined rows must NEVER match (Task #127 contract)]");
const polluted = "Hi, hi, Hii, Hiii, Hiiii, hii, hiii";
eq("exact: polluted row does NOT match 'Hi'", matches(polluted, "Hi", "exact"), false);
eq("starts_with: polluted row does NOT match 'Hi'", matches(polluted, "Hi", "starts_with"), false);
eq("contains: polluted row does NOT match 'Hi'", matches(polluted, "Hi", "contains"), false);
eq("exact: polluted row matches itself only (literal)", matches(polluted, polluted, "exact"), true);

console.log("\n[split-on-write — what the UI / repair must produce]");
function split(raw: string): string[] {
  return raw.split(",").map(k => k.trim()).filter(k => k.length > 0);
}
eq("split single token", split("hi"), ["hi"]);
eq("split with extra spaces", split(" Hi ,  hi ,Hii "), ["Hi", "hi", "Hii"]);
eq("split drops empty tokens", split("hi,,hii,"), ["hi", "hii"]);
eq("after split, every token matches inbound 'Hi' under contains/exact (case-insensitive)",
  split(polluted).filter(t => matches(t, "Hi", "contains")).length,
  // 'Hi','hi','Hii','Hiii','Hiiii','hii','hiii' — only Hi/hi (length 2) are
  // a substring of 'Hi' under case-insensitive contains; the longer ones aren't.
  2);
eq("after split, exact-match rows for inbound 'Hi'",
  split(polluted).filter(t => matches(t, "Hi", "exact")).length,
  2);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
