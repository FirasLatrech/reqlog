# Contributing to reqlog

Thanks for your interest in contributing! Here's how to get started.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18.0.0
- [Bun](https://bun.sh/) (package manager & test runner)

## Setup

```bash
git clone https://github.com/FirasLatrech/reqlog.git
cd reqlog
bun install
```

## Project Structure

```
packages/
  core/        # Framework-agnostic engine (ring buffer, SSE, interceptor, server)
  dashboard/   # React + Vite live dashboard UI
  express/     # Express middleware adapter
  fastify/     # Fastify plugin adapter
  nestjs/      # NestJS module adapter
examples/
  express-example/
  nestjs-example/
```

## Development

```bash
# Build all packages
bun run build

# Start dashboard in dev mode (hot reload)
bun run dev

# Run tests
bun run test

# Run tests with coverage
bun run test:coverage

# Type-check all packages
bun run typecheck
```

## Build Order

The build must follow this order (handled automatically by `bun run build`):

1. `@reqlog/core` (TypeScript compile)
2. `@reqlog/dashboard` (Vite build → outputs to `packages/core/dist/dashboard/`)
3. Adapters: `@reqlog/express`, `@reqlog/fastify`, `@reqlog/nestjs`

## Running Examples

```bash
# Express example
cd examples/express-example
bun run dev

# NestJS example
cd examples/nestjs-example
bun run start:dev
```

Then open `http://localhost:9000` to see the dashboard.

## Testing

Tests use `bun test` (built-in test runner).

```bash
# All tests
bun run test

# Core tests only
bun test packages/core/src/test

# Express adapter tests
bun test packages/express/src/test

# Fastify adapter tests
bun test packages/fastify/src/test
```

## Pull Requests

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Add tests for new functionality
4. Ensure `bun run build`, `bun run test`, and `bun run typecheck` all pass
5. Submit a PR with a clear description of the changes

## Code Style

- TypeScript strict mode
- No lint tool enforced yet — just follow existing patterns
- Use `.js` extensions in imports (required for ESM compatibility)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
