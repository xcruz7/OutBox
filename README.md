# Outbox Labs – Scheduled Email Management System

A production-grade, distributed asynchronous email scheduling and dispatch engine built for the **Outbox Labs Software Development Engineer Intern** technical evaluation.

Built using **Node.js, Express, TypeScript, MySQL, Prisma ORM, Redis 7, BullMQ, React 18, Vite, and Tailwind CSS**.

---

## Table of Contents
1. [Submission Details](#submission-details)
2. [Architecture Overview](#architecture-overview)
   - [System Architecture Diagram](#system-architecture-diagram)
   - [How Scheduling Works](#how-scheduling-works)
   - [How Persistence Across Restarts is Handled](#how-persistence-across-restarts-is-handled)
   - [How Rate Limiting & Concurrency are Implemented](#how-rate-limiting--concurrency-are-implemented)
3. [Features Implemented](#features-implemented)
   - [Backend Features](#backend-features)
   - [Frontend Features](#frontend-features)
4. [Prerequisites](#prerequisites)
5. [Environment Setup & Variables](#environment-setup--variables)
   - [Ethereal Email Setup](#ethereal-email-setup)
6. [Quickstart Guide (Running Locally)](#quickstart-guide-running-locally)
   - [Step 1: Start MySQL and Redis](#step-1-start-mysql-and-redis)
   - [Step 2: Database Migration](#step-2-database-migration)
   - [Step 3: Run the API Server](#step-3-run-the-api-server)
   - [Step 4: Run the Dedicated Worker](#step-4-run-the-dedicated-worker)
   - [Step 5: Run the Frontend](#step-5-run-the-frontend)
7. [Restart Scenario Demonstration (Demo Video Guide)](#restart-scenario-demonstration-demo-video-guide)
8. [Automated Testing](#automated-testing)
9. [API Documentation](#api-documentation)
10. [Assumptions, Shortcuts & Trade-offs](#assumptions-shortcuts--trade-offs)

---

## 1. Submission Details

- **Candidate**: SDE Intern Applicant
- **Target Reviewer**: `Mitrajit`
- **Repository Visibility**: Private GitHub Repository (with collaborator access granted to `Mitrajit`)

---

## 2. Architecture Overview

### System Architecture Diagram

```
                             +-----------------------------------+
                             |     React 18 + Vite Frontend      |
                             |  (Tailwind CSS, React Router v7)  |
                             +-----------------------------------+
                                               |
                                               | HTTPS / REST (JWT Bearer Auth)
                                               v
                             +-----------------------------------+
                             |       Express.js API Server       |
                             |  - Authentication & JWT           |
                             |  - RFC 5322 Email Validation      |
                             |  - Database-First Persistence     |
                             |  - BullMQ Delayed Job Enqueuing   |
                             |  - Startup Recovery Engine        |
                             +-----------------------------------+
                                         /               \
                  1. Persist (ACID)     /                 \ 2. Enqueue Job
                                       v                   v
        +--------------------------------+       +--------------------------------+
        |           MySQL 8.0            |       |           Redis 7.0            |
        |  Durable Relational Source of  |       |   BullMQ Delayed Job Queue     |
        |        Truth via Prisma        |       |    (AOF + RDB Persistence)     |
        +--------------------------------+       +--------------------------------+
                        ^                                        |
                        | Atomic Precondition Update             | Pulls Job (Rate Limiter
                        | (`status = 'PROCESSING'`)              | & Concurrency Controlled)
                        |                                        v
                        +----------------------+---------------------------------+
                                               |      Dedicated BullMQ Worker    |
                                               |  - Standalone Node.js process   |
                                               |  - Rate limiter: 10 emails/sec  |
                                               |  - Concurrency: 5 workers       |
                                               |  - Exponential Backoff Retries  |
                                               |  - Idempotent State Transitions |
                                               +---------------------------------+
                                                                 |
                                                                 | SMTP Dispatch
                                                                 v
                                               +---------------------------------+
                                               |       Ethereal Email (SMTP)     |
                                               |   - Safe test email sandbox     |
                                               |   - Web preview URLs recorded   |
                                               +---------------------------------+
```

### How Scheduling Works
1. **Validation**: When a user submits an email, the backend validates email syntax, length, and verifies that `scheduledAt` is strictly in the future.
2. **Database-First Pattern**: Before enqueuing into Redis, the email is written to MySQL with status `SCHEDULED`. This guarantees that if Redis is unavailable or crashes, the record is never lost.
3. **Delay Calculation**: 
   $$\text{delay} = \max(0, \text{scheduledAt.getTime()} - \text{Date.now()})$$
4. **BullMQ Delayed Enqueue**: The job is added to BullMQ with:
   - Deterministic `jobId`: `email-job-${email.id}` (guarantees queue idempotency).
   - `delay`: The exact calculated millisecond offset.
   - `attempts: 3` with exponential backoff (`delay: 5000`, `type: 'exponential'`).
5. **Worker Execution**: At the target timestamp, BullMQ unlocks the delayed job. The dedicated worker process claims the job, checks preconditions atomically, dispatches through Nodemailer/Ethereal, records the live preview URL, and marks the status as `SENT`.

### How Persistence Across Restarts is Handled
A critical requirement of the system is surviving server, worker, or Redis crashes without losing scheduled emails.

1. **Redis AOF Configuration**:
   Redis runs with `redis-server --appendonly yes` and periodic snapshots (`save 60 1000`). BullMQ delayed jobs reside in Redis Sorted Sets (`zset`) scored by delivery timestamp. Even if Redis is abruptly restarted, delayed jobs remain intact.
2. **Startup Reconciliation Engine (`reconcileScheduledJobs`)**:
   When the backend or worker boots up, it executes a comprehensive reconciliation query against MySQL:
   ```sql
   SELECT * FROM emails WHERE status IN ('PENDING', 'SCHEDULED');
   ```
   For each record:
   - BullMQ is inspected via `emailQueue.getJob('email-job-' + email.id)`.
   - **Case A (Job present in Redis)**: If the job is active or delayed, it is healthy and left untouched. If the job already completed in BullMQ while the server was down, MySQL is updated to `SENT`.
   - **Case B (Job missing from Redis)**: If Redis was flushed or restarted empty:
     - **If `scheduledAt <= now` (Overdue during downtime)**: The email is immediately re-enqueued with `delay: 0` for immediate dispatch upon boot.
     - **If `scheduledAt > now` (Still in future)**: The remaining delay is recalculated and the job is re-enqueued with its deterministic `jobId`.
3. **Idempotency Guarantee**:
   The worker uses atomic database precondition updates:
   ```typescript
   const updated = await prisma.email.updateMany({
     where: { id: emailId, status: { in: ['SCHEDULED', 'PENDING'] } },
     data: { status: 'PROCESSING', attempts: { increment: 1 } },
   });
   if (updated.count === 0) return; // Safely skip already handled or cancelled emails
   ```
   This prevents dual-sending under concurrent restarts or worker retries.

### How Rate Limiting & Concurrency are Implemented

1. **Worker Concurrency**:
   - Configurable via `WORKER_CONCURRENCY` (default: `5`).
   - Limits the maximum number of simultaneous jobs being processed per worker instance. This prevents socket exhaustion and maintains predictable CPU/memory bounds.
2. **BullMQ Queue Rate Limiting**:
   - Configurable via `EMAIL_RATE_LIMIT_MAX` (default: `10`) and `EMAIL_RATE_LIMIT_DURATION_MS` (default: `1000`).
   - BullMQ coordinates rate limits globally using Redis-backed token buckets. Even if 500 delayed jobs mature at the exact same second, BullMQ smooths execution to never exceed 10 emails per second across all workers.
3. **API Rate Limiting**:
   - Express utilizes `express-rate-limit` to restrict endpoints to 300 requests per 15-minute window per IP, mitigating brute-force and DoS risks.

---

## 3. Features Implemented

### Backend Features
- [x] **JWT Authentication**: User registration, login, secure password hashing using bcrypt (salt rounds: 10), and token validation.
- [x] **Strict User Isolation**: Users can only inspect, schedule, and cancel their own emails.
- [x] **Durable Scheduling Engine**: BullMQ delayed queue integrated with MySQL Prisma models.
- [x] **Startup Reconciliation & Self-Healing**: Recovers missing or overdue jobs upon backend/worker restart.
- [x] **Configurable Concurrency**: Worker concurrency throttled and configurable via environment variables.
- [x] **Configurable Rate Limiting**: Global Redis-backed rate limiter on email dispatch.
- [x] **Safe Ethereal Email Integration**: Automated test account provisioning, live web preview URL extraction and storage.
- [x] **Graceful Shutdown**: Intercepts `SIGINT`/`SIGTERM` to allow in-flight SMTP dispatches to complete cleanly.
- [x] **Automated Test Suite**: Unit and integration tests covering security, validation, delay math, and rate limiting.

### Frontend Features
- [x] **Modern SaaS UI**: Clean slate/teal aesthetic built with Tailwind CSS, lucide-react icons, and responsive layouts.
- [x] **Authentication Flow**: Login and registration with client-side validation and persistent JWT sessions.
- [x] **Overview Dashboard**: Metrics cards displaying Total, Scheduled, Sent, and Failed email counts with real-time polling.
- [x] **Compose & Schedule Modal**:
  - RFC 5322 email syntax validation.
  - Future timestamp validation (prevents scheduling in the past).
  - Quick-delay presets (`+30 Seconds`, `+2 Minutes`, `+10 Minutes`) for rapid testing.
- [x] **Recipient List Upload**: Import up to 500 unique recipients from a CSV or TXT file and schedule the same message and delivery time for each address.
- [x] **Scheduled Emails Table**: Shows recipient, subject, scheduled execution timestamp, status badge, and one-click cancel action.
- [x] **Sent Emails Table**: Shows recipient, subject, delivery timestamp, retry attempts, and direct clickable **"View in Ethereal"** preview links.
- [x] **Toast Notifications**: Non-intrusive feedback on email creation, errors, and cancellations.

---

## 4. Prerequisites

- **Node.js**: v18.0.0 or higher (v22.x recommended)
- **npm**: v9.x or higher
- **Docker & Docker Compose** (Recommended for instant MySQL & Redis provisioning), OR standalone installations of:
  - MySQL 8.0+
  - Redis 7.0+

---

## 5. Environment Setup & Variables

### Backend Environment Variables (`backend/.env`)

```ini
# Server Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database Connection (MySQL)
DATABASE_URL=mysql://outbox_user:outbox_pass@localhost:3306/outbox_scheduler

# Redis Connection (BullMQ)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# Authentication
JWT_SECRET=outbox_super_secret_jwt_key_development_2024
JWT_EXPIRES_IN=7d

# Concurrency & Rate Limiting
WORKER_CONCURRENCY=5
EMAIL_RATE_LIMIT_MAX=10
EMAIL_RATE_LIMIT_DURATION_MS=1000

# Ethereal Email Credentials (leave empty to automatically create a sandbox test account on startup)
ETHEREAL_USER=
ETHEREAL_PASS=
```

### Frontend Environment Variables (`frontend/.env`)

```ini
VITE_API_URL=http://localhost:5000/api
```

### Ethereal Email Setup
The application is pre-configured to automatically create an ephemeral Ethereal test account on startup if `ETHEREAL_USER` and `ETHEREAL_PASS` are left empty.
- To use an existing Ethereal account, visit https://ethereal.email, click **"Create Ethereal Account"**, and paste your credentials into `backend/.env`.
- Every sent email generates a live web preview URL (e.g. `https://ethereal.email/message/...`), allowing reviewers to view rendered emails with one click from the **Sent Emails** dashboard.

---

## 6. Quickstart Guide (Running Locally)

### Step 1: Start MySQL and Redis
Using the included `docker-compose.yml`:
```bash
docker compose up -d
```
*(Alternatively, ensure your local MySQL runs on port 3306 and Redis on port 6379).*

### Step 2: Database Migration
In the root directory or `backend/`:
```bash
cd backend
npm install
npx prisma db push
```
*(This syncs the Prisma schema with your MySQL database without manual SQL scripts).*

### Step 3: Run the API Server
In a terminal window:
```bash
cd backend
npm run dev
```
The API server will connect to MySQL, execute startup reconciliation, and listen on `http://localhost:5000`.

### Step 4: Run the Dedicated Worker
In a second terminal window:
```bash
cd backend
npm run worker
```
The worker process will connect to Redis and MySQL, initialize Ethereal test credentials, and await scheduled jobs.

### Step 5: Run the Frontend
In a third terminal window:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser. Register an account and begin scheduling!

---

## 7. Restart Scenario Demonstration (Demo Video Guide)

To reproduce the restart scenario required in the submission guidelines:

1. **Schedule an Email**:
   - Open the frontend, click **Compose Email**.
   - Select a future time (e.g., `+2 Minutes` or a custom future time).
   - Verify the email appears in the **Scheduled Emails** table with status `SCHEDULED`.
2. **Simulate Server Downtime**:
   - Stop the API server (`Ctrl+C` in the server terminal).
   - Stop the Worker process (`Ctrl+C` in the worker terminal).
3. **Verify Persistence & Restart**:
   - Restart the server: `npm run dev`.
   - Observe console output: `[Recovery] Running startup job reconciliation... Restoring missing queue job`.
   - Restart the worker: `npm run worker`.
4. **Delivery Validation**:
   - When the scheduled timestamp arrives, the worker processes the job.
   - Navigate to **Sent Emails** in the frontend dashboard.
   - Click **"View in Ethereal"** to inspect the live delivered email in your browser!

---

## 8. Automated Testing

Run the test suite from the `backend/` directory:
```bash
cd backend
npm test
```

### Test Coverage Highlights:
- **Authentication**: Bcrypt hashing entropy, token issuance, tampering protection.
- **Scheduling**: Future timestamp validation, past timestamp rejection, millisecond delay calculation.
- **Concurrency & Rate Limiting**: Configuration verification and RFC email pattern checks.

---

## 9. API Documentation

| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new account (`email`, `password`, `name`) | No |
| `POST` | `/api/auth/login` | Login and receive JWT (`email`, `password`) | No |
| `GET` | `/api/auth/profile` | Retrieve logged-in user profile | Yes |
| `POST` | `/api/emails/schedule` | Schedule email (`recipient`, `subject`, `body`, `scheduledAt`) | Yes |
| `POST` | `/api/emails/schedule-bulk` | Schedule one message and time for a recipient list (`recipients`, `subject`, `body`, `scheduledAt`) | Yes |
| `GET` | `/api/emails/scheduled` | List user's scheduled/pending emails | Yes |
| `GET` | `/api/emails/sent` | List user's sent emails with Ethereal preview links | Yes |
| `GET` | `/api/emails/:id` | Get individual email details | Yes |
| `POST` | `/api/emails/:id/cancel` | Cancel a scheduled email before delivery | Yes |
| `GET` | `/api/dashboard/stats` | Retrieve metrics summary (total, scheduled, sent, failed) | Yes |
| `GET` | `/api/health` | Service health status | No |

---

## 10. Assumptions, Shortcuts & Trade-offs

1. **Ethereal Sandbox vs Production SES/SendGrid**:
   - *Decision*: Nodemailer with Ethereal Email was selected per the project specification. Ethereal simulates real SMTP handshakes and generates inspectable web previews without risking real spam blacklists.
2. **Startup Reconciliation vs Distributed Lock during Multi-Node Deployment**:
   - *Decision*: In a single-server setup, running reconciliation on boot is lightweight and eliminates discrepancies. In a clustered multi-node deployment, an elected leader (or distributed Redis lock using Redlock) would be used to prevent concurrent reconciliation sweeps.
3. **Soft Cancellation**:
   - *Decision*: When an email is cancelled, the BullMQ job is removed and MySQL records the status as `CANCELLED`. If the job was already in `PROCESSING`, the cancellation is safely rejected to preserve audit truth.
4. **Database Selection**:
   - *Decision*: MySQL with Prisma ORM was chosen to enforce strict relational foreign keys and compound indexes on `(status, scheduledAt)` and `(userId, status)`, optimizing dashboard performance under scale.
