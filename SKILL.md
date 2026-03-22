---
name: fast-marketplace
description: Discover services on the Fast Marketplace, choose the right endpoint, follow Community/direct or Verified/escrow payment flows, use fixed-price x402, variable top-up, or prepaid-credit routes with a funded local wallet, handle async job retrieval, onboard providers, manage draft services, rotate provider runtime keys, review marketplace demand intake, and submit or review marketplace supply. Use this when a user wants to browse or call APIs exposed through marketplace.example.com or api.marketplace.example.com, or manage marketplace supply from the provider/admin surfaces.
---

# Fast Marketplace

Use this skill when a user wants to work with APIs listed on the Fast Marketplace.

## Use this skill when

- the user wants to find a service or endpoint on `https://marketplace.example.com`
- the user needs the exact request body, proxy URL, or response shape for a marketplace endpoint
- the user wants to sign into `https://marketplace.example.com` with a Fast browser wallet
- the user wants to pay and execute a marketplace route directly from the website with the Fast browser extension
- the user needs to call a fixed-price x402 route, a variable top-up route, or a prepaid-credit route with a local Fast wallet
- the user needs to retrieve an async result from a previously paid job
- the user wants to suggest a missing endpoint or a new source/webservice for providers to build
- the user wants to create or update a provider profile and manage service drafts
- the user wants to create or rotate a provider runtime key for a prepaid-credit service
- the user wants to claim provider-visible request intake and route it into a draft service
- the user wants to verify provider website ownership and submit a service for review
- the user wants to review, publish, or suspend provider supply from the admin surface

## Do not use this skill when

- the user wants a direct provider integration outside the marketplace
- the task is generic web research rather than using marketplace routes

## Inputs to gather

Before acting, identify:

- whether the user is acting as a buyer, provider, or marketplace operator
- the service or domain the user wants
- the endpoint or outcome they need
- whether the route is free, `fixed_x402`, `topup_x402_variable`, or `prepaid_credit`
- whether the service settlement tier is `community_direct` or `verified_escrow`
- whether the route is sync or async
- whether they want browser login only, browser execution, or a CLI/agent-wallet flow
- whether they already have a funded Fast wallet
- which Fast network the deployment is using: mainnet or testnet
- whether they need website session auth, API-scoped wallet session auth, job retrieval auth, or admin token auth
- for provider flows: service metadata, payout wallet, website URL, endpoint schemas/examples, and upstream execution details

## Workflow

1. Identify the role and flow first: buyer, provider, or admin/operator.
2. If the flow is website-based, connect the Fast browser wallet from the site header and sign the website challenge.
3. Use the role-specific flow below.

## Buyer workflow

1. Open the marketplace UI at `https://marketplace.example.com` and locate the relevant service.
2. Open the service page and identify the route billing type from the published endpoint docs, labels, pricing, and examples.
3. If the user wants browser execution, use the endpoint's browser execution panel. Fixed-price and top-up routes pay through x402; prepaid-credit routes use the wallet session after the user is signed in.
4. If the user is delegating the task to another agent, copy the service page's "Use this service" block or the canonical skill URL.
5. For `fixed_x402` routes outside the browser panel, send the first request without payment proof, read the `402 Payment Required` response, pay from the funded wallet, and retry the same request with the payment proof headers.
6. For `topup_x402_variable` routes, include the requested amount in the request body, expect a `402` quote for that exact amount, pay it, and persist the credited response details.
7. For `prepaid_credit` routes, create an API-scoped wallet session through `/auth/challenge` and `/auth/session` or use `fast-marketplace auth api-session`; then invoke the route with the bearer token instead of x402 proof.
8. If the route returns `202 Accepted`, store the `jobToken` and switch to wallet-bound retrieval.
9. If the marketplace does not have the needed capability, submit a suggestion for an endpoint or source.

Settlement implications:

- `community_direct`: the x402 payment goes directly to the provider wallet; refunds and reimbursements are provider-owned
- `verified_escrow`: the x402 payment goes to marketplace treasury; the marketplace can refund failures, reconcile stale payments, and settle provider payouts later

## Billing flows

The marketplace is Fast-native and wallet-first.

### Fixed x402

