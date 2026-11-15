# Production deployment

This project deploys as three services:

| Service | Provider | Root directory | Runtime command |
| --- | --- | --- | --- |
| React frontend | Vercel | `frontend` | `npm run build` |
| Express API | Vercel | `backend` | Vercel function at `api/[...path].ts` |
| BullMQ email worker | Render | `backend` | `npm run start:worker` |

The frontend is a Vite single-page application. Its `vercel.json` rewrites browser routes such as `/scheduled` and `/sent` to `index.html`. The API is separate from the worker because scheduled BullMQ processing requires a persistent process.

## 1. Provision managed services

Create these before deploying application code:

1. Create a PostgreSQL database, for example in Neon. Copy its pooled PostgreSQL connection string, including `sslmode=require` if provided.
2. Create a managed Redis-compatible database that exposes a TCP URL. Redis Cloud is suitable because both Vercel and Render need to connect to it. Enable persistence and use a no-eviction policy for the queue database.
3. Create production SMTP credentials. Gmail requires an app password; a transactional SMTP provider is preferable for production. Decide the verified sender address for `SMTP_FROM`.

Use the same PostgreSQL `DATABASE_URL` and Redis `REDIS_URL` for the Vercel API and Render worker. Use a lowercase `rediss://` URL when the Redis provider requires TLS.

## 2. Apply the PostgreSQL migration

The existing `prisma/schema.prisma` remains the MySQL development schema. Production PostgreSQL has an independent schema and migration in `backend/prisma/postgresql`.

From PowerShell, run this once against the empty production database before the first deployment:

```powershell
cd E:\OutBox\backend
$env:DATABASE_URL = 'postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require'
npm ci
npm run prisma:migrate:production
Remove-Item Env:DATABASE_URL
```

For later schema changes, create and review a PostgreSQL migration from the production schema, commit it, then run the same `prisma:migrate:production` command during the release process.

## 3. Deploy the API to Vercel

Create a Vercel project from the repository with:

- Project name: `outbox-api`
- Root Directory: `backend`
- Framework Preset: `Other`
- Build Command: `npm run build:production`
- Install Command: `npm ci`

Set these Production environment variables in the Vercel API project:

```text
NODE_ENV=production
DATABASE_URL=<PostgreSQL pooled URL>
REDIS_URL=<Redis TCP URL>
JWT_SECRET=<long random secret>
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://<your-frontend-domain>
EMAIL_RATE_LIMIT_MAX=10
EMAIL_RATE_LIMIT_DURATION_MS=1000
```

`FRONTEND_URL` may contain comma-separated origins when preview deployments also need API access. Set it to the exact Vercel frontend URL for production.

Deploy from `backend` after linking the Vercel project:

```powershell
vercel link
vercel --prod
```

Verify `https://<your-api-domain>/api/health` returns `status: "ok"`.

## 4. Deploy the frontend to Vercel

Create a second Vercel project from the same repository with:

- Project name: `outbox-frontend`
- Root Directory: `frontend`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

Set this Production environment variable, then deploy:

```text
VITE_API_URL=https://<your-api-domain>/api
```

```powershell
cd E:\OutBox\frontend
vercel link
vercel --prod
```

After Vercel reports the frontend URL, set that exact URL as `FRONTEND_URL` in the API project and redeploy the API once. This enables the production CORS allowlist.

## 5. Deploy the persistent worker to Render

Push the repository to a user-owned Git provider repository, then create a Render Blueprint from `render.yaml`. It provisions one background worker with `backend` as its root directory.

Set the `sync: false` worker variables in Render:

```text
DATABASE_URL=<same PostgreSQL pooled URL>
REDIS_URL=<same Redis TCP URL>
SMTP_SERVICE=<gmail or provider-specific value>
SMTP_HOST=<SMTP host when SMTP_SERVICE is blank>
SMTP_PORT=587
SMTP_USER=<SMTP username>
SMTP_PASS=<SMTP password or app password>
SMTP_FROM="Outbox Scheduler <verified-sender@example.com>"
```

Keep exactly one worker instance. The worker reconciles records from PostgreSQL against BullMQ at startup, restores missing delayed jobs, and then begins processing. A Render background worker has no public application URL; its health is verified through its deployment log and the frontend email history.

## 6. Production acceptance test

After all three services are live:

1. Open the frontend, register a new user, then sign in.
2. Confirm the dashboard can read its metrics and queue history.
3. Send one immediate test email and confirm it appears in Sent Emails.
4. Schedule a second email at least two minutes in the future. Confirm it appears in Scheduled Emails, then moves to Sent Emails after delivery.
5. Restart the Render worker while another email is waiting. Confirm the worker log shows startup reconciliation and the email is delivered at or after its target time.
6. Temporarily use invalid SMTP credentials only in a non-production test environment to confirm BullMQ retry and failed status behavior. Restore production credentials immediately afterward.

Never add `.env` files, database connection strings, Redis URLs, SMTP passwords, or JWT secrets to Git.
