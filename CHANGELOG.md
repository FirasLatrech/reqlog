# Changelog

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
