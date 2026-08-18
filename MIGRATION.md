# Migration Guide: Replit → DigitalOcean (Coolify + Managed Postgres + Spaces)

Follow the parts **in order**. Each step says **where** to do it. Don't skip the checkmarks — they keep the migration safe.

---

## Part 1 — Prepare on Replit (do now, app keeps running)

### 1.1 Set secrets — *in Replit → your App → Secrets (🔒)*
Add these **exact values** (same as the current built-in ones, so nobody gets logged out):

| Key | Value |
|---|---|
| `JWT_SECRET` | `dabluz-crm-secret-key-change-in-production` |
| `HMAC_SECRET` | `dabluz-webhook-secret-change-in-production` |
| `SUPER_ADMIN_EMAIL` | `adminleadani@leadani.com` |
| `SUPER_ADMIN_PASSWORD` | (the current super-admin password) |

⚠️ Do NOT invent new values yet — changing `JWT_SECRET` logs out every user. Rotate later, after migration, in a planned window.

### 1.2 Redeploy — *in Replit → Deploy*
- Pick a low-traffic hour. Redeploy the app (it now has all migration-ready code).
- ✅ Test: log in, open leads, view the notice PDF, send one WhatsApp message.
- If anything is wrong: Replit → Deployments → **Rollback** (one click).
- Let it run 1–2 days before continuing.

### 1.3 Google service account — *in console.cloud.google.com*
1. Create a project (or use existing) → enable **Google Sheets API**.
2. IAM & Admin → Service Accounts → create one → Keys → **Add key (JSON)** → download.
3. In Replit Secrets add `GOOGLE_SERVICE_ACCOUNT_JSON` = the whole JSON file content.
4. **Share every backup spreadsheet** with the service account email (`...@...iam.gserviceaccount.com`) as **Editor** — in Google Sheets → Share.
5. ✅ Test: in the app, trigger a manual Google Sheets backup — it must succeed.

---

## Part 2 — Provision DigitalOcean (do anytime, ~30 min)

### 2.1 Database — *in DO → Databases*
- Create a **Managed PostgreSQL** cluster (start with the 1–2 GB plan).
- ⚠️ Note the **direct connection** string (NOT the "connection pool" one — the app uses Postgres advisory locks that break behind the pooler).
- The URL must end with `?sslmode=require`.

### 2.2 File storage — *in DO → Spaces Object Storage*
- Create a Space (bucket), **private** (no public file listing).
- API → Spaces Keys → generate key + secret. Note the region and endpoint (e.g. `https://blr1.digitaloceanspaces.com`).

### 2.3 Server + Coolify — *in DO → Droplets*
- Create a droplet: Ubuntu, **at least 4 GB RAM** (the build needs it).
- Install Coolify: `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`, then open `http://<droplet-ip>:8000`.
- Point a domain/subdomain (e.g. `app.leadani.com`) at the droplet IP — *in your DNS provider* (low TTL, e.g. 300s).

### 2.4 Collect for cutover day
- DO database URL (direct, with `sslmode=require`)
- Spaces: endpoint, region, bucket name, key, secret
- From Replit Secrets: values of `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `SARVAM_API_KEY` — these must be **copied unchanged** (new VAPID keys would kill all push notifications).

---

## Part 3 — Set up the app in Coolify (before cutover, safe to test)

*In Coolify → New Resource → your git repo:*
- Build pack: **Dockerfile** (already in the repo). Port: **5000**. Domain: your subdomain (HTTPS on).
- **Replicas: 1** (never scale this app to 2+ — it runs internal schedulers).
- Env vars — copy from `.env.example`, filling in:
  - `NODE_ENV=production`, `DATABASE_URL` (DO), `FRONTEND_URL=https://<your-domain>`
  - `JWT_SECRET`, `HMAC_SECRET`, `SUPER_ADMIN_*`, `SARVAM_API_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON` — **same values as Replit**
  - `STORAGE_DRIVER=s3`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- Proxy: allow request bodies up to **35 MB** (notice PDF uploads); WebSockets stay on (Traefik default).
- ✅ Deploy once now. It will start against the **empty** DO database — that's expected. Check the container logs show a clean boot, then stop it until cutover. Real users stay on Replit.

---

## Part 4 — Cutover day (~30–60 min downtime, pick a quiet time)

Announce downtime. Then, *from the Replit Shell* (it has all tools + access):

1. **Stop writes**: Replit → Deployments → stop/idle the deployment.
2. **Copy the database**:
   ```bash
   pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL" -f backup.dump
   pg_restore --no-owner --no-acl -d "<DO_DATABASE_URL>" backup.dump
   ```
   ✅ Spot-check: user count and lead count match on both sides.
3. **Copy uploaded files to Spaces**:
   ```bash
   S3_ENDPOINT=... S3_REGION=... S3_BUCKET=... S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... \
   npx tsx scripts/migrate-uploads-to-s3.ts
   ```
   ✅ Script must end with "All notice files present in bucket."
4. **Start the app**: Coolify → deploy/start. Watch logs: no errors, "Lead indexes verified/created", schedulers starting.
5. ✅ **Smoke test on the new domain**: login → leads list → notice PDF → send a WhatsApp message → Google Sheets manual backup → push notification.
6. **Repoint integrations**:
   - *Meta developer portal*: update the WhatsApp webhook callback URL and the Facebook App's allowed domains to the new domain.
   - Any external service posting to `/api/public/webhooks/...`: update the URL.
7. **Switch DNS** (if the main domain pointed to Replit) — users are now on DigitalOcean.

---

## Part 5 — After migration

- Keep the Replit deployment stopped but intact for **1 week** (instant rollback: restart Replit + revert DNS).
- After the soak week: in DO, restrict database access to the droplet only; delete `uploads/` files from the repo; rotate `JWT_SECRET` and `HMAC_SECRET` to strong random values in a planned window (this logs everyone out once — announce it).
- Cancel/downgrade Replit when confident.

## If something goes wrong
- **During cutover**: nothing is destroyed — the Replit deployment and its database are untouched. Restart Replit deployment + revert DNS = back to before.
- **App boots but no data on DO**: `DATABASE_URL` is wrong/missing — the app refuses to start in production without it; check Coolify env vars.
- **Files 404 on DO**: check `STORAGE_DRIVER=s3` and the 5 `S3_*` vars; re-run step 4.3.
