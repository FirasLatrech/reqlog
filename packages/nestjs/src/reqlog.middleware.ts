import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import type * as http from 'http';
import { ReqlogServer, createInterceptor } from '@reqlog/core';
import type { ReqlogOptions, InterceptorRequest, InterceptorResponse } from '@reqlog/core';
import { REQLOG_OPTIONS } from './reqlog.module.js';

@Injectable()
export class ReqlogMiddleware implements NestMiddleware {
  private intercept: ReturnType<typeof createInterceptor>;

  constructor(@Inject(REQLOG_OPTIONS) opts: ReqlogOptions) {
    const server = new ReqlogServer(opts);
    server.start().catch((err: Error) => {
      console.error('[reqlog] Failed to start dashboard server:', err.message);
    });
    this.intercept = createInterceptor(server, opts);
  }

  use(req: http.IncomingMessage, res: http.ServerResponse, next: () => void) {
    this.intercept(req as InterceptorRequest, res as InterceptorResponse, next);
  }
}
