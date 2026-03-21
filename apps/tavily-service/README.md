# Tavily Service Example

This app is a standalone Tavily-backed provider example. It is not wired into `apps/api`.

## What It Does

- exposes `POST /search` and forwards the request body to `POST https://api.tavily.com/search`
- injects the server-side `TAVILY_API_KEY`
- optionally serves `GET /.well-known/fast-marketplace-verification.txt` from `MARKETPLACE_VERIFICATION_TOKEN`

## Local Run

```bash
export TAVILY_API_KEY=tvly-...
export TAVILY_SERVICE_PORT=4030
npm run dev:tavily-service
```

## Using It With The Marketplace

1. Create a `marketplace_proxy` provider service in the website.
2. Set the service website URL to the deployed Tavily service host.
3. Add an endpoint whose upstream target points at `/search` on that host.
4. Set `MARKETPLACE_VERIFICATION_TOKEN` on the Tavily service and host the verification file.
5. Complete provider verification and submit the service for review.

Provider website verification expects an HTTPS host.
