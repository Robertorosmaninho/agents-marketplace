---
name: fast-marketplace
description: Discover services on the Fast Marketplace, choose the right endpoint, follow Community/direct or Verified/escrow payment flows, use fixed-price x402, variable top-up, or prepaid-credit routes with a funded local wallet, handle async job retrieval, onboard providers, manage draft services, rotate provider runtime keys, review marketplace demand intake, and submit or review marketplace supply. Use this when a user wants to browse or call APIs exposed through marketplace.fast.xyz or api.marketplace.fast.xyz, or manage marketplace supply from the provider/admin surfaces. Route direct FAST SDK, AllSet bridge, hosted ramp, or generic x402 package work outside the marketplace to the main FAST skill instead.
---

# Fast Marketplace

Use this skill when a user wants to work with APIs listed on the Fast Marketplace.

## Relationship to the main FAST skill

- this skill is the marketplace-specific layer on top of the FAST SDK and x402 packages
- keep this skill scoped to marketplace-hosted routes, provider workflows, and admin workflows
- if the task is direct wallet work, bridge/ramp work, or generic x402 package integration outside marketplace routes, use the main FAST skill at `https://skill.fast.xyz/skill.md`
- marketplace v1 is Fast-only; do not broaden this skill into generic EVM or non-marketplace API monetization guidance
- the canonical public hosts are `https://marketplace.fast.xyz` for the web app and `https://api.marketplace.fast.xyz` for the API; non-production deployments may rewrite these URLs when serving `/skill.md`

## Use this skill when

- the user wants to find a service or endpoint on `https://marketplace.fast.xyz`
- the user needs the exact request body, proxy URL, or response shape for a marketplace endpoint
- the user wants to sign into `https://marketplace.fast.xyz` with a Fast browser wallet
- the user wants to pay and execute a marketplace route directly from the website with the Fast browser extension
- the user needs to call a fixed-price x402 route, a variable top-up route, or a prepaid-credit route with a local Fast wallet
- the user wants to connect the marketplace to an MCP-capable agent client with a local stdio MCP server
- the user needs to retrieve an async result from a previously accepted job
- the user wants to suggest a missing endpoint or a new source/webservice for providers to build
- the user wants to create or update a provider profile and manage service drafts
- the user wants to create or rotate a provider runtime key for an async, prepaid-credit, or community-direct service
- the user wants to claim provider-visible request intake and route it into a draft service
- the user wants to verify provider website ownership and submit a service for review
- the user wants to review, publish, or suspend provider supply from the admin surface

## Do not use this skill when

- the user wants direct `@fastxyz/sdk` wallet, balance, send, signature, or token-info work outside the marketplace
- the user wants Fast <-> EVM bridge flows, hosted ramp flows, or `@fastxyz/allset-sdk` guidance
- the user wants generic `@fastxyz/x402-client`, `@fastxyz/x402-server`, or `@fastxyz/x402-facilitator` integration outside marketplace routes
- the user wants a direct provider integration outside the marketplace
- the task is generic web research rather than using marketplace routes
- the user wants a hosted MCP service; the marketplace MCP integration is local stdio in v1

## Inputs to gather

Before acting, identify:

- whether the user is acting as a buyer, provider, or marketplace operator
- the service or domain the user wants
- the endpoint or outcome they need
- whether the route is free, `fixed_x402`, `topup_x402_variable`, or `prepaid_credit`
- whether the service uses `verified_escrow` settlement
- whether the route is sync or async
- whether they want browser login only, browser execution, or a CLI/agent-wallet flow
- whether they already have a funded Fast wallet
- which Fast network the deployment is using: mainnet or testnet
- which settlement token the published marketplace route expects for that deployment; marketplace uses `USDC` on mainnet and `testUSDC` on testnet
- which x402 `accepts[*].asset` id the route returned; treat that asset id as authoritative over any human nickname
- whether they need website session auth, API-scoped wallet session auth, job retrieval auth, or admin token auth
- for provider flows: service metadata, payout wallet, website URL, endpoint schemas/examples, and upstream execution details

## Workflow

1. Identify the role and flow first: buyer, provider, or admin/operator.
2. If the flow is website-based, connect the Fast browser wallet from the site header and sign the website challenge.
3. Use the role-specific flow below.

## CLI setup

Before using CLI commands from this skill:

