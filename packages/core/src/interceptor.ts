import { randomUUID } from 'crypto';
import type * as http from 'http';
import type { ReqlogServer } from './server.js';
import type { ReqlogOptions, ReqlogEntry } from './types.js';
import { tryParseJSON, normalizeHeaders } from './utils.js';

export type InterceptorRequest = http.IncomingMessage & { body?: unknown; rawBody?: string };
export type InterceptorResponse = http.ServerResponse & {
  write: (...args: unknown[]) => boolean;
  end: (...args: unknown[]) => InterceptorResponse;
};
type AnyRequest = InterceptorRequest;
type AnyResponse = InterceptorResponse;
type NextFn = (err?: unknown) => void;

// Max body size before truncation (request & response)
const MAX_BODY_BYTES = 1 * 1024 * 1024; // 1MB

export function createInterceptor(
  server: ReqlogServer,
  options: ReqlogOptions
): (req: AnyRequest, res: AnyResponse, next?: NextFn) => void {
  const slowThreshold = options.slowThreshold ?? server.slowThreshold ?? 200;

  return function intercept(
    req: AnyRequest,
    res: AnyResponse,
    next?: NextFn
  ): void {
    const start = Date.now();
    const appHost = req.headers.host ?? 'localhost';
    const chunks: Buffer[] = [];

    let responseBodySize = 0;
    let responseTruncated = false;

    const origWrite = res.write.bind(res) as (...args: unknown[]) => boolean;
    res.write = function (...args: unknown[]): boolean {
      const chunk = args[0];
      if (chunk != null && !responseTruncated) {
        try {
          const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string | Uint8Array);
          responseBodySize += buf.length;
          if (responseBodySize <= MAX_BODY_BYTES) {
            chunks.push(buf);
          } else {
            responseTruncated = true;
          }
        } catch {
          // ignore
        }
      }
      return origWrite(...args);
    };

    let ended = false;

    const origEnd = res.end.bind(res) as (...args: unknown[]) => AnyResponse;
    res.end = function (...args: unknown[]): AnyResponse {
      const chunk = args[0];
      if (chunk != null && typeof chunk !== 'function' && !responseTruncated) {
        try {
          const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string | Uint8Array);
          responseBodySize += buf.length;
          if (responseBodySize <= MAX_BODY_BYTES) {
            chunks.push(buf);
          } else {
            responseTruncated = true;
          }
        } catch {
          // ignore
        }
      }

      const result = origEnd(...args);

      if (!ended) {
        ended = true;
        setImmediate(() => {
          const latency = Date.now() - start;
          const responseBody = responseTruncated
            ? '[truncated — body exceeded 1MB]'
            : tryParseJSON(Buffer.concat(chunks).toString());
          const entry: ReqlogEntry = {
            id: randomUUID(),
            timestamp: Date.now(),
            method: req.method ?? 'GET',
            url: req.url ?? '/',
            statusCode: res.statusCode,
            latency,
            slow: latency > slowThreshold,
            requestHeaders: normalizeHeaders(req.headers as Record<string, string | string[] | undefined>),
            responseHeaders: normalizeHeaders(res.getHeaders() as Record<string, string | string[] | number | undefined>),
            requestBody: req.body ?? (req.rawBody ? tryParseJSON(req.rawBody) : undefined),
            responseBody,
            appHost,
          };
          server.ringBuffer.push(entry);
          server.broadcast(entry);
        });
      }

      return result;
    };

    // If body-parser already ran, skip stream collection
    if (typeof req.body !== 'undefined') {
      next?.();
      return;
    }

    // Collect raw body from stream before calling next (with size limit)
    const bodyChunks: Buffer[] = [];
    let bodySize = 0;
    let bodyTruncated = false;
    req.on('data', (chunk: Buffer) => {
      if (!bodyTruncated) {
        bodySize += chunk.length;
        if (bodySize <= MAX_BODY_BYTES) {
          bodyChunks.push(chunk);
        } else {
          bodyTruncated = true;
        }
      }
    });
    req.on('end', () => {
      req.rawBody = bodyTruncated
        ? '[truncated — body exceeded 1MB]'
        : Buffer.concat(bodyChunks).toString();
      next?.();
    });
    req.on('error', (err) => {
      next?.(err);
    });
  };
}