1. Use a persistent local Fast wallet funded with `fastUSDC` on mainnet or `testUSDC` on testnet.
2. Send the first request without payment proof.
3. Read the `402` response and payment requirements.
4. Authorize payment from the wallet.
5. Retry the same request with the payment proof.

### Variable top-up

1. Send the top-up route with the requested amount in the JSON body.
2. Read the `402` response and verify it quotes the same intended amount.
3. Authorize payment from the wallet.
4. Retry the same request with the payment proof.
5. Persist the top-up response because it confirms the credited service balance.

### Prepaid credit

1. Fund service credit first through the service's `topup_x402_variable` route.
2. Create an API-scoped wallet session through `/auth/challenge` and `/auth/session`, or use `fast-marketplace auth api-session <provider> <operation>`.
3. Invoke the `prepaid_credit` route with the bearer token.
4. If using the CLI, `fast-marketplace invoke` will automatically switch to wallet-session auth when the route requires it.

Important constraints:

- paid routes do not use long-lived API keys
- website login uses a signed wallet challenge for the site session
- the website can also pay and execute routes directly through the Fast extension
- wallet identity is the payer identity
- use the same request body when retrying a payable route
- for safe retries, keep the same payment identifier for the same normalized request only
- prepaid-credit routes require funded service credit and wallet-session bearer auth instead of per-call x402
- Community/direct services still use verified provider onboarding and domain verification; the difference is money flow, not trust requirements

## Website auth flow

1. For website sessions, use the signed wallet challenge flow served by `/auth/wallet/challenge` and `/auth/wallet/session`.
2. The website session unlocks provider surfaces and browser-connected marketplace actions.
3. Website session auth is separate from API-scoped route sessions and job retrieval auth.

## API session flow

1. Create an API-scoped wallet challenge through `/auth/challenge` with `resourceType: "api"` and the route id as `resourceId`.
2. Sign the challenge with the same Fast wallet that owns the prepaid credit.
3. Exchange it at `/auth/session` for a bearer token.
4. Use that bearer token on `prepaid_credit` routes.

## Async retrieval flow

1. If a paid trigger returns `202`, persist the `jobToken`.
2. Create the job-scoped wallet auth session through `/auth/challenge` and `/auth/session`.
3. Poll `GET /api/jobs/{jobToken}` until the job completes or fails.
4. Use the same wallet that paid for the original trigger.

## Refund flow

1. If the service is `verified_escrow`, a sync paid trigger can refund immediately after payment verification failure.
2. If the service is `verified_escrow` and an async job permanently fails after acceptance, the worker issues a treasury refund.
3. If the service is `community_direct`, reimbursement is provider-owned because the buyer paid the provider wallet directly.
4. Read the job retrieval payload or sync error payload for refund status, transaction hash, and any refund error details.

## Provider workflow

1. Prefer the CLI path for agent-driven provider onboarding: create a spec JSON and run `fast-marketplace provider sync --spec <path>`.
2. The provider commands default to `AGENT_WALLET_KEY` from repo-root `.env`; use `--keyfile` only when you need to override that wallet.
3. `provider sync` upserts the provider profile, creates or updates the owned service draft by slug, reconciles endpoint drafts, and creates a runtime key only when a `marketplace_proxy` service does not already have one.
4. New provider services default to `community_direct`; providers cannot self-assign `verified_escrow` in v1.
5. For `community_direct`, publish only sync HTTP `fixed_x402` routes and keep the provider runtime key available so the marketplace can forward signed buyer identity headers.
6. For `verified_escrow`, `fixed_x402`, `topup_x402_variable`, and `prepaid_credit` are allowed only after review promotes the service.
7. For `topup_x402_variable` endpoints, set `minAmount` and `maxAmount`; the marketplace owns the top-up crediting flow.
8. For `prepaid_credit` endpoints, verify marketplace identity headers upstream and use the provider runtime credit APIs to reserve, capture, and release buyer credit.
9. Run `fast-marketplace provider verify --service <slug-or-id>` to mint a fresh verification challenge and show the exact URL and token the website must serve.
10. If verification requires touching deploy, DNS, or cloud env outside this repo, ask the user before taking that action. For arbitrary external sites, the agent should hand off the token and wait for confirmation rather than mutating infrastructure on its own.
11. After the user confirms the verification token is live, continue the same `provider verify` flow so the marketplace performs the ownership check.
12. Run `fast-marketplace provider submit --service <slug-or-id>` only after verification succeeds; this flow stops at `pending_review`, not admin publish.
13. If building from marketplace demand, review provider-visible request intake and claim the request you want to build before syncing the draft.
14. After admin publish, use the public service page and paid proxy routes as the canonical execution surface.