1. Run `npm install` at the repo root.
2. Use `npm run cli -- ...` from this workspace as the default invocation path.
3. Treat `fast-marketplace ...` as the command name exposed by the CLI itself; if the package is installed globally or linked into `$PATH`, the same subcommands can be run directly as `fast-marketplace ...`.
4. For provider flows, put `AGENT_WALLET_KEY`, `MARKETPLACE_API_BASE_URL`, and `MARKETPLACE_FAST_NETWORK` in the repo-root `.env`.

Examples:

- `npm run cli -- wallet init`
- `npm run cli -- use <provider>.<operation> --input '{"query":"alpha"}'`
- `npm run cli -- provider sync --spec ./provider-spec.json`

Provider env example:

```bash
AGENT_WALLET_KEY=<fast private key hex>
MARKETPLACE_API_BASE_URL=https://api.marketplace.fast.xyz
MARKETPLACE_FAST_NETWORK=mainnet
```

The current provider CLI is this workspace itself. Do not point users at a separate toolkit unless one is explicitly published.

## Local MCP setup

The marketplace MCP integration is local stdio in v1, not a hosted remote MCP service.

- the user runs `fast-pay-mcp` locally from their own environment
- the MCP server calls the hosted marketplace API
- payment signing still happens from the user's Fast wallet via `FAST_PRIVATE_KEY` or `FAST_KEYFILE_PATH`
- do not describe this as a hosted marketplace service

Typical environment:

```bash
export MARKETPLACE_API_BASE_URL=https://api.marketplace.fast.xyz
export MARKETPLACE_FAST_NETWORK=mainnet
export FAST_PRIVATE_KEY=<32-byte-hex-private-key>
```

Typical MCP config:

```json
{
  "mcpServers": {
    "fast-pay": {
      "command": "fast-pay-mcp",
      "env": {
        "MARKETPLACE_API_BASE_URL": "https://api.marketplace.fast.xyz",
        "MARKETPLACE_FAST_NETWORK": "mainnet",
        "FAST_PRIVATE_KEY": "<private key hex>"
      }
    }
  }
}
```

The v1 MCP tool surface is:

- `marketplace_search`
- `marketplace_show`
- `marketplace_call`
- `marketplace_topup`
- `marketplace_get_job`

## Concrete buyer call patterns

Use the marketplace contract directly instead of inferring missing details.

### x402 package and wallet shape

- the current workspace dependency is `@fastxyz/x402-client@^0.1.2`
- import `x402Pay` from `@fastxyz/x402-client`
- the wallet object passed to `x402Pay` is a Fast wallet config with this shape:

```ts
{
  type: "fast",
  privateKey: "<hex private key>",
  publicKey: "<hex public key>",
  address: "fast1...",
  rpcUrl: "https://api.fast.xyz/proxy"
}
```

### Fixed-price x402 example

```ts
import { x402Pay } from "@fastxyz/x402-client";

const result = await x402Pay({
  url: "https://api.marketplace.fast.xyz/api/orders/place-order",
  method: "POST",
  body: JSON.stringify({ sku: "abc", quantity: 1 }),
  headers: {
    "content-type": "application/json",
    "PAYMENT-IDENTIFIER": "payment_123"
  },
  wallet: {
    type: "fast",
    privateKey: process.env.FAST_PRIVATE_KEY!,
    publicKey: process.env.FAST_PUBLIC_KEY!,
    address: process.env.FAST_ADDRESS!,
    rpcUrl: "https://api.fast.xyz/proxy"
  }
});
```

Notes:

- send the first request without payment proof; `x402Pay` handles the `402` quote and retry
- keep `PAYMENT-IDENTIFIER` stable when retrying the same normalized request
- for fixed-price or top-up routes, read `accepts[*].network`, `accepts[*].maxAmountRequired`, and `accepts[*].asset` from the `402` response before approving payment

### API-scoped wallet session example

Use route-scoped bearer auth for `prepaid_credit` and async free routes.

```ts
const challenge = await fetch("https://api.marketplace.fast.xyz/auth/challenge", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    wallet: "fast1...",
    resourceType: "api",
    resourceId: "orders.place-order.v1"
  })
}).then((response) => response.json());

const signed = await connector.sign({ message: challenge.message });

const session = await fetch("https://api.marketplace.fast.xyz/auth/session", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    wallet: "fast1...",
    resourceType: "api",
    resourceId: "orders.place-order.v1",
    nonce: challenge.nonce,
    expiresAt: challenge.expiresAt,
    signature: signed.signature
  })
}).then((response) => response.json());

const apiResponse = await fetch("https://api.marketplace.fast.xyz/api/orders/place-order", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: `Bearer ${session.accessToken}`
  },
  body: JSON.stringify({ sku: "abc", quantity: 1 })
});
```

