# Webscraper

Node.js scraper service with Playwright and optional S3 storage. `POST /api/scrape` runs a crawl **synchronously** and returns JSON in the response (for Clay HTTP and similar clients).

## Scrape API

| Method | Purpose |
|--------|---------|
| `POST /api/scrape` | Body: `{ "url": "https://...", "maxDepth"?, "maxPages"?, "includeSubdomains"?, "proxyUrl"? }`. Requires header `x-api-key: <API_KEY>`. Holds the connection until the crawl finishes (or times out). **200** with `{ success, jobId, data, blocked }` on success; **200** with `{ success: false, jobId, error, data: [] }` on crawl failure; **504** if `SCRAPE_SYNC_TIMEOUT_MS` is exceeded; **429** if `MAX_CONCURRENT_SCRAPES` is reached. |

Tune `maxPages` / `maxDepth` so crawls finish within your client’s HTTP timeout (e.g. Clay ~120s). Defaults: `JOB_TIMEOUT_MS` and `SCRAPE_SYNC_TIMEOUT_MS` align at **110s** (see `.env.example`).

## Health endpoints (Railway / ops)

| Path | Purpose |
|------|---------|
| `GET /api/health` | **Liveness** — fast `200` when the process is running. Railway should use this for `healthcheckPath`. |
| `GET /api/ready` | **Readiness** — returns `200` when the process is ready to accept traffic (no Redis). |

### Deploy troubleshooting

- **Railway healthcheck fails with “service unavailable”** — often means nothing is listening on `PORT`, or the process crashed on boot. Confirm logs for `[startup] FATAL: invalid configuration` (e.g. partial S3 vars) or listen line: `HTTP server listening`.

Copy `.env.example` to `.env` for local development.
