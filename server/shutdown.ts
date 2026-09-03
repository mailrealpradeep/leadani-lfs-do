// Graceful shutdown.
//
// Coolify/Docker send SIGTERM on every redeploy. Without a handler the process
// dies immediately: in-flight requests are cut, the pg pool is never drained,
// and the session-level advisory locks taken by withLeadLock (see
// server/saila-intake-engine.ts) are only released when the backend notices the
// dead connection.
//
// This module owns the drain sequence and a registry for the intervals that are
// created inline in routes.ts and therefore have no stop function of their own.

import { type Server } from "node:http";

import type { Server as SocketIOServer } from "socket.io";

import { pool } from "./db";

function log(message: string) {
  console.log(`[shutdown] ${message}`);
}

// How long to let in-flight requests finish before forcing sockets closed.
const DRAIN_MS = 5_000;
// Absolute backstop. Must stay below the container's stop grace period (30s,
// set in docker-compose.yml / Coolify) or Docker SIGKILLs us mid-drain.
const SHUTDOWN_TIMEOUT_MS = 20_000;

// ---------------------------------------------------------------------------
// Managed timers
// ---------------------------------------------------------------------------

const timers = new Set<NodeJS.Timeout>();

/** setInterval whose handle is tracked so shutdown can clear it. */
export function managedInterval(
  fn: (...args: any[]) => void,
  ms: number,
): NodeJS.Timeout {
  const timer = setInterval(fn, ms);
  timers.add(timer);
  return timer;
}

/** setTimeout whose handle is tracked so shutdown can clear it. */
export function managedTimeout(
  fn: (...args: any[]) => void,
  ms: number,
): NodeJS.Timeout {
  const timer = setTimeout(() => {
    timers.delete(timer);
    fn();
  }, ms);
  timers.add(timer);
  return timer;
}

export function clearManagedTimers(): void {
  timers.forEach((timer) => {
    clearInterval(timer);
    clearTimeout(timer);
  });
  timers.clear();
}

// ---------------------------------------------------------------------------
// Drain sequence
// ---------------------------------------------------------------------------

let shuttingDown = false;

export function isShuttingDown(): boolean {
  return shuttingDown;
}

function withTimeout(promise: Promise<unknown>, ms: number, label: string) {
  return Promise.race([
    promise.catch((err) => log(`${label} failed: ${err?.message || err}`)),
    new Promise<void>((resolve) =>
      setTimeout(() => {
        log(`${label} timed out after ${ms}ms — continuing`);
        resolve();
      }, ms).unref(),
    ),
  ]);
}

async function drain(
  server: Server,
  io: SocketIOServer | null,
  stopFns: Array<() => void>,
  signal: string,
  exitCode = 0,
) {
  // Coolify can signal twice; the second one must not restart the sequence.
  if (shuttingDown) {
    log(`${signal} received while already draining — ignoring`);
    return;
  }
  shuttingDown = true;
  log(`${signal} received — draining`);

  // Hard backstop in case any step below hangs.
  const backstop = setTimeout(() => {
    log("drain exceeded the timeout — forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  backstop.unref();

  // 1. Stop starting new work. Deliberately *not* flipping /health to 503:
  //    at one replica there is nowhere to fail over, and an unhealthy container
  //    mid-drain confuses Coolify's deploy state machine.
  clearManagedTimers();
  for (const stop of stopFns) {
    try {
      stop();
    } catch (err: any) {
      log(`scheduler stop error: ${err?.message || err}`);
    }
  }
  log("schedulers stopped");

  // 2. Tell websocket clients to reconnect rather than leaving them hanging on
  //    a socket that is about to disappear.
  if (io) {
    try {
      io.disconnectSockets(true);
      log("socket.io clients disconnected");
    } catch (err: any) {
      log(`socket disconnect error: ${err?.message || err}`);
    }
  }

  // 3. Stop accepting connections and let in-flight requests finish. Traefik
  //    holds keep-alive sockets open, so idle ones must be closed explicitly or
  //    server.close() never resolves.
  await withTimeout(
    new Promise<void>((resolve) => {
      server.close(() => resolve());
      server.closeIdleConnections?.();
      setTimeout(() => server.closeAllConnections?.(), DRAIN_MS).unref();
    }),
    DRAIN_MS + 3_000,
    "http server close",
  );
  log("http server closed");

  // 4. Socket.io's close() also closes the attached http server, so it has to
  //    come after the step above or we lose control of the ordering.
  if (io) {
    await withTimeout(
      new Promise<void>((resolve) => io.close(() => resolve())),
      3_000,
      "socket.io close",
    );
  }

  // 5. Draining the pool is what releases any advisory lock still held.
  await withTimeout(pool.end(), 5_000, "pg pool drain");
  log("pg pool drained");

  clearTimeout(backstop);
  log("complete");
  process.exit(exitCode);
}

/**
 * Install signal and crash handlers. Call once, after server.listen().
 *
 * `io` may be null — the app boots fine without Socket.io in tests.
 * `stopFns` are the schedulers' own stop functions, passed in rather than
 * imported so this module stays free of cycles with the modules that use
 * managedInterval/managedTimeout.
 */
export function registerShutdown(
  server: Server,
  io: SocketIOServer | null,
  stopFns: Array<() => void> = [],
): void {
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => {
      void drain(server, io, stopFns, signal);
    });
  }

  // Node 20 defaults to --unhandled-rejections=throw, which turns a single
  // unawaited promise anywhere in the request handlers into a process kill.
  // Log and keep serving instead; a rejection is a bug, not a reason to drop
  // every connected user.
  process.on("unhandledRejection", (reason, promise) => {
    console.error("[FATAL] Unhandled rejection at:", promise, "reason:", reason);
    if (reason instanceof Error && reason.stack) console.error(reason.stack);
  });

  // An uncaught exception leaves the process in an unknown state, so here we do
  // exit — but through the same drain so the pool and sockets close cleanly.
  process.on("uncaughtException", (error) => {
    console.error("[FATAL] Uncaught exception:", error);
    if (error?.stack) console.error(error.stack);
    void drain(server, io, stopFns, "uncaughtException", 1);
  });
}
