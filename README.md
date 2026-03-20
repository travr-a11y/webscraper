# Webscraper

Node.js scraper service with BullMQ, Playwright, and optional S3 storage.

## Health endpoints (Railway / ops)

| Path | Purpose |
|------|---------|
| `GET /api/health` | **Liveness** — fast `200` when the process is running. Does **not** call Redis. Railway should use this for `healthcheckPath`. |
| `GET /api/ready` | **Readiness** — checks `REDIS_URL`, Redis `PING`, and BullMQ queue metrics. Returns `200` when ready, `503` when not (with JSON body). Bounded by `READY_CHECK_TIMEOUT_MS` (default `2000` ms) so the handler cannot hang. |

### Deploy troubleshooting

- **Railway healthcheck fails with “service unavailable”** — often means nothing is listening on `PORT`, the process crashed on boot, or an old healthcheck depended on Redis timing out. Confirm logs for `[startup] FATAL: invalid configuration` (e.g. partial S4 S3 vars) or listen line: `HTTP server listening`.
- **Scrape API returns errors but health is green** — check `GET /api/ready`; if `503`, fix Redis / `REDIS_URL` (including `rediss://` on Railway).

Copy `.env.example` to `.env` for local development.
