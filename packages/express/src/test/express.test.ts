import { describe, it, expect, afterEach } from 'bun:test';
import express from 'express';
import type { Server } from 'http';
import { reqlog } from '../index.js';

function httpGet(url: string): Promise<{ status: number; body: string }> {
  return fetch(url).then(async (r) => ({
    status: r.status,
    body: await r.text(),
  }));
}

describe('@reqlog/express', () => {
  let appServer: Server | undefined;

  afterEach(async () => {
    if (appServer) {
      await new Promise<void>((resolve) => appServer!.close(() => resolve()));
      appServer = undefined;
    }
    // Wait for reqlog server to clean up
    await new Promise((r) => setTimeout(r, 100));
  });

  it('exports reqlog as a function', () => {
    expect(typeof reqlog).toBe('function');
  });

  it('returns an express-compatible middleware', () => {
    const middleware = reqlog({ autoOpen: false, port: 0 });
    expect(typeof middleware).toBe('function');
    // Express middleware has 3 params: req, res, next
    expect(middleware.length).toBe(3);
  });

  it('intercepts requests and logs to dashboard', async () => {
    const dashboardPort = 19500 + Math.floor(Math.random() * 400);
    const appPort = 19900 + Math.floor(Math.random() * 90);

    const app = express();
    app.use(reqlog({ port: dashboardPort, autoOpen: false }));
    app.get('/test', (_req, res) => {
      res.json({ hello: 'world' });
    });

    appServer = app.listen(appPort);

    // Wait for both servers to start
    await new Promise((r) => setTimeout(r, 300));

    // Make a request through the app
    const appRes = await httpGet(`http://localhost:${appPort}/test`);
    expect(appRes.status).toBe(200);
    expect(JSON.parse(appRes.body)).toEqual({ hello: 'world' });

    // Wait for reqlog to process
    await new Promise((r) => setTimeout(r, 200));

    // Check dashboard captured the request
    const dashRes = await httpGet(`http://localhost:${dashboardPort}/api/requests`);
    expect(dashRes.status).toBe(200);

    const entries = JSON.parse(dashRes.body);
    expect(entries.length).toBeGreaterThanOrEqual(1);

    const entry = entries.find((e: { url: string }) => e.url === '/test');
    expect(entry).toBeDefined();
    expect(entry.method).toBe('GET');
    expect(entry.statusCode).toBe(200);
  });
});
