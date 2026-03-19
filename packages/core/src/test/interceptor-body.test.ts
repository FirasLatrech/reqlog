import { describe, it, expect, afterEach } from 'bun:test';
import * as http from 'http';
import { ReqlogServer } from '../server.ts';
import { createInterceptor } from '../interceptor.ts';

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

describe('createInterceptor — body capture', () => {
  let basePort = 21000 + Math.floor(Math.random() * 3000);
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

  function makeSetup(port: number, slowThreshold = 200) {
    const reqlogPort = port + 1000;
    const reqlogServer = new ReqlogServer({ port: reqlogPort, autoOpen: false });
    const intercept = createInterceptor(reqlogServer, { slowThreshold });

    const appServer = http.createServer((req, res) => {
      intercept(req as any, res as any, () => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('hello');
      });
    });

    return new Promise<{ appServer: http.Server; reqlogServer: ReqlogServer }>((resolve) => {
      appServer.listen(port, () => {
        const handle = { appServer, reqlogServer };
        servers.push(handle);
        resolve(handle);
      });
    });
  }

  it('intercept calls next() for a basic GET request', async () => {
    const port = basePort++;
    await makeSetup(port);
    const res = await request({ hostname: 'localhost', port, path: '/', method: 'GET' });
    expect(res.status).toBe(200);
    expect(res.body).toBe('hello');
  });

  it('res.end override fires and populates the ring buffer entry', async () => {
    const port = basePort++;
    const { reqlogServer } = await makeSetup(port);
    await request({ hostname: 'localhost', port, path: '/test-path', method: 'GET' });
    await waitForSetImmediate();

    const entries = reqlogServer.ringBuffer.toArray();
    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry.method).toBe('GET');
    expect(entry.url).toBe('/test-path');
    expect(entry.statusCode).toBe(200);
    expect(entry.latency).toBeGreaterThanOrEqual(0);
  });

  it('requestBody is set from req.body when body-parser scenario is used', async () => {
    const port = basePort++;
    const reqlogPort = port + 1000;
    const reqlogServer = new ReqlogServer({ port: reqlogPort, autoOpen: false });
    const intercept = createInterceptor(reqlogServer, { slowThreshold: 200 });

    const appServer = http.createServer((req, res) => {
      (req as any).body = { message: 'hello world' };
      intercept(req as any, res as any, () => {
        res.writeHead(200);
        res.end('ok');
      });
    });

    await new Promise<void>((resolve) => appServer.listen(port, resolve));
    servers.push({ appServer, reqlogServer });

    await request(
      {
        hostname: 'localhost',
        port,
        path: '/data',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      JSON.stringify({ message: 'hello world' })
    );
    await waitForSetImmediate();

    const entries = reqlogServer.ringBuffer.toArray();
    expect(entries).toHaveLength(1);
    expect(entries[0].requestBody).toEqual({ message: 'hello world' });
  });

  it('next === undefined path: raw http usage without middleware next', async () => {
    const port = basePort++;
    const reqlogPort = port + 1000;
    const reqlogServer = new ReqlogServer({ port: reqlogPort, autoOpen: false });
    const intercept = createInterceptor(reqlogServer, { slowThreshold: 200 });

    const appServer = http.createServer((req, res) => {
      // Call intercept without next (raw http usage)
      intercept(req as any, res as any);
      res.writeHead(200);
      res.end('raw');
    });

    await new Promise<void>((resolve) => appServer.listen(port, resolve));
    servers.push({ appServer, reqlogServer });

    const res = await request({ hostname: 'localhost', port, path: '/', method: 'GET' });
    await waitForSetImmediate();

    expect(res.status).toBe(200);
    expect(res.body).toBe('raw');
    const entries = reqlogServer.ringBuffer.toArray();
    expect(entries).toHaveLength(1);
  });
});
