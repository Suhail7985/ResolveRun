# Deploy: Render (backend) + Vercel (frontend)

The browser talks only to **Vercel**. Vercel proxies `/api` to **Render**. That keeps login cookies working.

```
User → Vercel (Next.js UI)
         └─ /api/*  →  Render (Fastify + worker + scheduler)
                            ├─ PostgreSQL
                            └─ Redis / BullMQ
```

## 1. Push the repo to GitHub

Render and Vercel both deploy from GitHub.

## 2. Backend on Render

1. [render.com](https://render.com) → **New** → **Blueprint**
2. Connect the GitHub repo (this `render.yaml`)
3. Apply the blueprint (Postgres + Redis + one web service)
4. After the first deploy, open **Environment** and set:

```text
CORS_ORIGIN=https://YOUR-APP.vercel.app
```

(You can add this after Vercel gives you the URL. Comma-separate extras, e.g. `https://x.vercel.app,http://localhost:3000`.)

5. Copy the Render URL, e.g. `https://resolverun-api.onrender.com`  
   Confirm: `https://resolverun-api.onrender.com/api/health`

Free Render web services **spin down** after idle time. The first request after sleep can take 30–60s. Workers run on the same service via `scripts/start-all.mjs`.

If the **TypeScript** build fails on Render (`Cannot find name 'process'`), the service is skipping devDependencies. The blueprint uses `npm ci --include=dev` so types are installed at build time. Push this change and **Manual Deploy**.

```text
?sslmode=require
```

## 3. Frontend on Vercel

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → same GitHub repo
2. **Root Directory:** `frontend` (important)
3. Framework: Next.js (auto)
4. Environment variables:

| Name | Value |
|------|--------|
| `API_INTERNAL_URL` | `https://resolverun-api.onrender.com` (no trailing slash) |

Do **not** set `NEXT_PUBLIC_API_URL` to Render. The UI must keep using `/api/...` on Vercel.

5. Deploy
6. Copy the Vercel URL → paste into Render `CORS_ORIGIN`
7. Redeploy Render (or **Manual Deploy**) so CORS picks it up

## 4. Check the live app

1. Open the Vercel URL — landing page
2. Sign up
3. Create a job with `https://YOUR-RENDER-API.onrender.com/api/demo/success`
   (or keep `http://localhost:4000/...` only for local; **on production use the Render demo URL**)
4. Run now — worker on Render should execute it

Demo job URL in production must be a **public HTTPS URL**. `localhost` from Render workers will fail.

Use:

```text
https://resolverun-api.onrender.com/api/demo/success
```

## 5. Local vs production

| | Local | Production |
|--|--------|------------|
| UI | `npm run dev:web` | Vercel |
| API / worker | `npm run dev:api` etc. | Render |
| DB / Redis | Docker | Render Postgres + Redis |

## Common issues

| Symptom | Fix |
|---------|-----|
| Login does nothing / 502 | `API_INTERNAL_URL` missing or wrong on Vercel |
| CORS error | Set `CORS_ORIGIN` to exact Vercel URL (`https://…`) |
| Jobs stay QUEUED | Render service crashed — check logs; Redis must be up |
| First load is slow | Render free sleep — wait and retry |
| Demo job fails | Job URL still points at `localhost` |
