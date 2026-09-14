# ResolveRun — Engineering Notes

## Architecture

Modular monolith: **Next.js** UI (proxied `/api` → Fastify), **PostgreSQL** (Prisma) as source of truth, **Redis + BullMQ** (`job-executions`, `job-retries`, `job-verification`), separate **worker** and **scheduler** processes.

```
Browser → Next.js → Fastify API → PostgreSQL
                              ↘ Redis/BullMQ → Worker(s) → External HTTP
Scheduler → PostgreSQL (create QUEUED execution) → enqueue executionId
```

## Why TypeScript Instead of .NET

The brief allows alternate stacks. TypeScript end-to-end shares types between API and worker, ships faster in a take-home window, and keeps one language for UI, API, queue consumers, and tests—without implying .NET is inferior.

## Job Lifecycle

1. User defines HTTP job (risk level, optional cron, optional verification GET).
2. **Scheduler** finds due jobs, creates `QUEUED` execution with **configuration snapshot**, advances `next_run_at`, enqueues `executionId`.
3. **Manual run** creates execution + enqueue; optional `Idempotency-Key` dedupes within 24h via unique `(job_id, idempotency_key)`.
4. **Worker** receives BullMQ job → **atomic claim** in PostgreSQL → HTTP call → terminal state or retry.

## Queue and Workers

BullMQ carries only `{ executionId }`. Authoritative status, attempts, worker ownership, and history live in PostgreSQL. If Redis restarts, executions remain queryable; workers can re-enqueue stale `QUEUED` rows if needed.

Multiple workers use unique `WORKER_ID` and conditional `UPDATE … WHERE status = 'QUEUED'`.

## Concurrency (highlight)

**Concurrent claim test** (`src/tests/concurrency.test.ts`) runs two `claimExecutionById` calls in parallel against one row; exactly one succeeds. This proves the database guard—not application-level checks alone.

Scheduler dedup uses unique `(job_id, schedule_occurrence_key)` where the key is `jobId + scheduledFor`.

## Retry Strategy

Backoff: 10s → 30s → 90s. Retries on 408, 429, 5xx, and network errors when risk allows. Permanent 4xx (except 408/429) stop. `UNKNOWN` blocks automatic retry; manual **Retry anyway** uses `force: true`.

## Unknown Outcomes

**FAILED** = we know the operation did not succeed. **UNKNOWN** = request may have been processed (e.g. timeout on POST with HIGH risk). Blind retry risks duplicate payments/orders.

## Failure Recovery

`heartbeat_at` + lease timeout. Stale `RUNNING`: conservative jobs → `UNKNOWN`; otherwise re-`QUEUED` and re-enqueued.

## Database

`users`, `jobs`, `executions` (with `configuration_snapshot`, idempotency + schedule keys), `execution_events` (timeline). Indexes on `user_id`, `next_run_at`, `status`, `created_at`.

## Authentication and Authorization

bcrypt + JWT in HTTP-only cookie. Every job/execution query scoped by `user_id` (see `authorization.test.ts`).

## Security

Zod validation, Prisma parameterization, SSRF baseline (http/https only, block private/metadata hosts—DNS rebinding not fully solved), secret masking in UI.

## Product Decisions

UI highlights UNKNOWN and explains blocked retries. Execution uses **snapshot** at creation so edits do not change in-flight behavior.

## Tradeoffs

- Jobs use **soft delete** (`deleted_at`); execution history is retained.
- Verification is a single optional GET template, not a workflow language.

## Known Limitations

SSRF DNS rebinding; cron UTC only; no per-job retry tuning UI; Playwright E2E not included (Vitest integration tests instead).

## Future Improvements

Outbox for scheduler+queue; OpenTelemetry; network egress proxy for SSRF; dead-letter queue; richer verification adapters.
