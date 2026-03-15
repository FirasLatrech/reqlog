import { describe, it, expect, afterEach, beforeEach } from 'bun:test';
import * as http from 'http';
import { ReqlogServer } from '../server.js';
import type { ReqlogEntry } from '../types.js';
import { makeEntry, httpGet, canConnect } from './helpers.js';

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
