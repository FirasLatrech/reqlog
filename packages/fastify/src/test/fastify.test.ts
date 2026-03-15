import { describe, it, expect, afterEach } from 'bun:test';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { reqlogPlugin } from '../index.js';

function httpGet(url: string): Promise<{ status: number; body: string }> {
  return fetch(url).then(async (r) => ({
    status: r.status,
    body: await r.text(),
  }));
}

describe('@reqlog/fastify', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
    await new Promise((r) => setTimeout(r, 100));
  });

  it('exports reqlogPlugin as a function', () => {
    expect(typeof reqlogPlugin).toBe('function');
  });

  it('registers as a Fastify plugin and intercepts requests', async () => {
    const dashboardPort = 19500 + Math.floor(Math.random() * 400);
    const appPort = 19900 + Math.floor(Math.random() * 90);

    app = Fastify();
    await app.register(reqlogPlugin, { port: dashboardPort, autoOpen: false });

    app.get('/ping', async () => {
      return { pong: true };
    });

    await app.listen({ port: appPort });

    // Wait for dashboard to start
    await new Promise((r) => setTimeout(r, 300));

    // Make a request through the app
    const appRes = await httpGet(`http://localhost:${appPort}/ping`);
    expect(appRes.status).toBe(200);
    expect(JSON.parse(appRes.body)).toEqual({ pong: true });

    // Wait for reqlog to process
    await new Promise((r) => setTimeout(r, 200));

    // Check dashboard captured the request
    const dashRes = await httpGet(`http://localhost:${dashboardPort}/api/requests`);
    expect(dashRes.status).toBe(200);

    const entries = JSON.parse(dashRes.body);
    expect(entries.length).toBeGreaterThanOrEqual(1);

    const entry = entries.find((e: { url: string }) => e.url === '/ping');
    expect(entry).toBeDefined();
    expect(entry.method).toBe('GET');
    expect(entry.statusCode).toBe(200);
  });
});