Important provider constraints:

- provider drafts are scoped to the wallet that owns the provider profile
- payout wallet validation happens at draft/update time
- community-direct services need a provider runtime key before publish
- top-up and prepaid-credit routes are Verified/escrow only
- prepaid-credit services need a provider runtime key before they can debit marketplace-held credit
- prepaid-credit upstreams should verify the signed marketplace identity headers before reserving or capturing credit
- changing the service website host requires re-verification before submission
- request intake claiming is exclusive once another provider has claimed it

## Admin and review workflow

1. Sign into `/admin/login` with the marketplace admin token.
2. Open the internal review surfaces for suggestions and submitted provider services.
3. Review suggestion intake, update statuses, and add operator notes as needed.
4. Review submitted provider services for correctness, pricing, ownership verification, and marketplace fit.
5. Assign the settlement tier during publish:
   `community_direct` for direct provider payment and provider-owned refunds
   `verified_escrow` for marketplace escrow, refunds, prepaid credit, and provider payout settlement
6. Publish approved services so they appear in the public catalog and route registry.
7. Suspend services when they should no longer be publicly executable.

## Troubleshooting

- `402 Payment Required`: the route is payable; submit payment and retry the same request
- `401 Unauthorized` on a prepaid-credit route: create an API-scoped wallet session for that route and retry with bearer auth
- `400` on a paid trigger: the request body or payment identifier is invalid
- `401 Unauthorized` on job retrieval: create a wallet-bound session from the same paying wallet
- `409 Conflict`: the payment identifier was reused with a different request body
- insufficient prepaid credit: buy more service credit through the top-up route before retrying
- permanent async failure after acceptance: escrow services use the marketplace refund policy; community/direct services require provider support
- provider submission blocked: complete website verification or fix draft validation errors
- provider community route blocked from publish: create a runtime key or switch the service to Verified during review
- provider prepaid route failing upstream: confirm the runtime key, signed identity header verification, and reserve/capture/release flow
- service website host changed: generate a new verification challenge and verify again
- provider request claim conflict: another provider already claimed the request
- admin review unavailable: confirm the correct admin token is present
- missing service or endpoint: submit a suggestion from the marketplace UI

## Discovery and reference URLs

- Marketplace UI: `https://marketplace.example.com`
- Canonical skill: `https://marketplace.example.com/skill.md`
- Suggest an endpoint: `https://marketplace.example.com/suggest?type=endpoint`
- Suggest a source: `https://marketplace.example.com/suggest?type=source`
- Provider dashboard: `https://marketplace.example.com/providers`
- Provider onboarding: `https://marketplace.example.com/providers/onboard`
- Provider services: `https://marketplace.example.com/providers/services`
- Admin login: `https://marketplace.example.com/admin/login`
- Admin provider services: `https://marketplace.example.com/admin/services`
- Admin suggestions: `https://marketplace.example.com/admin/suggestions`
- Website wallet login: use the `Connect Wallet` control in the site header
- OpenAPI: `https://api.marketplace.example.com/openapi.json`
- LLM summary: `https://api.marketplace.example.com/llms.txt`
- Marketplace catalog JSON: `https://api.marketplace.example.com/.well-known/marketplace.json`

## Example requests that should trigger this skill

- "Find me a paid Fast API for research signals."
- "Show me the exact curl body for a marketplace endpoint."
- "Call this Fast marketplace route and handle the 402 payment."
- "Top up credit for this marketplace service and then call the prepaid route."
- "Create an API session for this prepaid marketplace endpoint."
- "Retrieve the result for a previously paid async marketplace job."
- "Suggest a new source or endpoint for the marketplace."
- "Set up my provider profile and publish a new service."
- "Rotate the runtime key for my prepaid-credit provider service."
- "Claim this request intake item and turn it into a provider draft."
- "Review the admin queue and publish the submitted service."
