import fs from "node:fs";
import path from "node:path";
import { type Server } from "node:http";

import { nanoid } from "nanoid";
import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";

import viteConfig from "../vite.config";
import runApp from "./app";

export async function setupVite(app: Express, server: Server) {
  const viteLogger = createLogger();
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // Configure Vite middleware to exclude API routes
  app.use((req, res, next) => {
    // Skip Vite middleware for API routes
    if (req.originalUrl.startsWith("/api/")) {
      return next();
    }
    vite.middlewares(req, res, next);
  });
  
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Skip Vite handling for API routes - let Express handle them
    if (url.startsWith("/api/")) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught exception:', error);
  console.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled rejection at:', promise, 'reason:', reason);
  if (reason instanceof Error) {
    console.error(reason.stack);
  }
});

process.on('SIGTERM', () => {
  console.error('[SIGNAL] Received SIGTERM - process being terminated externally');
  console.error(new Error('SIGTERM stack trace:').stack);
});

process.on('SIGINT', () => {
  console.error('[SIGNAL] Received SIGINT');
});

process.on('SIGBUS', () => {
  console.error('[SIGNAL] Received SIGBUS (bus error) - likely a native module crash');
});

process.on('SIGSEGV', () => {
  console.error('[SIGNAL] Received SIGSEGV (segfault) - likely a native module crash');
});

process.on('SIGABRT', () => {
  console.error('[SIGNAL] Received SIGABRT - process aborted');
});

(async () => {
  await runApp(setupVite);
})();
