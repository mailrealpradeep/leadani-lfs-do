// Integration test for the cross-process per-lead advisory lock used by
// `processInboundForIntake` (Task #125). Run with:
//
//   DATABASE_URL=... npx tsx server/saila-intake-engine.lock.itest.ts
//
// The lock is implemented as a Postgres SESSION-level advisory lock on a
// dedicated checked-out client. Two parallel `withLeadLock` calls each take
// their own client from the pool, which is operationally equivalent to two
// Node.js processes running against the same database — exactly the
// horizontal-scaling scenario this task is hardening against.

import { pool } from "./db";
import { withLeadLock } from "./saila-intake-engine";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set — skipping advisory-lock integration test.");
  process.exit(0);
}

let passed = 0;
let failed = 0;
function check(label: string, ok: boolean, detail?: string) {
  if (ok) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

(async () => {
  const sameLead = `it-lead-${Date.now()}`;

  console.log("\n[same-lead serialisation across two pool clients]");
  const events: Array<{ who: string; phase: "start" | "end"; t: number }> = [];

  const runA = withLeadLock(sameLead, async () => {
    events.push({ who: "A", phase: "start", t: Date.now() });
    await sleep(400);
    events.push({ who: "A", phase: "end", t: Date.now() });
  });

  // Tiny stagger so A wins the lock first, then B is forced to wait.
  await sleep(20);

  const runB = withLeadLock(sameLead, async () => {
    events.push({ who: "B", phase: "start", t: Date.now() });
    await sleep(50);
    events.push({ who: "B", phase: "end", t: Date.now() });
  });

  await Promise.all([runA, runB]);

  const aEnd = events.find((e) => e.who === "A" && e.phase === "end")!;
  const bStart = events.find((e) => e.who === "B" && e.phase === "start")!;
  check(
    "B does not start until A releases the lock (same lead)",
    bStart.t >= aEnd.t,
    `A ended at ${aEnd.t}, B started at ${bStart.t}`,
  );

  console.log("\n[different-lead concurrency is preserved]");
  const leadX = `it-lead-x-${Date.now()}`;
  const leadY = `it-lead-y-${Date.now()}`;
  const startedAt: Record<string, number> = {};
  const endedAt: Record<string, number> = {};

  await Promise.all([
    withLeadLock(leadX, async () => {
      startedAt.X = Date.now();
      await sleep(300);
      endedAt.X = Date.now();
    }),
    withLeadLock(leadY, async () => {
      startedAt.Y = Date.now();
      await sleep(300);
      endedAt.Y = Date.now();
    }),
  ]);

  // Two different leads must NOT serialise — their hold windows should overlap.
  const overlapStart = Math.max(startedAt.X, startedAt.Y);
  const overlapEnd = Math.min(endedAt.X, endedAt.Y);
  check(
    "Different leads run in parallel (lock is per-lead)",
    overlapEnd > overlapStart,
    `X: ${startedAt.X}-${endedAt.X}, Y: ${startedAt.Y}-${endedAt.Y}`,
  );

  console.log(`\n${passed} passed, ${failed} failed`);
  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
})().catch(async (err) => {
  console.error("integration test threw:", err);
  try { await pool.end(); } catch {}
  process.exit(1);
});
