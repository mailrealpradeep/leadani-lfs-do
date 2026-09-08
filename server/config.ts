// Central runtime configuration.
//
// Every secret / deployment-specific setting is read and validated here, in one
// place, so a misconfigured deployment surfaces at boot instead of misbehaving
// silently at runtime. Import from this module rather than reading process.env
// at call sites.

export const NODE_ENV = process.env.NODE_ENV || "development";
export const IS_PRODUCTION = NODE_ENV === "production";

export const PORT = parseInt(process.env.PORT || "5000", 10);

export const DATABASE_URL = process.env.DATABASE_URL || "";

// Socket.io CORS origin. Set to the app's public https URL in production.
export const FRONTEND_URL = process.env.FRONTEND_URL;

const DEV_JWT_FALLBACK = "dabluz-crm-secret-key-change-in-production";
const DEV_HMAC_FALLBACK = "dabluz-webhook-secret-change-in-production";

function secretFromEnv(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  // TODO(do-migration Phase 5): once this secret is set in the deployment
  // environment, turn the production branch into a thrown error. It only warns
  // today because the current deployment runs without it, and failing hard
  // would break the next redeploy before the secret is added.
  // NOTE: when first setting the secret, set it to the current fallback value
  // so existing sessions/webhook signatures keep working, then rotate later.
  const message =
    `[config] ${name} is not set — using the built-in default. ` +
    `Set ${name} in your environment/secrets; the default is public in the source code.`;
  if (IS_PRODUCTION) {
    console.error(`SECURITY WARNING: ${message}`);
  } else {
    console.warn(message);
  }
  return devFallback;
}

export const JWT_SECRET = secretFromEnv("JWT_SECRET", DEV_JWT_FALLBACK);
export const HMAC_SECRET = secretFromEnv("HMAC_SECRET", DEV_HMAC_FALLBACK);

// A production boot with no DATABASE_URL would otherwise come up "healthy" on
// an empty in-memory store (see server/storage.ts) — fail instead.
if (IS_PRODUCTION && !DATABASE_URL) {
  throw new Error(
    "[config] DATABASE_URL is required in production. Refusing to start with the in-memory store.",
  );
}

// ---------------------------------------------------------------------------
// Database pool settings
// ---------------------------------------------------------------------------

// Keep this comfortably below the DB plan's connection limit (DO Managed
// Postgres basic plans allow ~22 backends).
export const DB_POOL_MAX = parseInt(process.env.DB_POOL_MAX || "10", 10);

// TLS for the DB connection. If DATABASE_CA_CERT is set (PEM or base64 of the
// PEM, e.g. the DigitalOcean Managed Postgres CA), verify against it.
// Otherwise leave it to the connection string's sslmode parameter, which is
// how both the current Replit URL (sslmode=disable) and a DO URL
// (sslmode=require) express intent.
function resolveCaCert(): string | undefined {
  const raw = process.env.DATABASE_CA_CERT?.trim();
  if (!raw) return undefined;
  if (raw.includes("-----BEGIN")) return raw;
  const decoded = Buffer.from(raw, "base64").toString("utf8");
  if (decoded.includes("-----BEGIN")) return decoded;
  console.error(
    "[config] DATABASE_CA_CERT is neither a PEM certificate nor base64 of one — " +
      "passing it through as-is, but TLS verification will likely fail.",
  );
  return raw;
}

const DB_CA_CERT = resolveCaCert();
export const DB_SSL: { ca: string } | undefined = DB_CA_CERT
  ? { ca: DB_CA_CERT }
  : undefined;

// ---------------------------------------------------------------------------
// File storage: "local" (./uploads on disk) or "s3" (S3-compatible, e.g.
// DigitalOcean Spaces). Defaults to local so existing deployments are
// unaffected until STORAGE_DRIVER=s3 is explicitly set.
// ---------------------------------------------------------------------------

export const STORAGE_DRIVER = (process.env.STORAGE_DRIVER || "local") as "local" | "s3";

export const S3_ENDPOINT = process.env.S3_ENDPOINT || "";
export const S3_REGION = process.env.S3_REGION || "us-east-1";
export const S3_BUCKET = process.env.S3_BUCKET || "";
export const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || "";
export const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || "";
export const S3_FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE === "true";

if (IS_PRODUCTION && STORAGE_DRIVER === "local") {
  console.error(
    "[config] STORAGE_DRIVER=local in production — uploaded files are written to " +
      "the container filesystem and are LOST on every redeploy. Set STORAGE_DRIVER=s3 " +
      "with the S3_* variables, or mount a persistent volume at ./uploads.",
  );
}

