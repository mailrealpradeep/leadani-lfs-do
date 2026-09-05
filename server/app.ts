import { type Server } from "node:http";

import express, {
  type Express,
  type Request,
  Response,
  NextFunction,
} from "express";

import { registerRoutes } from "./routes";
import { registerShutdown } from "./shutdown";
import { stopBackupScheduler } from "./google-sheets-backup";
import { startSnapshotScheduler, stopSnapshotScheduler } from "./snapshot-scheduler";
import { startSailaIntakeScheduler, stopSailaIntakeScheduler } from "./saila-intake-scheduler";
import { startLogRetentionScheduler, stopLogRetentionScheduler } from "./log-retention";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export const app = express();

// Trust exactly one proxy hop (Coolify/Traefik, or any single reverse proxy in
// front of the app). Required for express-rate-limit to see real client IPs.
// 'true' would trust the leftmost X-Forwarded-For entry, which is
// client-supplied — that makes req.ip spoofable and lets anyone walk around the
// rate limiters. Verify after a hosting change: log req.ip from a known
// external IP and confirm it is not the proxy's internal address. Behind two
// hops (e.g. Cloudflare in front of Traefik) this becomes 2.
app.set('trust proxy', 1);

// CRITICAL: Register health check FIRST, before any other middleware or routes
// This ensures Autoscale deployments can verify the app is running immediately
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Also support /api/health for consistency
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
const jsonParser = express.json({
  limit: '15mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
});

// Notice PDF uploads arrive as base64 JSON and need a larger ceiling. Skip the
// global parser for that one route so the 30mb parser registered on it in
// server/routes/notice-routes.ts can actually run — body-parser short-circuits
// on req._body, so whichever parser runs first wins, and this one is registered
// at import time, long before the routes are. Raising the limit globally
// instead would let every endpoint buffer 30mb, which at one replica is an OOM
// vector. (/api/notice does not need rawBody; that is only read by the webhook
// signature check.)
app.use((req, res, next) =>
  req.method === 'POST' && req.path === '/api/notice'
    ? next()
    : jsonParser(req, res, next),
);
app.use(express.urlencoded({ extended: false, limit: '15mb' }));

app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

export default async function runApp(
  setup: (app: Express, server: Server) => Promise<void>,
) {
  log("Starting server initialization...");
  
  const port = parseInt(process.env.PORT || '5000', 10);
  
  try {
    log("Registering routes...");
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      console.error("Unhandled error:", err);
    });

    // importantly run the final setup after setting up all the other routes so
    // the catch-all route doesn't interfere with the other routes
    log("Running final setup...");
    await setup(app, server);

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    log(`Binding to 0.0.0.0:${port}...`);
    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      log(`Server is ready and listening on 0.0.0.0:${port}`);
      
      // Registered here, not before listen(), so the drain never runs against
      // a server that was never listening.
      registerShutdown(server, app.get("io") ?? null, [
        stopSnapshotScheduler,
        stopSailaIntakeScheduler,
        stopBackupScheduler,
        stopLogRetentionScheduler,
      ]);

      startSnapshotScheduler();
      startSailaIntakeScheduler();
      startLogRetentionScheduler();
      // Broadcast crash recovery: any 'running' broadcast from before this
      // restart is no longer being sent — mark it failed so the UI doesn't
      // poll forever.
      import("./saila-broadcast-storage").then(({ failStaleRunningBroadcasts }) => {
        failStaleRunningBroadcasts(60 * 60 * 1000)
          .then((n) => { if (n > 0) log(`[Broadcast] Crash recovery: marked ${n} stale running broadcast(s) as failed`); })
          .catch((e) => log(`[Broadcast] Crash recovery error: ${e?.message || e}`));
      }).catch(() => { /* module not loadable yet — boot continues */ });
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        log(`ERROR: Port ${port} is already in use`);
      } else {
        log(`Server error: ${error.message}`);
      }
      console.error("Server error:", error);
    });
  } catch (error) {
    log(`FATAL: Server initialization failed: ${error}`);
    console.error("Server initialization error:", error);
    process.exit(1);
  }
}
