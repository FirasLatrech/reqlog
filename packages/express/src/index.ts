import type { RequestHandler } from 'express';
import { ReqlogServer, createInterceptor } from 'reqlog-core';
import type { ReqlogOptions } from 'reqlog-core';

export function reqlog(options: ReqlogOptions = {}): RequestHandler {
  const server = new ReqlogServer(options);
  let started = false;
  let startError: Error | null = null;

  server.start()
    .then(() => { started = true; })
    .catch((err: Error) => {
      startError = err;
      console.error(`[reqlog] Failed to start dashboard server: ${err.message}`);
      console.error('[reqlog] Request logging is disabled. Is port already in use?');
    });

  const intercept = createInterceptor(server, options);

  return ((req: unknown, res: unknown, next: unknown) => {
    if (startError) {
      (next as () => void)();
      return;
    }
    (intercept as Function)(req, res, next);
  }) as RequestHandler;
}

export type { ReqlogOptions } from 'reqlog-core';