if (STORAGE_DRIVER === "s3") {
  const missing = [
    ["S3_ENDPOINT", S3_ENDPOINT],
    ["S3_BUCKET", S3_BUCKET],
    ["S3_ACCESS_KEY_ID", S3_ACCESS_KEY_ID],
    ["S3_SECRET_ACCESS_KEY", S3_SECRET_ACCESS_KEY],
  ].filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    throw new Error(`[config] STORAGE_DRIVER=s3 but missing: ${missing.join(", ")}`);
  }
}

// ---------------------------------------------------------------------------
// Google Sheets backup auth. If GOOGLE_SERVICE_ACCOUNT_JSON is set (raw JSON
// or base64 of the service-account key file) the backup uses a Google service
// account; otherwise it falls back to the Replit Google Sheets connector,
// which only exists on Replit.
// ---------------------------------------------------------------------------

export const GOOGLE_SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "";

// Master switch for the Google Sheets backup feature (hourly scheduler AND the
// manual "Sync now" button). Default OFF: one full run reads every lead of
// every backup-enabled sheet plus its updates (~29k leads in production) and
// on a 1 vCPU database that alone pins the CPU for the whole hour. Set
// GOOGLE_SHEETS_BACKUP=enabled to turn it on. See setting.md.
export const GOOGLE_SHEETS_BACKUP_ENABLED =
  (process.env.GOOGLE_SHEETS_BACKUP || "disabled").toLowerCase() === "enabled";

if (!GOOGLE_SHEETS_BACKUP_ENABLED) {
  console.log(
    "[config] GOOGLE_SHEETS_BACKUP is not 'enabled' — the hourly Google Sheets backup " +
      "scheduler and manual sync are OFF. Set GOOGLE_SHEETS_BACKUP=enabled to turn them on.",
  );
}

// Hourly sheet snapshot scheduler (the "restore sheet to an earlier state"
// feature). Default ON. Set SHEET_SNAPSHOTS=disabled to stop the hourly job;
// manual snapshots from the admin UI keep working. See setting.md.
export const SHEET_SNAPSHOTS_ENABLED =
  (process.env.SHEET_SNAPSHOTS || "enabled").toLowerCase() !== "disabled";

if (!SHEET_SNAPSHOTS_ENABLED) {
  console.log("[config] SHEET_SNAPSHOTS=disabled — hourly sheet snapshot scheduler is OFF.");
}

if (IS_PRODUCTION && GOOGLE_SHEETS_BACKUP_ENABLED && !GOOGLE_SERVICE_ACCOUNT_JSON) {
  console.error(
    "[config] GOOGLE_SERVICE_ACCOUNT_JSON is not set — the hourly Google Sheets " +
      "backup will fail on every run outside Replit. Set it to the service-account " +
      "key (raw JSON or base64) and share each backup spreadsheet with that " +
      "account as Editor.",
  );
}

if (IS_PRODUCTION && !FRONTEND_URL) {
  // TODO(do-migration): set FRONTEND_URL to the app's public URL, then make
  // this a hard error — Socket.io currently falls back to origin "*".
  console.warn(
    "[config] FRONTEND_URL is not set — Socket.io CORS falls back to '*'. Set it to the app's public URL.",
  );
}

// ---------------------------------------------------------------------------
// Outbound integrations kill switch
// ---------------------------------------------------------------------------
// A staging/rehearsal deployment restored from the production dump carries live
// third-party credentials: Wauper WhatsApp access tokens (saila_phone_settings),
// 12 enabled Google Sheets backup targets, and 3 outgoing webhooks. Booting it
// with those active sends real WhatsApp messages to real leads and overwrites
// the real backup spreadsheets — from a host nobody is watching.
//
// Set OUTBOUND_INTEGRATIONS=disabled on every deployment that is not the one
// serving real users. Inbound traffic, the UI, and the database are unaffected;
// only egress to third parties is suppressed. Default is "enabled" so the
// production deployment needs no extra variable to behave normally.
export const OUTBOUND_ENABLED =
  (process.env.OUTBOUND_INTEGRATIONS || "enabled").toLowerCase() !== "disabled";

if (!OUTBOUND_ENABLED) {
  console.warn(
    "[config] OUTBOUND_INTEGRATIONS=disabled — WhatsApp sends, outgoing webhooks, " +
      "Google Sheets backups and web push are suppressed. This must NOT be set on " +
      "the deployment serving real users.",
  );
}

// ---------------------------------------------------------------------------
// Log retention
// ---------------------------------------------------------------------------
// activity_logs, audit_logs, outgoing_webhook_logs and webhook_requests have no
// retention of their own and account for ~2.1 GB of a 2.7 GB production
// database. On DigitalOcean, disk is fixed by the plan, so unbounded growth is
// an outage waiting to happen rather than a slowly rising bill.
//
// Set LOG_RETENTION_DAYS=0 to disable pruning entirely (keeps everything).
export const LOG_RETENTION_DAYS = parseInt(
  process.env.LOG_RETENTION_DAYS || "90",
  10,
);
