# Apify Service Matrix

These are the six marketplace services to deploy from `apps/apify-service`.

Each service should be:

- one standalone Coolify app
- one public HTTPS host
- one marketplace provider service
- published as `verified_escrow`
- modeled as an async `fixed_x402` route for now

## Suggested Mapping

| Actor ID | Service Name | Slug | API Namespace | Suggested Coolify App | Suggested Host |
| --- | --- | --- | --- | --- | --- |
| `compass/crawler-google-places` | `Google Places Scraper` | `apify-google-places-scraper` | `apify-google-places` | `fast-provider-apify-google-places` | `fastmainnetapifygoogleplaces.8o.vc` |
| `clockworks/tiktok-scraper` | `TikTok Scraper` | `apify-tiktok-scraper` | `apify-tiktok` | `fast-provider-apify-tiktok` | `fastmainnetapifytiktok.8o.vc` |
| `apify/instagram-scraper` | `Instagram Scraper` | `apify-instagram-scraper` | `apify-instagram` | `fast-provider-apify-instagram` | `fastmainnetapifyinstagram.8o.vc` |
| `apidojo/tweet-scraper` | `Tweet Scraper` | `apify-tweet-scraper` | `apify-tweet` | `fast-provider-apify-tweet` | `fastmainnetapifytweet.8o.vc` |
| `apify/facebook-posts-scraper` | `Facebook Posts Scraper` | `apify-facebook-posts-scraper` | `apify-facebook-posts` | `fast-provider-apify-facebook-posts` | `fastmainnetapifyfacebookposts.8o.vc` |
| `streamers/youtube-scraper` | `YouTube Scraper` | `apify-youtube-scraper` | `apify-youtube` | `fast-provider-apify-youtube` | `fastmainnetapifyyoutube.8o.vc` |

## Required Coolify Env Per App

- `APIFY_API_TOKEN`
- `APIFY_ACTOR_ID`
- `APIFY_SERVICE_NAME`
- `APIFY_SERVICE_DESCRIPTION`
- `APIFY_API_BASE_URL=https://api.apify.com/v2`
- `MARKETPLACE_VERIFICATION_TOKEN`

Each app then gets its own matching provider spec from this folder.

## Suggested Shared App Config

- Domain: use the matching suggested host above
- Port: `4040`
- Build command: `npm install && npm run build`
- Start command: `npm run start:apify-service`
- Base directory: repo root
- Health check path: `/health`
