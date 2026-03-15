# reqlog

A zero-config HTTP request logger with a live dashboard for Node.js — drop one middleware into Express, NestJS, or Fastify and instantly get a real-time inspector at `http://localhost:9000`.

---

## Quick Start — Express

```bash
bun add @reqlog/express
```

```ts
import express from 'express';
import { reqlog } from '@reqlog/express';

const app = express();
app.use(reqlog());          // dashboard opens at http://localhost:9000
app.listen(3000);
```

---

## Quick Start — NestJS

```bash
bun add @reqlog/nestjs
```

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { ReqlogModule } from '@reqlog/nestjs';

@Module({
  imports: [ReqlogModule.forRoot({ port: 9000 })],
})
export class AppModule {}
```

```ts
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

---

## Quick Start — Fastify

```bash
bun add @reqlog/fastify
```

```ts
import Fastify from 'fastify';
import { reqlogPlugin } from '@reqlog/fastify';

const app = Fastify();
await app.register(reqlogPlugin, { port: 9000 });
await app.listen({ port: 3000 });
```

---

## ReqlogOptions

| Option           | Type      | Default | Description                                               |
| ---------------- | --------- | ------- | --------------------------------------------------------- |
| `port`           | `number`  | `9000`  | Port the dashboard server listens on                      |
| `maxRequests`    | `number`  | `200`   | Max entries kept in the in-memory ring buffer             |
| `slowThreshold`  | `number`  | `200`   | Latency (ms) above which a request is flagged as slow     |
| `autoOpen`       | `boolean` | `true`  | Automatically open the dashboard in the browser on start  |

---

## Dashboard Features

- **Live request list** — new requests stream in via SSE with no polling
- **Method + status badges** — colour-coded GET / POST / PUT / PATCH / DELETE and 2xx / 3xx / 4xx / 5xx
- **Slow request highlighting** — requests exceeding `slowThreshold` are visually flagged
- **Request / response detail** — headers, parsed JSON body, and raw body for every entry
- **Diff view** — compare the current request's body against the previous request to the same endpoint
- **Replay** — resend any captured request to localhost with one click and inspect the new response
- **Clear** — flush the in-memory log without restarting your server
