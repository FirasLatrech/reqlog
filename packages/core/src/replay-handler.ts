import * as http from 'http';
import type { RingBuffer } from './ring-buffer.js';
import type { ReqlogEntry } from './types.js';
import { tryParseJSON } from './utils.js';

export const ALLOWED_REPLAY_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);
const MAX_REPLAY_BODY = 1 * 1024 * 1024; // 1MB

export function handleReplay(
  id: string,
  res: http.ServerResponse,
  ringBuffer: RingBuffer<ReqlogEntry>
): void {
  const entry = ringBuffer.findById(id);
  if (!entry) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Entry not found' }));
    return;
  }

  const [hostname, portStr] = entry.appHost.split(':');

  if (!ALLOWED_REPLAY_HOSTS.has(hostname || 'localhost')) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Replay only allowed to localhost' }));
    return;
  }

  const port = portStr ? parseInt(portStr, 10) : 80;
  const replayHeaders: Record<string, string> = { ...entry.requestHeaders };
  delete replayHeaders['content-length'];
  delete replayHeaders['host'];
  delete replayHeaders['connection'];

  let bodyStr: string | undefined;
  if (entry.requestBody != null) {
    bodyStr = typeof entry.requestBody === 'string'
      ? entry.requestBody
      : JSON.stringify(entry.requestBody);
  }

  if (bodyStr) {
    replayHeaders['content-length'] = String(Buffer.byteLength(bodyStr));
  }

  const options: http.RequestOptions = {
    hostname: hostname || 'localhost',
    port,
    path: entry.url,
    method: entry.method,
    headers: replayHeaders,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    const chunks: Buffer[] = [];
    let totalSize = 0;
    let truncated = false;
    proxyRes.on('data', (chunk: Buffer) => {
      if (!truncated) {
        totalSize += chunk.length;
        if (totalSize <= MAX_REPLAY_BODY) {
          chunks.push(chunk);
        } else {
          truncated = true;
        }
      }
    });
    proxyRes.on('end', () => {
      const body = truncated
        ? '[truncated — replay response exceeded 1MB]'
        : Buffer.concat(chunks).toString();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: proxyRes.statusCode,
          headers: proxyRes.headers,
          body: truncated ? body : tryParseJSON(body),
        })
      );
    });
  });

  // Fix 6: 10-second timeout on replay proxy request
  proxyReq.setTimeout(10000, () => {
    proxyReq.destroy(new Error('Replay request timed out'));
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  });

  if (bodyStr) {
    proxyReq.write(bodyStr);
  }
  proxyReq.end();
}
