// One-shot migration: copy every file under ./uploads to the S3-compatible
// bucket (DigitalOcean Spaces), verify each upload, then cross-check that
// every path referenced by company_notices exists in the bucket.
//
// Run at cutover, from the repo root, with the S3_* env vars set (and
// DATABASE_URL for the cross-check):
//
//   npx tsx scripts/migrate-uploads-to-s3.ts
//
// Idempotent: re-running re-uploads (overwrites) the same keys.

import fs from "fs";
import path from "path";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

const {
  S3_ENDPOINT,
  S3_REGION,
  S3_BUCKET,
  S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY,
  S3_FORCE_PATH_STYLE,
  DATABASE_URL,
} = process.env;

if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
  console.error("Missing S3 env vars (S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY)");
  process.exit(1);
}

const client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: S3_FORCE_PATH_STYLE === "true",
});

const UPLOADS_DIR = path.resolve("./uploads");

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

async function keyExists(key: string): Promise<number | null> {
  try {
    const head = await client.send(
      new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key }),
    );
    return head.ContentLength ?? 0;
  } catch {
    return null;
  }
}

(async () => {
  const files = walk(UPLOADS_DIR);
  console.log(`Found ${files.length} file(s) under ${UPLOADS_DIR}`);

  let ok = 0;
  let failed = 0;
  for (const file of files) {
    const key = path.relative(UPLOADS_DIR, file).split(path.sep).join("/");
    const body = fs.readFileSync(file);
    try {
      await client.send(
        new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: body }),
      );
      const size = await keyExists(key);
      if (size === body.length) {
        ok++;
        console.log(`  ✓ ${key} (${body.length} bytes)`);
      } else {
        failed++;
        console.error(`  ✗ ${key} — verification failed (local ${body.length}, remote ${size})`);
      }
    } catch (error: any) {
      failed++;
      console.error(`  ✗ ${key} — ${error.message}`);
    }
  }
  console.log(`\nUploaded: ${ok}, failed: ${failed}`);

  // Cross-check DB references (notice PDFs use legacy filenames — trust the DB,
  // not directory naming assumptions).
  if (DATABASE_URL) {
    const pg = (await import("pg")).default;
    const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2 });
    try {
      const notices = await pool.query(
        "SELECT company_id, file_path FROM company_notices",
      );
      console.log(`\nCross-checking ${notices.rows.length} company_notices path(s):`);
      let missing = 0;
      for (const row of notices.rows) {
        const size = await keyExists(row.file_path);
        if (size === null) {
          missing++;
          console.error(`  ✗ MISSING in bucket: ${row.file_path} (company ${row.company_id})`);
        } else {
          console.log(`  ✓ ${row.file_path}`);
        }
      }
      console.log(missing === 0 ? "All notice files present in bucket." : `${missing} notice file(s) MISSING.`);
      if (missing > 0) process.exitCode = 1;
    } finally {
      await pool.end();
    }
  } else {
    console.log("\nDATABASE_URL not set — skipped company_notices cross-check.");
  }

  if (failed > 0) process.exitCode = 1;
})();