The challenge response shape is:

```json
{
  "wallet": "fast1...",
  "resourceType": "api",
  "resourceId": "orders.place-order.v1",
  "nonce": "uuid",
  "expiresAt": "2026-03-25T12:00:00.000Z",
  "message": "Fast Marketplace Access\nWallet: fast1...\nResource: api/orders.place-order.v1\nNonce: uuid\nExpires: 2026-03-25T12:00:00.000Z"
}
```

### Async job polling example

If a trigger returns `202`, save the `jobToken`, mint a job-scoped bearer token, then poll the job endpoint.

```ts
const challenge = await fetch("https://api.marketplace.fast.xyz/auth/challenge", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    wallet: "fast1...",
    resourceType: "job",
    resourceId: "job_123"
  })
}).then((response) => response.json());

const signed = await connector.sign({ message: challenge.message });

const session = await fetch("https://api.marketplace.fast.xyz/auth/session", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    wallet: "fast1...",
    resourceType: "job",
    resourceId: "job_123",
    nonce: challenge.nonce,
    expiresAt: challenge.expiresAt,
    signature: signed.signature
  })
}).then((response) => response.json());

const job = await fetch("https://api.marketplace.fast.xyz/api/jobs/job_123", {
  headers: {
    authorization: `Bearer ${session.accessToken}`
  }
}).then((response) => response.json());
```

The job response shape is:

```json
{
  "jobToken": "job_123",
  "status": "pending",
  "updatedAt": "2026-03-25T12:00:05.000Z"
}
```

Completed or failed jobs may also include:

```json
{
  "jobToken": "job_123",
  "status": "failed",
  "error": "Provider timeout",
  "refund": {
    "status": "sent",
    "txHash": "0x..."
  },
  "updatedAt": "2026-03-25T12:00:35.000Z"
}
```

Polling guidance:

- use the same wallet that paid for or authorized the original trigger
- poll `GET /api/jobs/{jobToken}` about every `5000` ms by default; that matches the marketplace `DEFAULT_JOB_POLL_INTERVAL_MS`
- stop polling when `status` becomes `completed` or `failed`

## Buyer workflow

1. Open the marketplace UI at `https://marketplace.fast.xyz` and locate the relevant service.
2. Open the service page and identify the route billing type from the published endpoint docs, labels, pricing, and examples.
3. If the user wants browser execution, use the endpoint's browser execution panel. Fixed-price and top-up routes pay through x402; prepaid-credit routes and async free routes use the wallet session after the user is signed in.
4. If the user is delegating the task to another agent, copy the service page's "Use this service" block or the canonical skill URL.
5. For `fixed_x402` routes outside the browser panel, send the first request without payment proof, read the `402 Payment Required` response, pay from the funded wallet, and retry the same request with the payment proof headers.
6. For `topup_x402_variable` routes, include the requested amount in the request body, expect a `402` quote for that exact amount, pay it, and persist the credited response details.
7. For `prepaid_credit` routes, create an API-scoped wallet session through `/auth/challenge` and `/auth/session`, or use `npm run cli -- use <provider>.<operation> --input <json>` and let the CLI mint the route-scoped wallet session automatically; these routes use bearer auth instead of x402 proof.
8. If the route returns `202 Accepted`, store the `jobToken` and switch to wallet-bound retrieval.
9. If the marketplace does not have the needed capability, submit a suggestion for an endpoint or source.

Settlement implication:

- marketplace-executed routes use `verified_escrow`: the x402 payment goes to marketplace treasury, and the marketplace can refund failures, reconcile stale payments, and settle provider payouts later

## Billing flows

The marketplace is Fast-native and wallet-first.

### Fixed x402

1. Use a persistent local Fast wallet funded with the settlement token shown by the published marketplace route. Mainnet routes use `USDC`; testnet routes use `testUSDC`.
2. Send the first request without payment proof.
3. Read the `402` response and payment requirements.
4. Authorize payment from the wallet.
5. Retry the same request with the payment proof.

Interpret the `402` body as follows:

