# Agents Marketplace — commerce phase 1

Permissionless merchant registry + fan-out search for AI shopping agents.

This repo is a trimmed fork of the upstream Fast Marketplace, stripped down
to the commerce-phase-1 abstraction only. The data-API / provider /
credit / payout / facilitator / worker layers were removed; this service
does discovery, signs merchant-handle hints, and accepts post-settle
attribution callbacks from merchants.

## What's here

```
apps/api/                  Express server exposing /commerce/* + /admin/commerce/*
  src/app.ts               Minimal bootstrap (commerce routes + health)
  src/commerce.ts          The four phase-1 route groups
  src/index.ts             Entry point — reads env, starts the server

packages/shared/
  src/commerce.ts          HMAC sign/verify + fanOutCommerceSearch
  src/secrets.ts           aes-256-gcm encrypt/decrypt
  src/store.ts             commerce_shops table (InMemory + Postgres impls)
  src/types.ts             Commerce type surface
  src/auth.ts              parseBearerToken

docs/commerce-phase-1.md   Operator walkthrough: deploy, seed, verify E2E
docker/api.Dockerfile      Container build
```

## Endpoints

Public:
- `GET  /commerce/shops`            — list active merchants (buyer-facing summary)
- `GET  /commerce/search?q=…`       — fan-out search, returns signed merchant hints
- `POST /commerce/orders/notify`    — merchant-originated settle callback (hint-verified)
- `GET  /health`                    — liveness
- `GET  /.well-known/marketplace.json`

Admin (bearer `$MARKETPLACE_ADMIN_TOKEN`):
- `POST  /admin/commerce/shops`            — upsert a shop (encrypts plaintext server-side)
- `GET   /admin/commerce/shops[?status=…]` — list all / filter
- `GET   /admin/commerce/shops/:shopId`    — one
- `PATCH /admin/commerce/shops/:shopId`    — pause / rotate hint / edit fields

See [docs/commerce-phase-1.md](docs/commerce-phase-1.md) for the detailed
operator guide covering deploy, seeding, end-to-end verification, and
graceful-degradation / runtime-enable semantics.

## Quick start (local)

```bash
# 1. Postgres
docker run -d --name fast-marketplace-pg \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fast_marketplace \
  -p 5433:5432 postgres:16

# 2. Install and run
npm install
export DATABASE_URL=postgres://postgres:postgres@localhost:5433/fast_marketplace
export MARKETPLACE_SECRETS_KEY=$(openssl rand -hex 32)
export MARKETPLACE_ADMIN_TOKEN=$(openssl rand -hex 32)
npm run dev:api

# 3. Smoke test
curl http://localhost:3000/health
curl http://localhost:3000/commerce/shops    # → { "shops": [] } until you seed one
```

## Tests

```bash
npm test
```

Covers the HMAC crypto contract, fan-out semantics (deadline, concurrency,
per-shop timeout, error isolation), every HTTP endpoint's happy + failure
paths, and the admin endpoints' auth + encryption behavior.
