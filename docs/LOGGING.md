# Structured logging

Production-style JSON logs on disk (no OpenSearch). Each HTTP request gets a **`trace_id`** (UUID) that appears in every log line for that request and is returned to the client as header **`x-trace-id`**.

## Where logs go

| Environment | Directory |
|-------------|-----------|
| Local dev   | `./logs/` (project root) |
| Docker      | `/app/logs` → host `/mnt/ssd/calculator/logs` |

Files are **daily JSONL**:

```text
logs/app-2026-05-30.jsonl
```

One JSON object per line (easy to `grep`, `jq`, or ship later).

**Audit lines** use `event: "audit.action"` with:

- `action` — what happened (`calculator.create`, `admin.user.update`, …), not raw `GET /api/...`
- `user` — `{ id, email, name, role }` when the caller was logged in
- `http` — `{ method, path, status_code, duration_ms, status: { module, code } }`
- `request` — sent data: `{ query }` for GET (and other reads), `{ body }` for POST/PATCH/PUT/DELETE (JSON or text)
- `response` — `{ body }` with the JSON/text returned to the client (passwords and tokens are `[redacted]`)
- resource ids (`calculator_id`, `target_user_id`, …) and handler `changes` / `share` / `transfer` blocks

**Not logged:** `/api/admin/audit` (the log viewer), `/api/auth/session` polling. Startup `logger.started` is `debug` only.

## Retention

Controlled by **`LOG_RETENTION_DAYS`** (default **14**). Old daily files are removed automatically by `rotating-file-stream`.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_DIR` | `./logs` | Directory for JSONL files |
| `LOG_RETENTION_DAYS` | `14` | Keep this many daily files (1–365) |
| `LOG_LEVEL` | `info` (prod), `debug` (dev) | `fatal` … `trace` |
| `LOG_TO_STDOUT` | `true` | Mirror logs to stdout (`docker logs`) |
| `LOG_SERVICE` | `calculator` | `service` field in every line |
| `LOG_SLOW_QUERY_MS` | `200` | Prisma slow-query warning threshold |

## Trace ID flow

1. **Middleware** (`proxy.ts`) ensures `x-trace-id` on every request (generates if missing).
2. **API routes** wrapped with `withApiRoute` log `http.request.start` / `http.request.end` and attach `x-trace-id` on the response.
3. **Logger mixin** adds `trace_id`, `user_id`, `route`, `http_method` from AsyncLocalStorage when inside a request.

Pass `x-trace-id` from the browser or another service to correlate logs across calls.

## Example log line

```json
{
  "level": "info",
  "time": "2026-05-30T12:00:00.000Z",
  "service": "calculator",
  "env": "production",
  "trace_id": "a1b2c3d4-...",
  "user_id": "clx...",
  "route": "PATCH /api/calculators/abc",
  "http_method": "PATCH",
  "event": "http.request.end",
  "method": "PATCH",
  "path": "/api/calculators/abc",
  "status": 200,
  "duration_ms": 45,
  "msg": "request completed"
}
```

## Admin UI

Admins can browse and search logs at **`/admin/audit`** (locale prefix, e.g. `/uk/admin/audit`). The old path `/admin/logs` redirects here — some reverse proxies block URLs containing `/logs`. Filters: file (daily), free-text search, `trace_id`, log level. Click a row to expand full JSON; use **Filter by trace** to correlate one request.

## Debugging on the server

```bash
# Last errors today
grep '"level":"error"' /mnt/ssd/calculator/logs/app-$(date +%Y-%m-%d).jsonl | tail -20

# Everything for one trace (from browser Network → x-trace-id)
grep 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' /mnt/ssd/calculator/logs/app-*.jsonl | jq .

# Slow DB queries
grep 'db.query.slow' /mnt/ssd/calculator/logs/app-*.jsonl | jq .
```

## Code

- `lib/logger/` — pino + rotation, context, serialization
- `lib/api/with-api-route.ts` — HTTP request logging wrapper
- `instrumentation.ts` — boots logger on Node.js server start
- `proxy.ts` — trace / user headers for all routes

Use in application code:

```ts
import { logger } from "@/lib/logger/log";

logger.info("calculator.saved", { calculator_id: id });
logger.error("share.failed", error, { calculator_id: id });
```