- `accepts[*].network` is the Fast payment network, such as `fast-mainnet` or `fast-testnet`
- `accepts[*].maxAmountRequired` is the decimal amount to authorize
- `accepts[*].asset` is the asset id the signer must pay; do not substitute a nickname like `fastUSDC`
- current marketplace asset ids are:
  `USDC` mainnet: `0xc655a12330da6af361d281b197996d2bc135aaed3b66278e729c2222291e9130`
  `testUSDC` testnet: `0xd73a0679a2be46981e2a8aedecd951c8b6690e7d5f8502b34ed3ff4cc2163b46`

### Variable top-up

1. Send the top-up route with the requested amount in the JSON body.
2. Read the `402` response and verify it quotes the same intended amount.
3. Authorize payment from the wallet.
4. Retry the same request with the payment proof.
5. Persist the top-up response because it confirms the credited service balance.

### Prepaid credit

1. Fund service credit first through the service's `topup_x402_variable` route.
2. Create an API-scoped wallet session through `/auth/challenge` and `/auth/session`, or use `npm run cli -- use <provider>.<operation> --input <json>` and let the CLI handle the wallet-session flow.
3. Invoke the `prepaid_credit` route with the bearer token.
4. The current CLI does not expose a standalone `auth api-session` command; `use` is the supported buyer command surface.

### Async free

1. Create an API-scoped wallet session through `/auth/challenge` and `/auth/session`.
2. Invoke the async free route with the bearer token.
3. If the route returns `202`, persist the `jobToken`.
4. Create the job-scoped wallet auth session and poll `GET /api/jobs/{jobToken}` until the job completes or fails.

Important constraints:

- paid routes do not use long-lived API keys
- website login uses a signed wallet challenge for the site session
- the website can also pay and execute routes directly through the Fast extension
- wallet identity is the payer identity
- this skill is for trusted marketplace hosts, not arbitrary third-party `402` origins
- use the same request body when retrying a payable route
- for safe retries, keep the same payment identifier for the same normalized request only
- prepaid-credit routes require funded service credit and wallet-session bearer auth instead of per-call x402
- marketplace v1 is Fast-only; do not invent AllSet bridge, hosted ramp, or generic EVM payment steps from this skill
- if the user needs direct SDK or package-level guidance instead of marketplace route execution, hand off to the main FAST skill

## Website auth flow

1. For website sessions, use the signed wallet challenge flow served by `/auth/wallet/challenge` and `/auth/wallet/session`.
2. The website session unlocks provider surfaces and browser-connected marketplace actions.
3. Website session auth is separate from API-scoped route sessions and job retrieval auth.

## API session flow

1. Create an API-scoped wallet challenge through `/auth/challenge` with `resourceType: "api"` and the route id as `resourceId`.
   The route id is the published route identifier, for example `orders.place-order.v1`.
2. Sign the challenge with the same Fast wallet that owns the prepaid credit.
3. Exchange it at `/auth/session` for a bearer token.
4. Use that bearer token on `prepaid_credit` routes.

## Async retrieval flow

1. If a trigger returns `202`, persist the `jobToken`.
2. Create the job-scoped wallet auth session through `/auth/challenge` and `/auth/session`.
3. Poll `GET /api/jobs/{jobToken}` with `Authorization: Bearer <accessToken>` every `5000` ms until the job completes or fails.
4. Use the same wallet that authorized the original trigger.

## Refund flow

1. If the service is `verified_escrow`, a sync paid trigger can refund immediately after payment verification failure.
2. If the service is `verified_escrow` and an async job permanently fails after acceptance, the worker issues a treasury refund.
3. Read the job retrieval payload or sync error payload for refund status, transaction hash, and any refund error details.

## Provider workflow

