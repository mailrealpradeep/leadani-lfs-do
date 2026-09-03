// Saila Intake — 1-minute background tick for silence timeouts / fallback prompts / abandonment.

import { tickAllActiveSessions } from "./saila-intake-engine";
import { managedTimeout } from "./shutdown";

let started = false;
let timer: NodeJS.Timeout | null = null;
let running = false; // re-entrancy guard so overlapping ticks (>60s) don't double-send

export function startSailaIntakeScheduler(): void {
  if (started) return;
  started = true;
  // 15s interval so per-question silence_timeout values shorter than a minute
  // (e.g. 30s) can actually fire their fallback. The re-entrancy guard below
  // skips a tick if a previous one is still running.
  const intervalMs = 15_000;
  console.log("[Saila Intake] Starting tick scheduler (15-second interval)");
  managedTimeout(runOnce, 5_000);
  timer = setInterval(runOnce, intervalMs);
}

async function runOnce(): Promise<void> {
  if (running) {
    console.warn("[Saila Intake] Previous tick still running — skipping this interval");
    return;
  }
  running = true;
  try {
    const r = await tickAllActiveSessions();
    if (r.sentFallback > 0 || r.abandoned > 0) {
      console.log(`[Saila Intake] Tick: checked=${r.checked} fallback_sent=${r.sentFallback} abandoned=${r.abandoned}`);
    }
  } catch (err: any) {
    console.error("[Saila Intake] Tick scheduler error:", err.message);
  } finally {
    running = false;
  }
}

export function stopSailaIntakeScheduler(): void {
  if (timer) clearInterval(timer);
  timer = null;
  started = false;
}
