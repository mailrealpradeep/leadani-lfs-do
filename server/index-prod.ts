import fs from "node:fs";
import path from "node:path";
import { type Server } from "node:http";

import express, { type Express } from "express";
import runApp from "./app";

export async function serveStatic(app: Express, _server: Server) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  const indexPath = path.resolve(distPath, "index.html");
  const assetsDir = path.resolve(distPath, "assets") + path.sep;

  app.use(
    express.static(distPath, {
      index: false,
      setHeaders: (res, filePath) => {
        // Vite emits content-hashed files under /assets: safe to cache forever.
        // Everything else (index.html, manifest, sw.js) must be revalidated so a
        // browser never keeps an index.html that points at a bundle from a
        // previous deploy.
        if (filePath.startsWith(assetsDir)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    }),
  );

  // A hashed asset that no longer exists (stale index.html after a deploy) must
  // 404, not fall through to index.html: serving HTML as a module script gives
  // a blank page with a MIME-type error.
  app.use("/assets", (_req, res) => {
    res.status(404).type("text/plain").send("Not found");
  });

  // fall through to index.html for client-side routes
  app.use("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(indexPath);
  });
}

(async () => {
  await runApp(serveStatic);
})();
