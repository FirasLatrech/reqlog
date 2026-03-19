import { describe, it, expect, afterEach, beforeEach, afterAll, spyOn } from 'bun:test';
import * as http from 'http';
import { ReqlogServer } from '../server.ts';
import type { ReqlogEntry } from '../types.ts';
import { makeEntry, httpGet, canConnect } from './helpers.ts';

describe('ReqlogServer', () => {
  let server: ReqlogServer;
  let port: number;

  beforeEach(() => {
    port = 19000 + Math.floor(Math.random() * 1000);
    server = new ReqlogServer({ port, autoOpen: false });
  });

  afterEach(async () => {
    await server.stop().catch(() => {});
  });

  it('start() binds the port', async () => {
    await server.start();
    const connected = await canConnect(port);
    expect(connected).toBe(true);
  });

  it('/api/requests returns empty array initially', async () => {
    await server.start();
    const res = await httpGet(port, '/api/requests');
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual([]);
  });

  it('/api/requests returns entries after pushing to ringBuffer', async () => {
    await server.start();
    const entry = makeEntry({ id: 'entry-1', url: '/pushed' });
    server.ringBuffer.push(entry);

    const res = await httpGet(port, '/api/requests');
    expect(res.status).toBe(200);
    const data = JSON.parse(res.body) as ReqlogEntry[];
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('entry-1');
    expect(data[0].url).toBe('/pushed');
  });

  it('/api/replay/:id returns 404 for unknown id', async () => {
    await server.start();
    const res = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const req = http.request(
        { hostname: 'localhost', port, path: '/api/replay/nonexistent-id', method: 'POST' },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () =>
            resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString() })
          );
        }
      );
      req.on('error', reject);
      req.end();
    });
    expect(res.status).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.error).toBeDefined();
  });

  it('/api/replay/:id rejects non-local replay targets', async () => {
    await server.start();
    server.ringBuffer.push(
      makeEntry({
        id: 'remote-replay',
        appHost: 'example.com:3000',
      })
    );

    const res = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const req = http.request(
        { hostname: 'localhost', port, path: '/api/replay/remote-replay', method: 'POST' },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () =>
            resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString() })
          );
        }
      );
      req.on('error', reject);
      req.end();
    });

    expect(res.status).toBe(403);
    expect(JSON.parse(res.body)).toEqual({ error: 'Replay only allowed to localhost' });
  });

  it('/api/replay/:id forwards stored requests to localhost targets', async () => {
    const targetServer = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        const rawBody = Buffer.concat(chunks).toString();
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            method: req.method,
            url: req.url,
            headers: {
              'content-type': req.headers['content-type'],
              'x-reqlog-test': req.headers['x-reqlog-test'],
            },
            body: rawBody ? JSON.parse(rawBody) : null,
          })
        );
      });
    });

    await new Promise<void>((resolve) => targetServer.listen(0, resolve));
    const targetAddress = targetServer.address();
    if (targetAddress == null || typeof targetAddress === 'string') {
      throw new Error('Expected an IPv4/IPv6 address info object');
    }

    try {
      await server.start();
      server.ringBuffer.push(
        makeEntry({
          id: 'localhost-replay',
          method: 'POST',
          url: '/echo?source=reqlog',
          requestHeaders: {
            'content-type': 'application/json',
            'x-reqlog-test': 'true',
          },
          requestBody: { hello: 'world' },
          appHost: `localhost:${targetAddress.port}`,
        })
      );

      const res = await new Promise<{ status: number; body: string }>((resolve, reject) => {
        const req = http.request(
          { hostname: 'localhost', port, path: '/api/replay/localhost-replay', method: 'POST' },
          (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (c: Buffer) => chunks.push(c));
            res.on('end', () =>
              resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString() })
            );
          }
        );
        req.on('error', reject);
        req.end();
      });

      expect(res.status).toBe(200);
      expect(JSON.parse(res.body)).toEqual({
        status: 201,
        headers: expect.objectContaining({
          'content-type': 'application/json',
        }),
        body: {
          method: 'POST',
          url: '/echo?source=reqlog',
          headers: {
            'content-type': 'application/json',
            'x-reqlog-test': 'true',
          },
          body: { hello: 'world' },
        },
      });
    } finally {
      await new Promise<void>((resolve) => targetServer.close(() => resolve()));
    }
  });

  it('start() rejects when the port is already in use', async () => {
    const occupied = http.createServer((_req, res) => {
      res.writeHead(200);
      res.end('occupied');
    });

    await new Promise<void>((resolve) => occupied.listen(port, resolve));

    await expect(server.start()).rejects.toThrow(/listen|address|port/i);
    await server.stop();

    await new Promise<void>((resolve) => occupied.close(() => resolve()));
  });

  it('start() logs the resolved port when using an ephemeral port', async () => {
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});
    const ephemeral = new ReqlogServer({ port: 0, autoOpen: false });

    try {
      await ephemeral.start();
      expect(logSpy).toHaveBeenCalled();
      const message = String(logSpy.mock.calls[0]?.[0] ?? '');
      expect(message).toMatch(/^\[reqlog\] Dashboard running at http:\/\/localhost:\d+$/);
      expect(message).not.toContain(':0');
    } finally {
      logSpy.mockRestore();
      await ephemeral.stop();
    }
  });

  it('stop() resolves and closes the server', async () => {
    await server.start();
    const connected = await canConnect(port);
    expect(connected).toBe(true);

    await server.stop();
    const disconnected = await canConnect(port);
    expect(disconnected).toBe(false);
  });

  it('SSE: connect to /events, push entry via broadcast(), verify it arrives', async () => {
    await server.start();

    const received: string[] = [];
    let sseReq: http.ClientRequest | undefined;

    const ssePromise = new Promise<void>((resolve, reject) => {
      sseReq = http.get({ hostname: 'localhost', port, path: '/events' }, (res) => {
        let buffer = '';
        res.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              received.push(line.slice(6));
              resolve();
            }
          }
        });
        res.on('error', reject);
      });
      sseReq.on('error', reject);
    });

    // Give SSE connection time to establish
    await new Promise((r) => setTimeout(r, 50));

    const entry = makeEntry({ id: 'sse-entry', url: '/sse-test' });
    server.broadcast(entry);

    await Promise.race([
      ssePromise,
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('SSE timeout')), 2000)
      ),
    ]);

    // Cleanup: destroy client-side SSE socket
    sseReq?.destroy();

    expect(received.length).toBeGreaterThanOrEqual(1);
    const parsed = JSON.parse(received[received.length - 1]) as ReqlogEntry;
    expect(parsed.id).toBe('sse-entry');
    expect(parsed.url).toBe('/sse-test');
  });
});

