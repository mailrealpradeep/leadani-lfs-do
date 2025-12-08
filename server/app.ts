import { type Server } from "node:http";

import express, {
  type Express,
  type Request,
  Response,
  NextFunction,
} from "express";

import { registerRoutes } from "./routes";
import { startSnapshotScheduler } from "./snapshot-scheduler";

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

// Enable trust proxy for Replit deployment and rate limiting
// This is required for express-rate-limit to work correctly
app.set('trust proxy', true);

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
app.use(express.json({
  limit: '15mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '15mb' }));

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
      reusePort: true,
    }, () => {
      log(`Server is ready and listening on 0.0.0.0:${port}`);
      
      startSnapshotScheduler();
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
