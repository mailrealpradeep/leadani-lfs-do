# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies (needed for some native npm packages)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build frontend (Vite) + backend (esbuild)
# REPL_ID must be unset so Replit-specific plugins are skipped
RUN unset REPL_ID && npm run build


# ---- Stage 2: Production runner ----
FROM node:20-alpine AS runner

WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Expose the app port (default 5000, overridable via PORT env var)
EXPOSE 5000

# Environment variables that MUST be provided at runtime:
#   DATABASE_URL   — PostgreSQL connection string (include sslmode=require for
#                    managed Postgres, e.g. DigitalOcean)
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

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
