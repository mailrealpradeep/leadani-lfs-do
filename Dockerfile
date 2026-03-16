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
#   DATABASE_URL   — PostgreSQL connection string (Neon or standard Postgres)
#   JWT_SECRET     — Secret key for JWT token signing
# Optional:
#   PORT                — Server port (default: 5000)
#   HMAC_SECRET         — For webhook HMAC validation
#   SARVAM_API_KEY      — Sarvam AI features (quality check, AI rating)
#   WAUPER_API_KEY      — Saila.AI WhatsApp messaging
#   VAPID_PUBLIC_KEY    — Web push notifications
#   VAPID_PRIVATE_KEY   — Web push notifications
#   GOOGLE_SERVICE_ACCOUNT_JSON — Google Sheets backup

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
