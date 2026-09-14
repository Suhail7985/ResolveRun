# ResolveRun — Engineering Notes

**Don't blindly retry what you can't prove failed.**

Live UI: [https://resolve-run.vercel.app](https://resolve-run.vercel.app)  
API: `https://resolverun-api.onrender.com` (OpenAPI at `/api/docs`)

## Architecture

Modular TypeScript monolith split by **process**, not by language:

| Process | Role |
|---------|------|
| Next.js (`frontend/`) | Landing, auth UI, dashboard, jobs, executions. Browser never calls Render directly. |
| Fastify API (`backend/`) | Auth, CRUD, run/retry/verify, dashboard, demo HTTP endpoints. |
| Worker | Claims executions, performs outbound HTTP, writes terminal state + events. |
| Scheduler | Due cron jobs → `QUEUED` execution + enqueue. |
| PostgreSQL + Prisma | Source of truth for users, jobs, executions, timeline. |
| Redis + BullMQ | Delivery only: `job-executions`, `job-retries`, `job-verification`. Payload is `{ executionId }`. |

```
Browser → Next.js (same-origin /api)
            ├─ /api/auth/*  → Route Handler (rewrites Set-Cookie onto Vercel host)
            └─ /api/*       → rewrite to Fastify
                              Fastify → PostgreSQL
                                     ↘ Redis/BullMQ → Worker → External HTTP
Scheduler → PostgreSQL (QUEUED + snapshot) → enqueue executionId
```

Locally, four terminals (`dev:api`, `dev:worker`, `dev:scheduler`, `dev:web`). On Render free, `backend/scripts/start-all.mjs` runs API + worker + scheduler in one web service after `prisma migrate deploy` and `seed-demo`.

## Why TypeScript Instead of .NET

The brief allows an alternate stack. One language covers UI, API, workers, scheduler, and tests in a take-home window. That is a delivery choice, not a claim that .NET is weaker for this problem.

## Frontend product surface

- Public **landing** explaining UNKNOWN vs FAILED (no login required).
- **Register / login**. Reviewer demo: `reviewer@resolverun.app` / `Reviewer123!` (seeded on API start; prefilled on `/login`). Demo user skips onboarding.
- **Onboarding** (per-user `localStorage`) then dashboard, jobs (create/edit/enable/disable/run), executions list + detail (timeline, verify, retry anyway).
- **Logout** clears the httpOnly cookie and lands on `/` with `?loggedOut=1` so the logged-in redirect does not bounce back to the dashboard.

Job form defaults demo URLs to `NEXT_PUBLIC_DEMO_API_URL` in production (Render HTTPS) so workers can reach them. Local defaults stay `http://localhost:4000`.

## Auth and cookies

- bcrypt password hash + JWT in httpOnly cookie `resolverun_token` (`SameSite=Lax`, `Secure` in production).
- Cross-origin cookies to Render would fail on Vercel. Auth is proxied in `frontend/src/app/api/auth/[...slug]/route.ts` so the cookie is issued for the Vercel host. Other API paths use Next rewrites (`API_INTERNAL_URL`).
- Do **not** set `NEXT_PUBLIC_API_URL` on Vercel (that would send the browser to Render and drop the session).
- Job and execution queries are always scoped by `user_id` (`authorization.test.ts`).

## Job lifecycle

1. User defines HTTP job (method, URL, headers/body, timeout, risk LOW/MEDIUM/HIGH, optional cron UTC, optional verification GET).
2. **Scheduler** finds due enabled jobs, creates a `QUEUED` execution with a **configuration snapshot**, sets `schedule_occurrence_key` (`jobId` + scheduled instant), advances `next_run_at`, enqueues `executionId`.
3. **Manual run** creates execution + enqueue. Optional `Idempotency-Key` unique on `(job_id, idempotency_key)` for 24h-style dedup of the same key.
4. **Worker** dequeues → **atomic claim** (`UPDATE … WHERE status = 'QUEUED'`) → heartbeat while running → HTTP → `SUCCEEDED` / `FAILED` / `RETRYING` / `UNKNOWN` / `VERIFYING`.

Edits to the job after enqueue do not change in-flight work; the snapshot is authoritative.

## Queue and workers

BullMQ is a mailbox. Status, attempts, worker ownership, retry decision, and history live in PostgreSQL. Redis loss does not erase executions; recovery can re-enqueue stale `QUEUED` / lease-expired `RUNNING` rows.

Multiple workers need unique `WORKER_ID`. Claim is the concurrency guard—not “check then update” in application memory.

## Concurrency

`backend/src/tests/concurrency.test.ts` runs two `claimExecutionById` calls in parallel on one row; exactly one succeeds.

Scheduler double-fire is blocked by unique `(job_id, schedule_occurrence_key)`.

## Retry strategy

Backoff: **10s → 30s → 90s**, default max attempts 3. Retry on 408, 429, 5xx, and many network errors when risk policy allows. Other 4xx are terminal `FAILED`.

**UNKNOWN** never auto-retries. UI and API require explicit retry with `{ "force": true }` (`retryDecision` `BLOCKED` / `MANUAL_ONLY`).

HIGH-risk side-effecting methods (e.g. POST) plus timeout or retryable HTTP → `UNKNOWN`. MEDIUM + timeout on side-effecting methods also maps to `UNKNOWN`. LOW is more willing to treat timeouts as `FAILED` and retry.

## Unknown vs failed

**FAILED** = we can treat the operation as not having succeeded.  
**UNKNOWN** = the request may already have completed (timeout, lost response, stale worker on a dangerous job). Blind retry can duplicate payments/orders.

Optional **verify**: worker (or API) issues a configured GET; status `VERIFYING` then a recorded outcome so a human can retry with evidence.

## Failure recovery

Workers write `heartbeat_at`. Lease timeout (`WORKER_LEASE_MS`): stale `RUNNING` rows are recovered. Conservative (HIGH + side-effecting) → `UNKNOWN`. Otherwise re-`QUEUED` and re-enqueued (`triggerType` `RECOVERY`).

## Database

Prisma models: `users`, `jobs` (soft delete `deleted_at`), `executions` (`configuration_snapshot`, idempotency + schedule keys, `retry_decision` / `retry_reason`), `execution_events` (append-only timeline).

Statuses: `QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED`, `RETRYING`, `UNKNOWN`, `VERIFYING`, `CANCELLED`.

Indexes: `user_id`, `next_run_at`, `enabled+next_run_at`, `deleted_at`, execution `status`, `created_at`, `status+scheduled_retry_at`.

## Security

Zod on inputs; Prisma parameterized SQL; SSRF baseline in `ssrf.ts` (http/https only, block localhost/private/link-local/cloud metadata hostnames; **DNS rebinding is not fully solved**). Secrets in headers are masked in the UI. CORS on Fastify is `CORS_ORIGIN` (production: `https://resolve-run.vercel.app`).

## Production topology

See [DEPLOY.md](./DEPLOY.md).

- **Vercel** — Next.js, root directory `frontend`. Env: `API_INTERNAL_URL`, `NEXT_PUBLIC_DEMO_API_URL` = Render API.
- **Render** — Postgres, Redis, Node web service (`render.yaml`). Start: migrate → seed demo user → `start-all.mjs`.
- Workers cannot run on Vercel; outbound job HTTP happens on Render.

## Tests

- **Vitest** (`backend/`): retry/unknown/state machine unit tests; integration for concurrent claim, authz, duplicate run/idempotency, stale recovery. `SKIP_QUEUE=true` in tests. Postgres required for integration; otherwise those tests skip.
- **Playwright** (`e2e/smoke.spec.ts`): landing, login, register headings; API health. Not a full job-run E2E.

## Tradeoffs

- Soft-deleted jobs keep execution history.
- Verification is one optional GET template, not a workflow language.
- Render free: one dyno for API+worker+scheduler; cold starts; demo endpoints live on the same API.
- Onboarding completion is client `localStorage`, not a DB column (demo account bypasses it).

## Known limitations

SSRF DNS rebinding; UTC cron only; no per-job retry-tuning UI; Playwright does not drive a full UNKNOWN payment path; single-region Render; no outbox (scheduler enqueue can theoretically diverge from the row if Redis is down after commit).

## Future improvements

Transactional outbox for scheduler+queue; OpenTelemetry; egress proxy for SSRF; dead-letter queue; richer verification adapters; persist onboarding on the user row; split worker/scheduler into dedicated Render services if load grows.
