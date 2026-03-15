import { describe, it, expect, afterEach, spyOn } from 'bun:test';
import * as http from 'http';
import { ReqlogServer } from '../server.js';
import { createInterceptor } from '../interceptor.js';

async function request(
  options: http.RequestOptions,
  body?: string
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString() });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function waitForSetImmediate(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('createInterceptor — response / slow / truncation / broadcast', () => {
  let basePort = 24000 + Math.floor(Math.random() * 3000);
  const servers: { appServer?: http.Server; reqlogServer?: ReqlogServer }[] = [];

  afterEach(async () => {
    for (const s of servers) {
      await new Promise<void>((resolve) => {
        if (s.appServer) {
          s.appServer.close(() => resolve());
        } else {
          resolve();
        }
      });
      if (s.reqlogServer) {
        await s.reqlogServer.stop().catch(() => {});
      }
    }
    servers.length = 0;
  });

  it('entry.slow is true when latency > slowThreshold', async () => {
    const port = basePort++;
    const reqlogPort = port + 1000;
    const reqlogServer = new ReqlogServer({ port: reqlogPort, autoOpen: false });
    const intercept = createInterceptor(reqlogServer, { slowThreshold: 0 });

    const appServer = http.createServer((req, res) => {
      intercept(req as any, res as any, () => {
        setTimeout(() => {
          res.writeHead(200);
          res.end('slow');
        }, 5);
      });
    });

    await new Promise<void>((resolve) => appServer.listen(port, resolve));
    servers.push({ appServer, reqlogServer });

    await request({ hostname: 'localhost', port, path: '/', method: 'GET' });
    await waitForSetImmediate();

    const entries = reqlogServer.ringBuffer.toArray();
    expect(entries).toHaveLength(1);
    expect(entries[0].slow).toBe(true);
  });

  it('responseBody is correctly captured from res.end(chunk)', async () => {
    const port = basePort++;
    const reqlogPort = port + 1000;
    const reqlogServer = new ReqlogServer({ port: reqlogPort, autoOpen: false });
    const intercept = createInterceptor(reqlogServer, { slowThreshold: 200 });

    const appServer = http.createServer((req, res) => {
      intercept(req as any, res as any, () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
    });

    await new Promise<void>((resolve) => appServer.listen(port, resolve));
    servers.push({ appServer, reqlogServer });

    await request({ hostname: 'localhost', port, path: '/', method: 'GET' });
    await waitForSetImmediate();

    const entries = reqlogServer.ringBuffer.toArray();
    expect(entries).toHaveLength(1);
    expect(entries[0].responseBody).toEqual({ ok: true });
  });

  it('responseBody is truncated notice when response exceeds 1MB', async () => {
    const port = basePort++;
    const reqlogPort = port + 1000;
    const reqlogServer = new ReqlogServer({ port: reqlogPort, autoOpen: false });
    const intercept = createInterceptor(reqlogServer, { slowThreshold: 200 });

    const appServer = http.createServer((req, res) => {
      intercept(req as any, res as any, () => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        const bigBody = Buffer.alloc(1024 * 1024 + 1, 'x');
        res.end(bigBody);
      });
    });

    await new Promise<void>((resolve) => appServer.listen(port, resolve));
    servers.push({ appServer, reqlogServer });

    await request({ hostname: 'localhost', port, path: '/', method: 'GET' });
    await waitForSetImmediate();

    const entries = reqlogServer.ringBuffer.toArray();
    expect(entries).toHaveLength(1);
    expect(entries[0].responseBody).toBe('[truncated — body exceeded 1MB]');
  });

  it('broadcast is called when a request is completed', async () => {
    const port = basePort++;
    const reqlogPort = port + 1000;
    const reqlogServer = new ReqlogServer({ port: reqlogPort, autoOpen: false });
    const broadcastSpy = spyOn(reqlogServer, 'broadcast');
    const intercept = createInterceptor(reqlogServer, { slowThreshold: 200 });

    const appServer = http.createServer((req, res) => {
      intercept(req as any, res as any, () => {
        res.writeHead(200);
        res.end('ok');
      });
    });

    await new Promise<void>((resolve) => appServer.listen(port, resolve));
    servers.push({ appServer, reqlogServer });

    await request({ hostname: 'localhost', port, path: '/', method: 'GET' });
    await waitForSetImmediate();

    expect(broadcastSpy).toHaveBeenCalledTimes(1);
    const calledWith = broadcastSpy.mock.calls[0][0];
    expect(calledWith.method).toBe('GET');
  });
});
