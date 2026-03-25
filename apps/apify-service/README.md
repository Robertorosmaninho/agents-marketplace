# Apify Service Example

This app is a standalone Apify-backed provider wrapper. It follows the same deployment pattern as `apps/tavily-service`, but it is built for async actor runs.

## What It Does

- starts a single configured Apify actor with `POST /run`
- polls Apify run status with `POST /runs/poll`
- serves `GET /openapi.json` for provider docs
- optionally serves `GET /.well-known/fast-marketplace-verification.txt` from `MARKETPLACE_VERIFICATION_TOKEN`

## Environment

```bash
export APIFY_API_TOKEN=apify_api_...
export APIFY_ACTOR_ID=apify/instagram-scraper
export APIFY_API_BASE_URL=https://api.apify.com/v2
export APIFY_SERVICE_NAME="Instagram Scraper Proxy"
export APIFY_SERVICE_DESCRIPTION="Run the Instagram Scraper actor through a marketplace-hosted async proxy."
export APIFY_SERVICE_PORT=4040
export MARKETPLACE_VERIFICATION_TOKEN=...
```

## Local Run

```bash
npm run dev:apify-service
```

## Deployment Shape

Deploy the same app six times in Coolify with different env:

- `APIFY_ACTOR_ID=compass/crawler-google-places`
- `APIFY_ACTOR_ID=clockworks/tiktok-scraper`
- `APIFY_ACTOR_ID=apify/instagram-scraper`
- `APIFY_ACTOR_ID=apidojo/tweet-scraper`
- `APIFY_ACTOR_ID=apify/facebook-posts-scraper`
- `APIFY_ACTOR_ID=streamers/youtube-scraper`

Each deployment should get:

- its own public host
- its own provider service in the marketplace
- `verified_escrow` on publish

Provider-spec templates for those six services live in [specs/](/Users/chris/Documents/Workspace/ai-agent-marketplace/apps/apify-service/specs/).

## Marketplace Notes

This wrapper supports async execution. It is suitable for `verified_escrow` async routes.

If you later want prepaid credit instead of fixed per-run billing, you will still need provider runtime credit logic on top of this wrapper.
