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
- `DEMO_SEED_ENABLED=false` for DB-backed production mode (seed + demo actor disabled). Set `true` only for hackathon demos/offline bootstrap.

Optional:

- `DATABASE_URL` — Postgres (Render/Supabase). Auto-normalized to `postgresql+asyncpg://`.
- `RAZORPAY_API_KEY` / `RAZORPAY_API_SECRET` — Razorpay credentials for settlement checkout.

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
- `GET /api/v1/catalog/products/{product_id}/passport`
- `POST /api/v1/catalog/products/{product_id}/passport/mint`
- `GET /api/v1/catalog/passports/{product_id}/metadata`
- `POST /api/v1/catalog/payments/checkout`
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

For production:

- Keep `DEMO_SEED_ENABLED=false`.
- Ensure `DATABASE_URL` points to your live Postgres instance.

## Supabase notes

Token-authenticated seller flows:

- Set `SUPABASE_URL` and optionally `SUPABASE_JWT_ISSUER`
- Claims: `weaver_id` / `seller_id` (or under `app_metadata`)
- Profile mapping via `user_profiles.user_id = sub`

## Ethereum Sepolia passport NFT

WeaveLink can mint an artisan-approved product record as an ERC-721 passport on
Ethereum Sepolia. The backend stores private and mutable application data in
Postgres; only a canonical SHA-256 record hash, public passport ID, recipient,
and metadata URI are anchored on-chain.

Required backend variables:

```bash
SEPOLIA_RPC_URL=https://...
SEPOLIA_PRIVATE_KEY=0x...
SEPOLIA_CHAIN_ID=11155111
SEPOLIA_EXPLORER_URL=https://sepolia.etherscan.io
WEAVE_PASSPORT_CONTRACT_ADDRESS=0x...
```

Use a dedicated testnet-only owner wallet. The private key is server-side only
and must never use a `NEXT_PUBLIC_` variable.

Deploy the contract from `../blockchain`:

```bash
pnpm install
pnpm compile
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
pnpm deploy:sepolia
```

Minting requires a verified seller and confirms that the seller owns the
product. Repeated requests are idempotent. If the canonical product record
changes after minting, the API rejects silent re-minting so a future versioned
passport can preserve history.

## Docker (optional local only)

```bash
docker compose up --build
```

Not used for Render production.
