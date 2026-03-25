# Tavily Mainnet Onboarding

This is the lowest-risk way to copy the Tavily provider to mainnet using the current repo.

## Recommended Shape

- service type: `marketplace_proxy`
- settlement tier at publish time: `verified_escrow`
- billing model for Tavily right now: `fixed_x402`
- endpoint mode: `sync`

This is intentionally not `prepaid_credit` yet. The current Tavily service is a thin proxy and does not implement the provider credit reserve/capture/release flow required for prepaid-credit services.

## Why This Shape

- The existing Tavily app already supports sync HTTP proxy calls.
- `verified_escrow` is fine for sync fixed-price endpoints and keeps refunds under marketplace control.
- No Tavily service code changes are required for this first mainnet copy.

## Website Flow

1. Deploy `apps/tavily-service` to an HTTPS mainnet host.
2. Set `TAVILY_API_KEY`.
3. Copy `provider-spec.mainnet.template.json` and replace:
   - website host
   - provider contact email
   - payout wallet
   - prices if needed
4. Run:

```bash
npm run cli -- provider sync --spec ./apps/tavily-service/provider-spec.mainnet.template.json
npm run cli -- provider verify --service tavily-mainnet
npm run cli -- provider submit --service tavily-mainnet
```

5. In admin, publish the submitted service as `verified_escrow`.

## Future Upgrade

If you want Tavily to move to marketplace credit instead of per-call x402, the service will need provider runtime credit support first. That means adding reserve/capture/release calls against:

- `POST /provider/runtime/credits/reserve`
- `POST /provider/runtime/credits/:reservationId/capture`
- `POST /provider/runtime/credits/:reservationId/release`