describe('ReqlogServer production blocking', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('blocks startup when NODE_ENV=production', async () => {
    process.env.NODE_ENV = 'production';
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {});
    const port = 19000 + Math.floor(Math.random() * 1000);
    const server = new ReqlogServer({ port, autoOpen: false });

    try {
      await server.start();
      const connected = await canConnect(port);
      expect(connected).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('BLOCKED'));
    } finally {
      warnSpy.mockRestore();
      await server.stop().catch(() => {});
    }
  });

  it('allows startup when NODE_ENV=production and allowInProd=true', async () => {
    process.env.NODE_ENV = 'production';
    const port = 19000 + Math.floor(Math.random() * 1000);
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});
    const server = new ReqlogServer({ port, autoOpen: false, allowInProd: true });

    try {
      await server.start();
      const connected = await canConnect(port);
      expect(connected).toBe(true);
    } finally {
      logSpy.mockRestore();
      await server.stop().catch(() => {});
    }
  });

  it('broadcast() is a no-op when blocked in production', async () => {
    process.env.NODE_ENV = 'production';
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {});
    const port = 19000 + Math.floor(Math.random() * 1000);
    const server = new ReqlogServer({ port, autoOpen: false });

    try {
      await server.start();
      const entry = makeEntry({ id: 'prod-entry', url: '/should-not-store' });
      server.broadcast(entry);
      // Ring buffer should remain empty since broadcast is no-op
      expect(server.ringBuffer.toArray()).toEqual([]);
    } finally {
      warnSpy.mockRestore();
      await server.stop().catch(() => {});
    }
  });
});
