# ResolveRun

**Don't blindly retry what you can't prove failed.**

Job automation platform for HTTP workloads with PostgreSQL-backed execution state, Redis/BullMQ delivery, multiple workers, scheduler deduplication, and **UNKNOWN** outcome handling for risky side effects.

## Product Overview

Authenticated users create HTTP jobs with risk levels (LOW/MEDIUM/HIGH), schedules, and manual runs. Workers execute asynchronously; the UI shows execution timelines, retry decisions, and why automatic retry was blocked.

## Features

- Session auth (register / login / logout)
- Job CRUD, enable/disable, cron scheduling
- Manual run with optional `Idempotency-Key`
- BullMQ + Redis queue, multiple workers
- Atomic execution claiming in PostgreSQL
- Retries with exponential backoff
- UNKNOWN outcomes + optional verification GET
- Stale worker recovery via heartbeats
- Dashboard with attention count for UNKNOWN
- Demo HTTP endpoints for local evaluation
- Vitest integration tests (including real concurrent claim)

## Architecture

See [ENGINEERING.md](./ENGINEERING.md).

## Tech Stack

- **Frontend:** Next.js 15, React, TypeScript, Tailwind CSS
- **API:** Fastify (TypeScript)
- **DB:** PostgreSQL + Prisma
- **Queue:** Redis + BullMQ
- **Workers:** Separate Node process(es)
- **Scheduler:** Separate Node process
- **Docker Compose** for local full stack

## Project Structure

```
backend/          API, worker, scheduler, Prisma, tests
frontend/         Next.js UI (proxies /api to backend)
docker-compose.yml
```

## Local Setup

### Prerequisites

- Node.js 22+
- Docker (for Postgres + Redis) or local installs

### 1. Environment

```bash
cp .env.example .env
# Edit AUTH_SECRET (32+ chars) and DATABASE_URL if needed
```

Copy env for backend:

```bash
cp .env backend/.env
```

### 2. Start infrastructure

```bash
docker compose up -d postgres redis
```

### 3. Install & migrate

```bash
npm run install:all
cd backend && npx prisma migrate deploy && cd ..
```

### 4. Run processes (separate terminals)

```bash
npm run dev:api        # :4000
npm run dev:worker     # worker-1
npm run dev:scheduler
npm run dev:web        # :3000
```

Open http://localhost:3000

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis for BullMQ |
| `AUTH_SECRET` | JWT signing secret (min 16 chars) |
| `API_PORT` | API port (default 4000) |
| `CORS_ORIGIN` | Allowed origin (default http://localhost:3000) |
| `WORKER_ID` | Unique worker identifier |
| `NEXT_PUBLIC_API_URL` | Public API URL for builds |

## Running Tests

From the repo root (starts Docker Postgres/Redis when available, runs migrations, then Vitest):

```bash
npm test
```

- **Unit tests** always run (retry, unknown, state machine).
- **Integration tests** (concurrency, auth, idempotency, recovery) run when Postgres is reachable; they are skipped otherwise.

With Docker running, all 12 tests should pass. Queue I/O is disabled in tests (`SKIP_QUEUE=true`).

## Docker (full stack)

```bash
docker compose up --build
```

- UI: http://localhost:3000
- API: http://localhost:4000
- API docs: http://localhost:4000/api/docs

## Public deploy (Vercel + Render)

See **[DEPLOY.md](./DEPLOY.md)**.

- **Frontend:** Vercel, root directory `frontend`, env `API_INTERNAL_URL` = Render API URL  
- **Backend:** Render Blueprint (`render.yaml`) — API + worker + scheduler + Postgres + Redis  

Do not put the whole app on Vercel. Workers cannot run there.

## API Documentation

OpenAPI UI at `/api/docs`. Core routes:

| Method | Path |
|--------|------|
| POST | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` |
| GET | `/api/auth/me` |
| GET/POST | `/api/jobs` |
| GET/PATCH/DELETE | `/api/jobs/:id` |
| POST | `/api/jobs/:id/run`, `/enable`, `/disable` |
| GET | `/api/jobs/:id/executions` |
| GET | `/api/executions/:id` |
| POST | `/api/executions/:id/retry` (body: `{ "force": true }` for UNKNOWN) |
| POST | `/api/executions/:id/verify` |
| GET | `/api/dashboard`, `/api/health` |
| GET | `/api/demo/success`, `/api/demo/flaky/:key`, etc. |

## Demo Flow (~2 min)

1. Register and sign in.
2. Dashboard → **New job**.
3. URL: `http://localhost:4000/api/demo/success` → Run now → watch QUEUED → RUNNING → SUCCEEDED.
4. Create job with flaky URL `http://localhost:4000/api/demo/flaky/demo1` (LOW risk GET) to see retries.
5. Create HIGH risk POST to `http://localhost:4000/api/demo/payment` with low timeout (e.g. 3000ms) → UNKNOWN → read blocked retry copy → **Verify** or **Retry anyway**.

## Key Engineering Decisions

- PostgreSQL is source of truth; Redis only delivers work references.
- Configuration **snapshotted** on execution create.
- Manual runs without idempotency key allow independent executions; with key, deduped.
- UNKNOWN manual retry requires explicit `force: true`.

## E2E tests (Playwright)

```bash
npm run build
npm run test:e2e:install
docker compose up -d postgres redis
cd backend && npx prisma migrate deploy && cd ..
npm run test:e2e
```

## Known Limitations

- SSRF protection is baseline, not complete.
- UTC cron only.
- Public deployment URL is still your responsibility.

## Future Improvements

See ENGINEERING.md.