1. Prefer the CLI path for agent-driven provider onboarding: create a spec JSON and run `npm run cli -- provider sync --spec <path>`.
2. The provider commands default to `AGENT_WALLET_KEY` from repo-root `.env`; use `--keyfile` only when you need to override that wallet.
3. `provider sync` upserts the provider profile, creates or updates the owned service draft by slug, reconciles endpoint drafts, and creates a runtime key only when a `marketplace_proxy` service does not already have one.
4. Marketplace-executed provider services publish under `verified_escrow` in the current marketplace cutover.
5. For `fixed_x402`, `topup_x402_variable`, `prepaid_credit`, and async marketplace routes, complete the draft and submit it for review; admin publish keeps the service in `verified_escrow`.
6. For `topup_x402_variable` endpoints, set `minAmount` and `maxAmount`; the marketplace owns the top-up crediting flow.
7. For async HTTP endpoints, require a provider runtime key and implement the marketplace async contract: execute returns `202` with `providerJobId`, poll routes expose `pollPath`, and webhook routes complete through the marketplace callback endpoint.
8. For `prepaid_credit` endpoints, verify marketplace identity headers upstream and use the provider runtime credit APIs to reserve, capture, release, and when needed extend buyer credit reservations.
9. Run `npm run cli -- provider verify --service <slug-or-id>` to mint a fresh verification challenge and show the exact URL and token the website must serve.
10. If verification requires touching deploy, DNS, or cloud env outside this repo, ask the user before taking that action. For arbitrary external sites, the agent should hand off the token and wait for confirmation rather than mutating infrastructure on its own.
11. After the user confirms the verification token is live, continue the same `provider verify` flow so the marketplace performs the ownership check.
12. Run `npm run cli -- provider submit --service <slug-or-id>` only after verification succeeds; this flow stops at `pending_review`, not admin publish.
13. If building from marketplace demand, review provider-visible request intake and claim the request you want to build before syncing the draft.
14. After admin publish, use the public service page and paid proxy routes as the canonical execution surface.

### Provider spec shape

`provider sync` expects JSON with `profile`, `service`, and `endpoints`. The shape is strict and must match the service type.

Example `marketplace_proxy` spec:

```json
{
  "profile": {
    "displayName": "Signal Labs",
    "bio": "Quant feeds for agent workflows.",
    "websiteUrl": "https://provider.example.com",
    "contactEmail": "ops@provider.example.com"
  },
  "service": {
    "serviceType": "marketplace_proxy",
    "slug": "signal-labs",
    "apiNamespace": "signals",
    "name": "Signal Labs",
    "tagline": "Short-form market signals",
    "about": "Provider-authored signal endpoints for agent workflows.",
    "categories": ["Research", "Trading"],
    "promptIntro": "I want to use the Signal Labs service on Fast Marketplace.",
    "setupInstructions": [
      "Use a funded Fast wallet.",
      "Call the marketplace proxy route."
    ],
    "websiteUrl": "https://provider.example.com",
    "payoutWallet": "fast1..."
  },
  "endpoints": [
    {
      "endpointType": "marketplace_proxy",
      "operation": "quote",
      "title": "Quote",
      "description": "Return a single quote snapshot.",
      "billingType": "fixed_x402",
      "price": "$0.25",
      "method": "POST",
      "mode": "sync",
      "requestSchemaJson": {
        "type": "object",
        "properties": {
          "symbol": { "type": "string", "minLength": 1 }
        },
        "required": ["symbol"],
        "additionalProperties": false
      },
      "responseSchemaJson": {
        "type": "object",
        "properties": {
          "symbol": { "type": "string" },
          "price": { "type": "number" }
        },
        "required": ["symbol", "price"],
        "additionalProperties": false
      },
      "requestExample": {
        "symbol": "FAST"
      },
      "responseExample": {
        "symbol": "FAST",
        "price": 42.5
      },
      "usageNotes": "Returns the latest quote only.",
      "upstreamBaseUrl": "https://provider.example.com",
      "upstreamPath": "/api/quote",
      "upstreamAuthMode": "none"
    }
  ]
}
```

Notes:

- use `serviceType: "marketplace_proxy"` for marketplace-executed routes and `serviceType: "external_registry"` for discovery-only listings
- every endpoint in `endpoints[]` must use the same `endpointType` as the service `serviceType`
- `apiNamespace` is required for `marketplace_proxy` services
- if the user needs a larger real example, reuse the inline spec above or a public provider-owned template instead of assuming access to this repo

### Provider pricing format

- `fixed_x402` uses a dollar string such as `"$0.25"`
- `topup_x402_variable` uses decimal token amounts such as `"10"` and `"100"` for `minAmount` and `maxAmount`
- `prepaid_credit` does not take a per-call price field on the provider draft
- the deployment decides whether the settlement token is `USDC` or `testUSDC`; treat the deployment network as authoritative

Example top-up billing:

```json
{
  "billingType": "topup_x402_variable",
  "minAmount": "10",
  "maxAmount": "100"
}
```

### Provider runtime keys

