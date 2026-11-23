// Lightweight production performance logging. Diagnostic only: nothing here
// changes behaviour. Disable with PERF_LOG=disabled.
//
//   [perf] slow visionTeam[…a1b2c3d4] 8912ms (bg)
//   [perf] event loop blocked 9400ms; active during stall: visionTeam[…a1b2c3d4](9410ms), …
//
// "event loop blocked" means the single Node thread ran synchronous code for
// that long, so every request from every user waited. The in-flight list shows
// which timed operations were running at that moment.
import { performance } from "node:perf_hooks";

const ENABLED = (process.env.PERF_LOG || "enabled").toLowerCase() !== "disabled";
const SLOW_MS = 500;
const LAG_MS = 500;
const TICK_MS = 250;

const inFlight = new Map<number, { label: string; start: number }>();
// Recently finished operations. Blocking code usually finishes before the
// monitor's timer can fire, so the stall report must also include operations
// that ended inside the stall window, not only those still running.
const recent: Array<{ label: string; start: number; end: number }> = [];
const RECENT_KEEP_MS = 60_000;
let seq = 0;

export async function timed<T>(label: string, fn: () => Promise<T> | T, note = ""): Promise<T> {
  if (!ENABLED) return fn();
  const id = ++seq;
  const start = performance.now();
  inFlight.set(id, { label, start });
  try {
    return await fn();
  } finally {
    inFlight.delete(id);
    const end = performance.now();
    recent.push({ label, start, end });
    while (recent.length > 0 && end - recent[0].end > RECENT_KEEP_MS) recent.shift();
    const ms = end - start;
    if (ms >= SLOW_MS) console.log(`[perf] slow ${label} ${Math.round(ms)}ms${note ? ` ${note}` : ""}`);
  }
}

let monitor: NodeJS.Timeout | null = null;

export function startEventLoopMonitor(): void {
  if (!ENABLED || monitor) return;
  let last = performance.now();
  monitor = setInterval(() => {
    const now = performance.now();
    const lag = now - last - TICK_MS;
    last = now;
    if (lag >= LAG_MS) {
      const stallStart = now - lag;
      const running = Array.from(inFlight.values())
        .map((op) => `${op.label}(${Math.round(now - op.start)}ms, running)`);
      const finished = recent
        .filter((op) => op.end >= stallStart)
        .map((op) => `${op.label}(${Math.round(op.end - op.start)}ms)`);
      const all = [...running, ...finished].slice(0, 12).join(", ");
      console.warn(`[perf] event loop blocked ${Math.round(lag)}ms; active during stall: ${all || "none (untimed code)"}`);
    }
  }, TICK_MS);
  monitor.unref();
}

export function stopEventLoopMonitor(): void {
  if (monitor) clearInterval(monitor);
  monitor = null;
}
