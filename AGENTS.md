# AGENTS

## Delivery Policy

- Use a hard cutover approach. Do not preserve dead compatibility layers.
- Do not add feature flags, dual-write paths, or temporary fallback code unless explicitly requested.
- If an interface or wire shape changes, remove the old path in the same change unless a live dependency is explicitly named.

## Repo Shape

- This is a Node 20+ TypeScript npm workspace.
- Main packages:
  - `apps/api`: Express gateway
  - `apps/worker`: async job poller and refund worker
  - `packages/shared`: shared types, route registry, docs, auth, payment helpers, and stores
  - `packages/cli`: buyer CLI

## Product Scope

- Public marketplace scope is Fast-only for v1.
- Paid trigger routes are `POST /api/:provider/:operation`.
- Free retrieval is `GET /api/jobs/:jobToken` with wallet-bound auth.
- Auth is a temporary wallet challenge/session flow, not a permanent API key system.
- Refunds are treasury-based. There is no buyer marketplace balance.

## Change Rules

- Prefer making cross-cutting changes in `packages/shared` first, then wire API, worker, and CLI to the shared contract.
- Keep the route registry, OpenAPI output, `llms.txt`, and `.well-known/marketplace.json` generated from the same source of truth.
- If pricing changes, update payout split handling and related tests in the same change.
- Persist payout split data at charge time; do not defer that calculation to payout time.
- Keep Postgres and the in-memory test store behavior aligned.
- Pin `@fastxyz/*` dependencies to exact versions in `package.json` files; do not use caret ranges for the Fast package set.

## Deployment Assumptions

- Production deployment is expected to run separate services for:
  - API
  - worker
  - PostgreSQL
  - x402 facilitator
- The CLI is not deployed server-side.
- API runtime depends on:
  - `DATABASE_URL`
  - `MARKETPLACE_TREASURY_ADDRESS`
  - `MARKETPLACE_FACILITATOR_URL`
  - `MARKETPLACE_SESSION_SECRET`
  - optional `MARKETPLACE_BASE_URL`
- Worker runtime depends on:
  - `DATABASE_URL`
  - optional `FAST_RPC_URL`
  - `MARKETPLACE_TREASURY_PRIVATE_KEY` or `MARKETPLACE_TREASURY_KEYFILE`
  - optional `WORKER_POLL_INTERVAL_MS`

## Verification

- Run `npm run build` after code changes.
- Run `npm test` after behavior changes.
- Do not mark work complete if build or tests are broken unless you explicitly call that out.
