# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies (needed for some native npm packages)
RUN apk add --no-cache python3 make g++

# Vite/Rollup builds the whole client as one graph and Node's default heap on a
# 4 GB box is not enough. Builder stage only — stage 2 starts from a fresh env.
ENV NODE_OPTIONS=--max-old-space-size=3072

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build frontend (Vite) + backend (esbuild)
# REPL_ID must be unset so Replit-specific plugins are skipped
RUN unset REPL_ID && npm run build

# Reduce to the runtime tree in place, so stage 2 ships exactly the modules the
# build succeeded against rather than a second, independently resolved install.
RUN npm prune --omit=dev


# ---- Stage 2: Production runner ----
FROM node:20-alpine AS runner

WORKDIR /app

# tini reaps zombies and forwards signals; the app installs its own SIGTERM
# handler (server/shutdown.ts), so PID 1 must not swallow it.
RUN apk add --no-cache tini

# Runtime dependencies + build output, both taken from the validated builder
# tree. `npm run build` uses esbuild --packages=external, so node_modules is
# genuinely required at runtime.
# --chown on COPY sets ownership as each layer is written. A separate
# `RUN chown -R` rewrites every file in node_modules into an additional layer,
# which measured at ~155s per build and duplicates the whole dependency tree.
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist

# WORKDIR created /app as root and --chown above only covers the copied paths,
# so give the app directory itself to node. Two inodes, unlike a recursive
# chown over node_modules. Without this the default STORAGE_DRIVER=local dies
# at boot on mkdir /app/uploads.
RUN mkdir -p /app/uploads && chown node:node /app /app/uploads

# Drop privileges. With STORAGE_DRIVER=s3 (the production setting) nothing is
# written to the container filesystem at all; /app/uploads only exists so the
# local driver works for development.
USER node

# Expose the app port (default 5000, overridable via PORT env var)
EXPOSE 5000

# Environment variables that MUST be provided at runtime:
#   DATABASE_URL   — PostgreSQL connection string (include sslmode=require for
#                    managed Postgres, e.g. DigitalOcean). Use the DIRECT
#                    connection string, not the connection-pool one — the app
#                    relies on session-level advisory locks.
#   JWT_SECRET     — Secret key for JWT token signing
#   HMAC_SECRET    — Webhook HMAC signing/validation
# Optional:
#   PORT                — Server port (default: 5000)
#   FRONTEND_URL        — Public app URL (Socket.io CORS origin)
#   DB_POOL_MAX         — Max pg pool connections (default: 10)
#   DATABASE_CA_CERT    — PEM CA cert for DB TLS verification
#   SARVAM_API_KEY      — Sarvam AI features (quality check, AI rating)
#   VAPID_PUBLIC_KEY    — Web push notifications (carry over between hosts)
#   VAPID_PRIVATE_KEY   — Web push notifications (carry over between hosts)
#   GOOGLE_SERVICE_ACCOUNT_JSON — Google Sheets backup (service account key)
#   SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD — super-admin bootstrap account
#   STORAGE_DRIVER      — "local" (default) or "s3"
#   S3_ENDPOINT / S3_REGION / S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY
#                       — required when STORAGE_DRIVER=s3 (DigitalOcean Spaces)
# See .env.example for the full documented list.

ENV NODE_ENV=production

# start-period covers the boot DDL/seeders in registerRoutes(), which all run
# before server.listen() — /health cannot answer until they finish, and on a
# cold database that is well over the old 40s.
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
