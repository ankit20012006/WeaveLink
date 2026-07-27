# WeaveLink Backend

FastAPI service for catalog, authenticity passports, RFQs, and seller desk APIs.

**Production host: [Render](https://render.com) — native Python (not Docker).**

## Local run (no Docker)

```bash
cd backend
cp .env.example .env
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or with uv:

```bash
uv sync
uv run uvicorn app.main:app --reload
```

Leave `DATABASE_URL` empty to use the in-memory seed store (catalog + RFQ + listing create) for quick bootstraps.

## Render deploy

See root [README](../README.md#deploy-backend-to-render-recommended).

Summary:

| Setting | Value |
| --- | --- |
| Root Directory | `backend` |
| Build | `pip install -r requirements.txt` |
| Start | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health check | `/health` |
| Python | `3.12.x` (`runtime.txt` / `PYTHON_VERSION`) |

Required env for a browser frontend:

- `BACKEND_CORS_ORIGINS` — Vercel origin(s), comma-separated
- `DEMO_SEED_ENABLED=true` — seed catalog + `X-Demo-Weaver-Id` actor header

Optional:

- `DATABASE_URL` — Postgres (Render/Supabase). Auto-normalized to `postgresql+asyncpg://`.

Blueprint file: [`../render.yaml`](../render.yaml).

## Commands

- `uv run ruff check .`
- `uv run mypy app`
- `uv run pytest -q`
- `uv run alembic -c alembic.ini upgrade head`

## Public API v1

- `GET /api/v1/health`
- `GET /api/v1/ready`
- `GET /api/v1/catalog/products`
- `GET /api/v1/catalog/products/{product_id}`
- `GET /api/v1/catalog/verify/{serial}`
- `GET /api/v1/catalog/clusters` · `/techniques` · `/categories`
- `GET /api/v1/catalog/seller/{weaver_id}/orders` · `/products` · `/stats` · `/rfqs`
- `GET /api/v1/catalog/me/orders` · `/products` · `/rfqs` · `/stats` (JWT or seed actor header)
- `POST /api/v1/catalog/rfq`
- `PATCH /api/v1/catalog/rfq/{rfq_id}`
- `POST /api/v1/catalog/products`
- `PATCH /api/v1/catalog/products/{product_id}` · `/status`
- `POST /api/v1/catalog/orders`
- `PATCH /api/v1/catalog/orders/{order_id}/status`
- `GET /api/v1/auth/me` · `/me/roles`
- `PATCH /api/v1/auth/me`

Responses use camelCase aliases for frontend compatibility.

## Seed actor header

When `DEMO_SEED_ENABLED=true`:

```http
X-Demo-Weaver-Id: w-lakshmi
```

acts as a verified weaver for listing create / RFQ status in seed mode.

## Supabase notes

Token-authenticated seller flows:

- Set `SUPABASE_URL` and optionally `SUPABASE_JWT_ISSUER`
- Claims: `weaver_id` / `seller_id` (or under `app_metadata`)
- Profile mapping via `user_profiles.user_id = sub`

## Docker (optional local only)

```bash
docker compose up --build
```

Not used for Render production.
