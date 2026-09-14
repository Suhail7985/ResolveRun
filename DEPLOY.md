# Deploy: Render (backend) + Vercel (frontend)

Backend URL: **https://resolverun-api.onrender.com**

The browser talks only to **Vercel**. Vercel proxies `/api` to Render so login cookies work.

## Vercel (do this next)

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → this GitHub repo
2. **Root Directory:** `frontend`
3. Framework: Next.js
4. Environment variables (Production + Preview):

| Name | Value |
|------|--------|
| `API_INTERNAL_URL` | `https://resolverun-api.onrender.com` |
| `NEXT_PUBLIC_DEMO_API_URL` | `https://resolverun-api.onrender.com` |

Do **not** set `NEXT_PUBLIC_API_URL`. The UI must use `/api/...` on Vercel.

5. Deploy
6. Copy your Vercel URL (e.g. `https://resolverun.vercel.app`)

## After Vercel is live

On Render → **resolverun-api** → Environment:

```text
CORS_ORIGIN=https://YOUR-APP.vercel.app
```

Save and **Manual Deploy** Render (or wait for restart).

## Check

1. `https://resolverun-api.onrender.com/api/health` → `"status":"ok"` (first hit can be slow)
2. Open the Vercel site → landing → Sign up
3. New job URL default is already `https://resolverun-api.onrender.com/api/demo/success`
4. Run now — wait if Render was sleeping

## Demo URLs (workers call these from Render)

```text
https://resolverun-api.onrender.com/api/demo/success
https://resolverun-api.onrender.com/api/demo/flaky/demo1
https://resolverun-api.onrender.com/api/demo/payment
```
