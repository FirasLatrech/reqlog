<p align="center">
  <img src="reqlog-brand/svg/reqlog-dark.svg" alt="reqlog" width="280" />
</p>

<p align="center">
  <strong>Stop <code>console.log()</code>-ing every request.</strong><br/>
  reqlog gives you a live dashboard of every HTTP request hitting your server — zero config.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/reqlog-core"><img src="https://img.shields.io/npm/v/reqlog-core?color=22c55e&label=npm" alt="npm version" /></a>
  <a href="https://github.com/FirasLatrech/reqlog/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/Express-4%20%26%205-black?logo=express" alt="Express compatible" />
  <img src="https://img.shields.io/badge/NestJS-9%2B-ea2845?logo=nestjs" alt="NestJS compatible" />
  <img src="https://img.shields.io/badge/Fastify-4%2B-black?logo=fastify" alt="Fastify compatible" />
  <img src="https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white" alt="Node.js >= 18" />
</p>

<br/>

<p align="center">
  <img src="docs/demo.gif" alt="reqlog demo — live HTTP request dashboard" width="800" />
</p>

---

## Install

```bash
npm install reqlog-express
```

### Express — 3 lines, done

```ts
import express from 'express';
import { reqlog } from 'reqlog-express';

const app = express();
app.use(reqlog());          // dashboard opens → http://localhost:9000
app.listen(3000);
```

That's it. Open [localhost:9000](http://localhost:9000) and start making requests.

---

### NestJS

```bash
npm install reqlog-nestjs
```

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { ReqlogModule } from 'reqlog-nestjs';

@Module({
  imports: [ReqlogModule.forRoot()],
})
export class AppModule {}
```

### Fastify

```bash
npm install reqlog-fastify
```

```ts
import Fastify from 'fastify';
import { reqlogPlugin } from 'reqlog-fastify';

const app = Fastify();
await app.register(reqlogPlugin);
await app.listen({ port: 3000 });
```

---

## What you get

- **Live request stream** — every request appears instantly via SSE. No polling, no refresh.
- **Full inspection** — headers, parsed JSON body, status codes, latency for both request and response.
- **Slow request flags** — anything over the threshold gets highlighted so you spot bottlenecks fast.
- **Payload diff** — compare the current request body against the previous call to the same endpoint.
- **One-click replay** — resend any captured request and inspect the new response side by side.
- **Method + status badges** — color-coded `GET` `POST` `PUT` `PATCH` `DELETE` and `2xx` `3xx` `4xx` `5xx`.

---

## Options

```ts
app.use(reqlog({
  port: 9000,           // dashboard port (default: 9000)
  maxRequests: 200,     // entries kept in memory (default: 200)
  slowThreshold: 200,   // ms before a request is flagged slow (default: 200)
  autoOpen: true,       // open browser on start (default: true)
}));
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `9000` | Port the dashboard listens on |
| `maxRequests` | `number` | `200` | Max entries in the in-memory ring buffer |
| `slowThreshold` | `number` | `200` | Latency (ms) above which a request is flagged slow |
| `autoOpen` | `boolean` | `true` | Auto-open the dashboard in your browser |

---

## How it works

```
Your App (Express/NestJS/Fastify)
  │
  ├── reqlog middleware intercepts req/res
  │     ├── captures headers, body, timing
  │     └── pushes entry to in-memory ring buffer
  │
  └── reqlog dashboard server (:9000)
        ├── GET  /events        → SSE stream
        ├── GET  /api/requests  → all buffered entries
        └── POST /api/replay/:id → replay a request
```

No external dependencies. No database. No config files. Just middleware → dashboard.

---

## Development only

reqlog is a **dev tool**. It will print a warning if `NODE_ENV=production`. Don't ship it to prod — it adds overhead and exposes a dashboard on an open port.

---

## Packages

| Package | Description |
|---------|-------------|
| [`reqlog-core`](packages/core) | Framework-agnostic engine |
| [`reqlog-express`](packages/express) | Express middleware |
| [`reqlog-fastify`](packages/fastify) | Fastify plugin |
| [`reqlog-nestjs`](packages/nestjs) | NestJS module |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and development workflow.

## License

[MIT](LICENSE)
