import * as http from 'http';
import * as net from 'net';
import type { ReqlogEntry } from '../types.js';

export function makeEntry(overrides: Partial<ReqlogEntry> = {}): ReqlogEntry {
  return {
    id: `id-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    method: 'GET',
    url: '/test',
    statusCode: 200,
    latency: 10,
    slow: false,
    requestHeaders: {},
    responseHeaders: {},
    requestBody: undefined,
    responseBody: 'hello',
    appHost: 'localhost:3000',
    ...overrides,
  };
}

export function httpGet(
  port: number,
  urlPath: string
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http
      .get({ hostname: 'localhost', port, path: urlPath }, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString() })
        );
      })
      .on('error', reject);
  });
}

export function canConnect(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host: 'localhost' });
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
  });
}
