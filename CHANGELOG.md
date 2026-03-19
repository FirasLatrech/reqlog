# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0](https://github.com/FirasLatrech/reqlog/compare/v0.1.0...v0.2.0) (2026-03-19)

### Highlights

This release adds **Go language support** and a major **security improvement** that blocks reqlog in production by default.

### Added

- **Go adapter (`reqlog-go`)** — full Go implementation with zero external dependencies
  - `net/http` middleware — works out of the box with the standard library
  - Chi middleware — uses standard `net/http` signature, no build tags needed
  - Gin middleware — available via `//go:build gin` tag
  - Embedded dashboard via `go:embed` — same React SPA as Node.js adapters
  - Real-time SSE streaming, ring buffer, request replay
  - Production blocking via `GO_ENV=production` or `APP_ENV=production`
  - 13 tests passing with Go race detector (`-race`)
- **`allowInProd` option** — new option for all adapters (Express, Fastify, NestJS, Go) to explicitly allow reqlog in production environments
- **Fastify example** — new example app at `examples/fastify-example/`
- **Go example** — new example app at `examples/go-example/`

### Security

- **Production blocking** — reqlog is now **blocked by default** when `NODE_ENV=production` (Node.js) or `GO_ENV=production` / `APP_ENV=production` (Go). Previously, it only printed a warning. The dashboard server will not start and no port will be opened. To override, pass `allowInProd: true`
- **Dashboard binds to `127.0.0.1` only** (Go) — prevents exposure on all network interfaces
- **SSRF hardening** in Go replay handler:
  - Removed `0.0.0.0` from allowed replay hosts
  - Disabled HTTP redirect following to prevent SSRF via redirects to internal services (e.g. cloud metadata endpoints)
  - Sanitized error messages to prevent internal detail leakage
- **SSE data race fix** (Go) — per-client write mutex prevents concurrent `http.ResponseWriter` writes
- **Server timeouts** (Go) — `ReadHeaderTimeout: 10s`, `ReadTimeout: 30s`, `IdleTimeout: 120s` to prevent slowloris-style DoS
- **CORS tightened** (Go) — `Access-Control-Allow-*` headers only sent when origin matches localhost
- **1MB body limit enforced exactly** (Go) — response body buffer capped precisely, no overshoot
- **ResponseWriter `Unwrap()`** (Go) — preserves `http.Hijacker`/`http.Flusher` interfaces for WebSocket upgrade support

### Changed

- README updated with Go installation/usage, `allowInProd` option, production blocking documentation, and updated architecture diagram
- All npm packages bumped to `0.2.0`
- All example apps updated to use `0.2.0` dependencies

### Migration Guide

**From 0.1.0 to 0.2.0 (Node.js):**

No breaking changes. The only behavioral change is that reqlog now **refuses to start** when `NODE_ENV=production` instead of printing a warning. If you were intentionally running reqlog in production, add `allowInProd: true`:

```ts
// Express
app.use(reqlog({ allowInProd: true }));

// NestJS
ReqlogModule.forRoot({ allowInProd: true })

// Fastify
app.register(reqlogPlugin, { allowInProd: true });
```

### npm packages

| Package | Version |
|---------|---------|
| [reqlog-core](https://www.npmjs.com/package/reqlog-core) | `0.2.0` |
| [reqlog-express](https://www.npmjs.com/package/reqlog-express) | `0.2.0` |
| [reqlog-fastify](https://www.npmjs.com/package/reqlog-fastify) | `0.2.0` |
| [reqlog-nestjs](https://www.npmjs.com/package/reqlog-nestjs) | `0.2.0` |

---

## [0.1.0](https://github.com/FirasLatrech/reqlog/releases/tag/v0.1.0) (2026-03-15)

### Initial Release

- Framework-agnostic HTTP request logger engine (`reqlog-core`)
- Express middleware adapter (`reqlog-express`)
- Fastify plugin adapter (`reqlog-fastify`)
- NestJS module adapter (`reqlog-nestjs`)
- Live dashboard with SSE-powered real-time updates
- Request/response body inspection with JSON formatting
- Slow request highlighting (configurable threshold)
- Request replay to localhost
- Diff view comparing consecutive requests to the same endpoint
- In-memory ring buffer (configurable max size)
- Path traversal protection for static file serving
- CORS restricted to localhost origins
