# WeaveLink

Authenticated direct-market platform for rural handloom weavers.

**Handloom Hackathon 2026 · Theme 2 — Market Access & Digital Integration**

## Architecture

| Layer | Stack | Host |
| --- | --- | --- |
| Frontend | Next.js 16 + Tailwind | Vercel |
| Backend | FastAPI (`/api/v1`) | **Render** (native Python, not Docker) |
| Data | Render Postgres / Supabase | Render Postgres / local |

The frontend is API-first and resilient to connectivity issues by operating on live endpoints with offline draft sync retries (`src/lib/weavelink-api.ts`).

## Quick start (local)

### 1. Backend

```bash
cd backend
cp .env.example .env
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Optional with [uv](https://github.com/astral-sh/uv):

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

- Health: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- Ready: [http://127.0.0.1:8000/api/v1/ready](http://127.0.0.1:8000/api/v1/ready)
- OpenAPI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 2. Frontend

```bash
cp .env.example .env.local
# NEXT_PUBLIC_WEAVELINK_API_URL=http://127.0.0.1:8000/api/v1
pnpm install
pnpm dev
```

Open https://weave-link.vercel.app/ (or your Vercel deployment).

### 3. Smoke-check the wire-up

```bash
pnpm health:api
```

## Deploy backend to Render (recommended)

This repo ships a **native Python** Render Blueprint — **no Docker**.

1. Push this repo to GitHub.
2. In [Render](https://dashboard.render.com/) → **New** → **Blueprint** → select the repo (uses `render.yaml`).
3. Or **New Web Service** manually:
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health check path:** `/health`
4. Set environment variables:

| Variable | Example | Notes |
| --- | --- | --- |
| `APP_ENV` | `production` | |
| `DEMO_SEED_ENABLED` | `false` | Keep seed/demo data off for production |
| `BACKEND_CORS_ORIGINS` | `https://your-app.vercel.app` | Comma-separated if multiple |
| `FRONTEND_URL` | `https://your-app.vercel.app` | |
| `DATABASE_URL` | *(optional)* | Render Postgres / Supabase |
| `PYTHON_VERSION` | `3.12.8` | Matches `backend/runtime.txt` |

5. After deploy, note the service URL, e.g. `https://weavelink.onrender.com`.

Legacy route redirects are included in the frontend:

- `/seller` → `/dashboard`
- `/start-listing` → `/sell`

Free-tier cold starts can take ~30–60s on first request; sell/listing actions retry with queued offline sync when API returns.

### Optional: Render Postgres

Attach a Postgres instance and set `DATABASE_URL` to the internal or external URL. The app rewrites `postgres://` / `postgresql://` to `postgresql+asyncpg://` automatically and creates tables on startup.

## Deploy frontend to Vercel

```bash
# or use the Vercel dashboard
./deploy-vercel.sh
```

Set on Vercel (Production + Preview):

```bash
NEXT_PUBLIC_WEAVELINK_API_URL=https://weavelink.onrender.com/api/v1
```

Redeploy the frontend after changing env vars.

Also set Render `BACKEND_CORS_ORIGINS` to your Vercel origin(s).

## Routes

1. `/` — Landing with hero and marketplace entry points
2. `/sell` — Voice / photo listing with AI draft and sync queue
3. `/verify/<serial>` — Passport scan
4. `/product/p-kanchi-maroon` — Product page and weaver story
5. `/b2b` — Bulk RFQ desk
6. `/dashboard` — Seller orders, inventory, RFQ inbox
7. `/marketplace` — Filtered authenticated browsing
8. `/seller` — Redirects to `/dashboard`
9. `/start-listing` — Redirects to `/sell`

## Public API v1

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Liveness |
| `GET` | `/api/v1/ready` | Readiness (`ready` / `degraded` / `offline`) |
| `GET` | `/api/v1/catalog/products` | Marketplace filters |
| `GET` | `/api/v1/catalog/products/{id}` | Product detail |
| `GET` | `/api/v1/catalog/verify/{serial}` | Passport verification |
| `GET` | `/api/v1/catalog/clusters` · `/techniques` · `/categories` | Facets |
| `GET` | `/api/v1/catalog/seller/{weaverId}/orders` · `/products` · `/stats` · `/rfqs` | Seller desk |
| `POST` | `/api/v1/catalog/rfq` | B2B RFQ |
| `PATCH` | `/api/v1/catalog/rfq/{id}` | Accept / reject |
| `POST` | `/api/v1/catalog/products` | Create listing |
| `GET` | `/api/v1/catalog/products/{id}/passport` | Sepolia NFT status |
| `POST` | `/api/v1/catalog/products/{id}/passport/mint` | Owner-authorized ERC-721 mint |
| `GET` | `/api/v1/catalog/passports/{id}/metadata` | Public NFT metadata |

## Ethereum Sepolia passport

The prototype includes an OpenZeppelin ERC-721 contract under `blockchain/`.
A verified product owner can submit a real Sepolia mint from the product page,
refresh confirmation status, and open the transaction on Sepolia Etherscan.
Only a canonical product-record hash and public metadata reference are
anchored; private artisan and KYC data remain off-chain.

JSON uses **camelCase** field names to match frontend types.

## Design

Light **Indigo Warp** system — Fraunces + Figtree, warp-thread motif, live API health strip.

## Repo layout

```
WeaveLink/
├── src/                 # Next.js app
├── backend/             # FastAPI (Render rootDir)
│   ├── app/
│   ├── requirements.txt # pip / Render
│   ├── runtime.txt      # Python 3.12.x
│   └── pyproject.toml    # uv / local tooling
├── render.yaml          # Render Blueprint (native Python)
├── scripts/check-backend-health.mjs
└── .env.example         # frontend env template
```

## Docker (optional local only)

Docker Compose remains available under `backend/` for local Postgres + API, but **production on Render does not use Docker**.

```bash
cd backend
docker compose up --build
```
