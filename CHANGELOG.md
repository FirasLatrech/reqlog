# Changelog

## 0.2.0 (2026-03-19)

### Added
- **Go adapter (`reqlog-go`)** — Full Go implementation of reqlog
  - `net/http` middleware (also works with Chi router)
  - Gin middleware (via `//go:build gin` tag)
  - Zero external dependencies — stdlib only
  - Embedded dashboard via `go:embed` (same React SPA as Node adapters)
  - Real-time SSE streaming, ring buffer, request replay
  - Production blocking via `GO_ENV=production` / `APP_ENV=production`
  - 13 tests passing with `-race` detector
- **`allowInProd` option** for all adapters (Express, Fastify, NestJS, Go)

### Security
- **Production blocking** — reqlog is now **blocked by default** in production instead of just printing a warning
- **Dashboard binds to `127.0.0.1` only** (Go) — not exposed on all interfaces
- **SSRF hardening** in replay handler (Go):
  - Removed `0.0.0.0` from allowed replay hosts
  - Disabled HTTP redirect following to prevent SSRF via redirects
  - Sanitized error messages to prevent internal info leakage
- **SSE data race fix** (Go) — per-client write mutex prevents concurrent ResponseWriter writes
- **Server timeouts** (Go) — `ReadHeaderTimeout`, `ReadTimeout`, `IdleTimeout` to prevent slowloris
- **CORS tightened** (Go) — headers only sent when origin matches localhost
- **1MB body limit enforced exactly** (Go) — no buffer overshoot
- **ResponseWriter `Unwrap()`** (Go) — preserves `http.Hijacker`/`http.Flusher` for WebSocket support

### Changed
- README updated to document production blocking and `allowInProd` override

---

## 0.1.0 (2026-03-15)

### Initial Release

- Framework-agnostic HTTP request logger engine (`@reqlog/core`)
- Express middleware adapter (`@reqlog/express`)
- Fastify plugin adapter (`@reqlog/fastify`)
- NestJS module adapter (`@reqlog/nestjs`)
- Live dashboard with SSE-powered real-time updates
- Request/response body inspection with JSON formatting
- Slow request highlighting (configurable threshold)
- Request replay to localhost
- Diff view comparing consecutive requests to the same endpoint
- In-memory ring buffer (configurable max size)
- Path traversal protection for static file serving
- CORS restricted to localhost origins