- there is no separate `provider key create` CLI surface in the current repo
- `provider sync` creates a runtime key automatically for a `marketplace_proxy` service when one does not already exist
- the sync result includes the plaintext key only on creation; store it immediately
- after the draft exists, the provider web editor at `https://marketplace.fast.xyz/providers/services` can rotate the runtime key
- async and prepaid-credit marketplace services require a runtime key before publish/use

### Website verification details

- the verification file path is `/.well-known/fast-marketplace-verification.txt`
- `npm run cli -- provider verify --service <slug-or-id>` creates a fresh challenge and prints the exact HTTPS URL plus token
- host the exact token with `200 OK` over HTTPS, then rerun the same command so the marketplace checks ownership
- changing the website host invalidates the old verification and requires a new challenge

### Provider references

- provider dashboard: `https://marketplace.fast.xyz/providers`
- provider onboarding: `https://marketplace.fast.xyz/providers/onboard`
- provider services: `https://marketplace.fast.xyz/providers/services`
- marketplace OpenAPI, including provider endpoints: `https://api.marketplace.fast.xyz/openapi.json`

Important provider constraints:

- provider drafts are scoped to the wallet that owns the provider profile
- payout wallet validation happens at draft/update time
- async `marketplace_proxy` services need a provider runtime key before publish
- top-up and prepaid-credit routes are Verified/escrow only
- prepaid-credit services need a provider runtime key before they can debit marketplace-held credit
- webhook async routes require an HTTPS marketplace base URL so the marketplace can inject a callback URL
- prepaid-credit upstreams should verify the signed marketplace identity headers before reserving or capturing credit
- async providers should trust the signed marketplace identity headers and `X-MARKETPLACE-JOB-TOKEN` when correlating work
- changing the service website host requires re-verification before submission
- request intake claiming is exclusive once another provider has claimed it

## Admin and review workflow

1. Sign into `/admin/login` with the marketplace admin token.
2. Open the internal review surfaces for suggestions and submitted provider services.
3. Review suggestion intake, update statuses, and add operator notes as needed.
4. Review submitted provider services for correctness, pricing, ownership verification, and marketplace fit.
5. Publish approved services under `verified_escrow` so they appear in the public catalog and route registry.
6. Suspend services when they should no longer be publicly executable.

## Troubleshooting

- `402 Payment Required`: the route is payable; submit payment and retry the same request
- `401 Unauthorized` on a prepaid-credit route: create an API-scoped wallet session for that route and retry with bearer auth
- `400` on a paid trigger: the request body or payment identifier is invalid
- `401 Unauthorized` on job retrieval: create a wallet-bound session from the same paying wallet
- `409 Conflict`: the payment identifier was reused with a different request body
- insufficient prepaid credit: buy more service credit through the top-up route before retrying
- permanent async failure after acceptance: escrow services use the marketplace refund policy; community/direct services require provider support
- provider submission blocked: complete website verification or fix draft validation errors
- provider prepaid route failing upstream: confirm the runtime key, signed identity header verification, and reserve/capture/release flow
- service website host changed: generate a new verification challenge and verify again
- provider request claim conflict: another provider already claimed the request
- admin review unavailable: confirm the correct admin token is present
- missing service or endpoint: submit a suggestion from the marketplace UI

## Discovery and reference URLs

- Marketplace UI: `https://marketplace.fast.xyz`
- Canonical skill: `https://marketplace.fast.xyz/skill.md`
- Main FAST skill: `https://skill.fast.xyz/skill.md`
- Suggest an endpoint: `https://marketplace.fast.xyz/suggest?type=endpoint`
- Suggest a source: `https://marketplace.fast.xyz/suggest?type=source`
- Provider dashboard: `https://marketplace.fast.xyz/providers`
- Provider onboarding: `https://marketplace.fast.xyz/providers/onboard`
- Provider services: `https://marketplace.fast.xyz/providers/services`
- Admin login: `https://marketplace.fast.xyz/admin/login`
- Admin provider services: `https://marketplace.fast.xyz/admin/services`
- Admin suggestions: `https://marketplace.fast.xyz/admin/suggestions`
- Website wallet login: use the `Connect Wallet` control in the site header
- OpenAPI: `https://api.marketplace.fast.xyz/openapi.json`
- LLM summary: `https://api.marketplace.fast.xyz/llms.txt`
- Marketplace catalog JSON: `https://api.marketplace.fast.xyz/.well-known/marketplace.json`

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
